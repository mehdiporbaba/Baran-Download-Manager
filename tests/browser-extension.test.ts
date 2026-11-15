import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

function extension(options: { enabled?: boolean; offline?: boolean; pauseFails?: boolean; allowed?: boolean; firefox?: boolean } = {}) {
  const calls: string[] = []
  const event = { addListener() {} }
  const api = {
    runtime: { onInstalled: event, onMessage: event, async sendNativeMessage(_host: string, input: unknown) { calls.push('send'); assert.deepEqual(JSON.parse(JSON.stringify(input)), { action: 'import', urls: ['https://example.com/file'] }); if (options.offline) throw new Error('offline'); return { ok: true, count: 1 } } },
    contextMenus: { onClicked: event },
    action: { async setBadgeText() {}, async setTitle() {} },
    storage: { local: { async get() { return { captureDownloads: options.enabled !== false } } } },
    permissions: { onAdded: event, async contains() { return options.allowed !== false } },
    downloads: {
      onCreated: event,
      async pause() { calls.push('pause'); if (options.pauseFails) throw new Error('completed') },
      async search() { return [{ state: 'in_progress', paused: true }] },
      async cancel() { calls.push('cancel') },
      async resume() { calls.push('resume') }
    }
  }
  const scope: any = { URL, TextEncoder, ...(options.firefox ? { browser: api } : { chrome: api }) }
  runInNewContext(readFileSync('browser-extension/background.js', 'utf8'), scope)
  return { calls, capture: scope.captureDownload as (item: object) => Promise<void> }
}
const item = { id: 1, state: 'in_progress', url: 'https://example.com/file' }

test('Chrome and Firefox handoff cancel only after a native acknowledgement', async () => {
  for (const firefox of [false, true]) {
    const ext = extension({ firefox }); await ext.capture(item)
    assert.deepEqual(ext.calls, ['pause', 'send', 'cancel'])
  }
})
test('offline handoff resumes the browser and failed pause never transfers a link', async () => {
  const offline = extension({ offline: true }); await offline.capture(item)
  assert.deepEqual(offline.calls, ['pause', 'send', 'resume'])
  const complete = extension({ pauseFails: true }); await complete.capture(item)
  assert.deepEqual(complete.calls, ['pause'])
})
test('handoff respects opt-out, permission, private downloads and non-transferable URLs', async () => {
  for (const options of [{ enabled: false }, { allowed: false }]) {
    const ext = extension(options); await ext.capture(item); assert.deepEqual(ext.calls, [])
  }
  const ext = extension()
  for (const patch of [{ incognito: true }, { byExtensionId: 'another-extension' }, { url: 'blob:https://example.com/id' }, { url: 'https://user:password@example.com/file' }, { state: 'complete' }]) await ext.capture({ ...item, ...patch })
  assert.deepEqual(ext.calls, [])
})
