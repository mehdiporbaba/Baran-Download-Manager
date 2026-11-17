import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

async function popup(reply: object, permissions = true) {
  const nodes = new Map<string, any>()
  const settings: Record<string, unknown> = { captureDownloads: false }
  const requested: object[] = []
  const element = (id: string): any => {
    if (!nodes.has(id)) nodes.set(id, { checked: false, textContent: '', disabled: false, events: {}, addEventListener(type: string, action: () => Promise<void>) { this.events[type] = action } })
    return nodes.get(id)
  }
  const api = {
    runtime: { sendMessage: async () => reply },
    storage: { local: { get: async () => ({ ...settings }), set: async (value: object) => Object.assign(settings, value) } },
    permissions: { contains: async () => permissions, request: async (value: object) => { requested.push(value); return permissions } },
    tabs: { create: async () => {} }
  }
  vm.runInNewContext(readFileSync('browser-extension/popup.js', 'utf8'), { browser: api, document: { getElementById: element } })
  await new Promise(resolve => setImmediate(resolve))
  return { nodes, settings, requested, async enable() { element('capture').checked = true; await element('capture').events.change() } }
}

test('Firefox popup retains the capture toggle when the desktop acknowledges download-prompt capability', async () => {
  const p = await popup({ ok: true, version: '2.1.0-beta.3', downloadPrompt: true })
  await p.enable()
  assert.equal(p.nodes.get('capture').checked, true)
  assert.equal(p.settings.captureDownloads, true)
  assert.match(p.nodes.get('status').textContent, /Capture enabled/)
  assert.deepEqual(JSON.parse(JSON.stringify(p.requested[0])), { permissions: ['downloads', 'webRequest', 'webRequestBlocking'], origins: ['http://*/*', 'https://*/*'] })
})

test('old desktop reproduces the reported immediate toggle reset and unsupported-command message', async () => {
  const p = await popup({ ok: false, error: 'Unsupported browser command' })
  await p.enable()
  assert.equal(p.nodes.get('capture').checked, false)
  assert.equal(p.settings.captureDownloads, false)
  assert.equal(p.nodes.get('status').textContent, 'Unsupported browser command')
})

test('denied optional permissions leave browser capture disabled', async () => {
  const p = await popup({ ok: true, downloadPrompt: true }, false)
  await p.enable()
  assert.equal(p.nodes.get('capture').checked, false)
  assert.equal(p.settings.captureDownloads, false)
})
