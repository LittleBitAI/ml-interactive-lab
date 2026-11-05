// Start and stop this checkout's own `vite preview`.
//   node scripts/preview-owned.mjs start [port]   serve dist/ on port (default 4173), strict
//   node scripts/preview-owned.mjs stop  [port]   stop only the preview `start` recorded
// `start` records the pid it spawned in artifacts/preview-<port>.json and removes
// the record when that process exits, so a start that fails on a busy port leaves
// no record. `stop` ends the recorded pid only while it still listens on the port
// with a vite preview command line; every other listener is left alone.
// ponytail: ownership is per checkout (one task worktree = one session), and the
// listener lookup uses pwsh, so `stop` runs on Windows only.
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

// The pid to stop, or null with the reason nothing is stopped.
export function decide(record, listeners, port) {
  if (!record) return { pid: null, reason: 'this checkout recorded no preview on this port' }
  if (record.port !== port) return { pid: null, reason: `the record is for port ${record.port}` }
  const owned = listeners.find((l) => l.pid === record.pid)
  if (!owned) return { pid: null, reason: `recorded pid ${record.pid} is not listening on ${port}` }
  if (!isPreviewOn(owned.commandLine, port)) {
    return { pid: null, reason: `pid ${record.pid} on ${port} is not a vite preview` }
  }
  return { pid: record.pid, reason: 'recorded by this checkout' }
}

export function listeners(port) {
  if (process.platform !== 'win32') throw new Error('listener lookup is implemented with pwsh on Windows only')
  const query =
    `ConvertTo-Json -Compress -InputObject @(Get-NetTCPConnection -LocalPort ${port} -State Listen ` +
    '-ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { ' +
    '[pscustomobject]@{ pid = [int]$_; commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId=$_").CommandLine } })'
  return JSON.parse(execFileSync('pwsh', ['-NoProfile', '-Command', query], { encoding: 'utf8' }) || '[]')
}

function start(port) {
  const path = recordPath(port)
  const held = readRecord(path)
  if (held && alive(held.pid)) {
    console.error(`a preview is already recorded as pid ${held.pid}; stop it first`)
    return Promise.resolve(1)
  }
  const vite = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
  const child = spawn(process.execPath, [vite, 'preview', '--port', String(port), '--strictPort'], {
    cwd: ROOT,
    stdio: 'inherit',
  })
  if (child.pid) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify({ pid: child.pid, port }))
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
  const found = listeners(port)
  const { pid, reason } = decide(record, found, port)
  for (const l of found) if (l.pid !== pid) console.log(`left ${l.pid} alone: ${l.commandLine}`)
  if (!pid) {
    if (record && !alive(record.pid)) rmSync(path, { force: true })
    console.log(`stopped nothing: ${reason}`)
    return 0
  }
  process.kill(pid)
  for (let i = 0; i < 50 && alive(pid); i++) await sleep(100)
  rmSync(path, { force: true })
  if (alive(pid)) {
    console.error(`pid ${pid} is still running`)
    return 1
  }
  console.log(`stopped ${pid}`)
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
