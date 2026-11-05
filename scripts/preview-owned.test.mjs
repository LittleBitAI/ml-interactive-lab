// Run: node --test scripts/preview-owned.test.mjs   (after `npm run build`; the live test needs dist/ and Windows)
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { test } from 'node:test'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { decide, listeners } from './preview-owned.mjs'

const SCRIPT = fileURLToPath(new URL('./preview-owned.mjs', import.meta.url))
const PREVIEW = (port) => `"node.exe" C:\\repo\\node_modules\\vite\\bin\\vite.js preview --port ${port} --strictPort`

test('stop picks only the recorded pid while it listens on the port as a vite preview', () => {
  const port = 4173
  const rows = [
    ['no record', null, [{ pid: 10, commandLine: PREVIEW(port) }], null],
    ['record for another port', { pid: 10, port: 5000 }, [{ pid: 10, commandLine: PREVIEW(port) }], null],
    ['recorded pid gone, other preview listening', { pid: 11, port }, [{ pid: 10, commandLine: PREVIEW(port) }], null],
    ['recorded pid reused by another program', { pid: 10, port }, [{ pid: 10, commandLine: 'node other-server.js' }], null],
    ['recorded pid serves another port', { pid: 10, port }, [{ pid: 10, commandLine: PREVIEW(41730) }], null],
    ['recorded preview among others', { pid: 10, port }, [{ pid: 9, commandLine: PREVIEW(port) }, { pid: 10, commandLine: PREVIEW(port) }], 10],
  ]
  for (const [name, record, found, expected] of rows) {
    assert.equal(decide(record, found, port).pid, expected, name)
  }
})

async function freePort() {
  const server = createServer().listen(0)
  await new Promise((ok) => server.once('listening', ok))
  const { port } = server.address()
  await new Promise((ok) => server.close(ok))
  return port
}

function launch(port, record) {
  const child = spawn(process.execPath, [SCRIPT, 'start', String(port)], {
    env: { ...process.env, PREVIEW_RECORD: record },
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

    assert.match(stopWith(port, earlier), new RegExp(`stopped ${firstPid}`))
    await first.exited
    assert.deepEqual(listeners(port), [], 'nothing listens after the owner stops it')
    assert.equal(existsSync(earlier), false, 'the owner record is gone')
  } finally {
    if (existsSync(earlier)) stopWith(port, earlier)
  }
})
