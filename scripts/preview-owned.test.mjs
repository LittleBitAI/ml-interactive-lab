// Run: node --test scripts/preview-owned.test.mjs   (after `npm run build`; the live test needs dist/ and Windows)
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { test } from 'node:test'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { decide, listeners, tagArg } from './preview-owned.mjs'

const SCRIPT = fileURLToPath(new URL('./preview-owned.mjs', import.meta.url))
const PREVIEW = (port, title = '', checkout = 'C:\\checkout') =>
  `"node.exe" ${title} ${checkout}\\node_modules\\vite\\bin\\vite.js preview --port ${port} --strictPort`

test('stop picks the recorded pid only when its command line carries that start tag and is a vite preview on the port', () => {
  const port = 4173
  const record = { pid: 10, port, tag: 'tag-a' }
  const rows = [
    ['no record', null, PREVIEW(port, tagArg('tag-a')), null],
    ['record for another port', { ...record, port: 5000 }, PREVIEW(port, tagArg('tag-a')), null],
    ['recorded pid has exited', record, null, null],
    ['stale record, pid reused by another checkout preview', record, PREVIEW(port, '', 'C:\\other-checkout'), null],
    ['stale record, pid reused by a preview with another tag', record, PREVIEW(port, tagArg('tag-b')), null],
    ['tag only as a prefix of a longer title', record, PREVIEW(port, `${tagArg('tag-a')}x`), null],
    ['record without a tag', { pid: 10, port }, PREVIEW(port), null],
    ['pid reused by another program', record, `node other-server.js ${tagArg('tag-a')}`, null],
    ['tagged preview on another port', record, PREVIEW(41730, tagArg('tag-a')), null],
    ['tagged preview, listening or still starting', record, PREVIEW(port, tagArg('tag-a')), 10],
  ]
  for (const [name, rec, commandLine, expected] of rows) {
    assert.equal(decide(rec, commandLine, port).pid, expected, name)
  }
})

async function freePort() {
  const server = createServer().listen(0)
  await new Promise((ok) => server.once('listening', ok))
  const { port } = server.address()
  await new Promise((ok) => server.close(ok))
  return port
}

function launch(port, record, env = {}) {
  const child = spawn(process.execPath, [SCRIPT, 'start', String(port)], {
    env: { ...process.env, PREVIEW_RECORD: record, ...env },
    stdio: 'ignore',
  })
  const exited = new Promise((ok) => child.on('exit', (code) => ok(code)))
  return { child, exited }
}

function stopWith(port, record) {
  return execFileSync(process.execPath, [SCRIPT, 'stop', String(port)], {
    env: { ...process.env, PREVIEW_RECORD: record },
    encoding: 'utf8',
  })
}

async function waitFor(check, what) {
  for (let i = 0; i < 150; i++) {
    if (await check()) return
    await sleep(100)
  }
  assert.fail(`timed out waiting for ${what}`)
}

const live = process.platform === 'win32' && existsSync(fileURLToPath(new URL('../dist/index.html', import.meta.url)))

test('a failed strict-port start leaves the earlier preview running; its owner stops it', { skip: !live }, async () => {
  const port = await freePort()
  const scratch = mkdtempSync(join(tmpdir(), 'preview-owned-'))
  const earlier = join(scratch, 'earlier.json')
  const later = join(scratch, 'later.json')

  const first = launch(port, earlier)
  try {
    await waitFor(async () => (await fetch(`http://localhost:${port}/ml-interactive-lab/`).catch(() => null))?.ok, 'the first preview')
    const firstPid = listeners(port)[0].pid

    const second = launch(port, later)
    assert.notEqual(await second.exited, 0, 'the second start fails on the busy port')
    assert.equal(existsSync(later), false, 'a failed start leaves no record')

    assert.match(stopWith(port, later), /stopped nothing/)
    assert.deepEqual(listeners(port).map((l) => l.pid), [firstPid], 'the earlier preview still listens')

    writeFileSync(later, JSON.stringify({ pid: firstPid, port, tag: 'stale-tag' }))
    assert.match(stopWith(port, later), /stopped nothing/, 'a stale record naming a reused pid stops nothing')
    assert.deepEqual(listeners(port).map((l) => l.pid), [firstPid], 'the earlier preview still listens')
    assert.equal(existsSync(later), false, 'the stale record is dropped')

    assert.match(stopWith(port, earlier), new RegExp(`stopped ${firstPid} \\(listening\\)`))
    await first.exited
    assert.deepEqual(listeners(port), [], 'nothing listens after the owner stops it')
    assert.equal(existsSync(earlier), false, 'the owner record is gone')
  } finally {
    if (existsSync(earlier)) stopWith(port, earlier)
  }
})

test('stop during startup ends the owned preview before it binds and reports success only once it is gone', { skip: !live }, async () => {
  const port = await freePort()
  const scratch = mkdtempSync(join(tmpdir(), 'preview-owned-'))
  const record = join(scratch, 'owned.json')
  // Every node process this launch starts waits 3 s before running, so the
  // server is alive and recorded but not yet bound when stop runs.
  const delay = join(scratch, 'startup-delay.mjs')
  writeFileSync(delay, 'Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3000)\n')
  const run = launch(port, record, { NODE_OPTIONS: `--import=${pathToFileURL(delay).href}` })
  try {
    await waitFor(() => existsSync(record), 'the record')
    const { pid } = JSON.parse(readFileSync(record, 'utf8'))

    assert.match(stopWith(port, record), new RegExp(`stopped ${pid} \\(still starting\\)`))
    await run.exited
    assert.throws(() => process.kill(pid, 0), 'the owned server is gone when stop returns')
    await sleep(4000)
    assert.deepEqual(listeners(port), [], 'nothing binds the port after stop')
    assert.equal(existsSync(record), false, 'the record is gone')
  } finally {
    run.child.kill()
  }
})
