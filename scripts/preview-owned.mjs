// Start and stop this checkout's own `vite preview`.
//   node scripts/preview-owned.mjs start [port]   serve dist/ on port (default 4173), strict
//   node scripts/preview-owned.mjs stop  [port]   stop only the preview `start` recorded
// `start` gives the server a fresh random tag on its own command line
// (`node --title=preview-owned-<tag> vite.js preview --port <port> --strictPort`),
// records { pid, port, tag } in artifacts/preview-<port>.json and removes the
// record when that process exits, so a start that fails on a busy port leaves
// no record. `stop` ends the recorded pid only if its command line still carries
// that tag and is a vite preview on the port, whether it is still starting or
// already listening, and reports success only once that process is gone. A
// reused pid or another checkout's preview never carries the tag; every other
// listener is left alone.
// ponytail: ownership is per checkout (one task worktree = one session), and the
// process lookup uses pwsh, so `stop` runs on Windows only.
import { randomUUID } from 'node:crypto'
import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_PORT = 4173

export function recordPath(port, env = process.env) {
  return env.PREVIEW_RECORD ? resolve(env.PREVIEW_RECORD) : join(ROOT, 'artifacts', `preview-${port}.json`)
}

function readRecord(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function alive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export function isPreviewOn(commandLine, port) {
  return new RegExp(`vite\\S*\\s+preview\\s.*--port\\s+${port}(\\s|$)`).test(commandLine ?? '')
}

export const tagArg = (tag) => `--title=preview-owned-${tag}`

// The pid to stop, or null with the reason nothing is stopped. `commandLine` is
// the recorded pid's current command line, or null when no such process exists.
export function decide(record, commandLine, port) {
  if (!record) return { pid: null, reason: 'this checkout recorded no preview on this port' }
  if (record.port !== port) return { pid: null, reason: `the record is for port ${record.port}` }
  if (commandLine == null) return { pid: null, reason: `recorded pid ${record.pid} has exited` }
  if (typeof record.tag !== 'string' || !record.tag || !commandLine.split(/\s+/).includes(tagArg(record.tag))) {
    return { pid: null, reason: `pid ${record.pid} is now another process (its tag is missing)` }
  }
  if (!isPreviewOn(commandLine, port)) return { pid: null, reason: `pid ${record.pid} is not a vite preview on ${port}` }
  return { pid: record.pid, reason: 'started by this checkout' }
}

// Listeners on the port, and the command line of `pid` (null if it is gone).
export function observe(port, pid = 0) {
  if (process.platform !== 'win32') throw new Error('process lookup is implemented with pwsh on Windows only')
  const query =
    `$l = @(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ` +
    'Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { ' +
    '[pscustomobject]@{ pid = [int]$_; commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId=$_").CommandLine } }); ' +
    `$p = Get-CimInstance Win32_Process -Filter "ProcessId=${Number(pid) || 0}"; ` +
    'ConvertTo-Json -Compress -InputObject @{ listeners = $l; commandLine = $p.CommandLine }'
  return JSON.parse(execFileSync('pwsh', ['-NoProfile', '-Command', query], { encoding: 'utf8' }))
}

export const listeners = (port) => observe(port).listeners

function start(port) {
  const path = recordPath(port)
  const held = readRecord(path)
  if (held && alive(held.pid)) {
    console.error(`a preview is already recorded as pid ${held.pid}; stop it first`)
    return Promise.resolve(1)
  }
  const vite = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
  const tag = randomUUID()
  const child = spawn(process.execPath, [tagArg(tag), vite, 'preview', '--port', String(port), '--strictPort'], {
    cwd: ROOT,
    stdio: 'inherit',
  })
  if (child.pid) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify({ pid: child.pid, port, tag }))
  }
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
  return new Promise((done) => {
    const finish = (code) => {
      if (readRecord(path)?.pid === child.pid) rmSync(path, { force: true })
      done(code ?? 1)
    }
    child.on('error', () => finish(1))
    child.on('exit', finish)
  })
}

async function stop(port) {
  const path = recordPath(port)
  const record = readRecord(path)
  const seen = observe(port, record?.pid)
  const { pid, reason } = decide(record, seen.commandLine, port)
  for (const l of seen.listeners) if (l.pid !== pid) console.log(`left ${l.pid} alone: ${l.commandLine}`)
  if (!pid) {
    // A record whose process is gone or is now someone else's no longer names anything of ours.
    if (record) rmSync(path, { force: true })
    console.log(`stopped nothing: ${reason}`)
    return 0
  }
  const state = seen.listeners.some((l) => l.pid === pid) ? 'listening' : 'still starting'
  try {
    process.kill(pid)
  } catch {
    // It exited between the lookup and here; the wait below confirms it is gone.
  }
  for (let i = 0; i < 50 && alive(pid); i++) await sleep(100)
  if (alive(pid)) {
    console.error(`pid ${pid} is still running`)
    return 1
  }
  rmSync(path, { force: true })
  console.log(`stopped ${pid} (${state})`)
  return 0
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, portArg] = process.argv.slice(2)
  const port = Number(portArg ?? DEFAULT_PORT)
  if (command === 'start') process.exitCode = await start(port)
  else if (command === 'stop') process.exitCode = await stop(port)
  else {
    console.error('usage: node scripts/preview-owned.mjs start|stop [port]')
    process.exitCode = 2
  }
}
