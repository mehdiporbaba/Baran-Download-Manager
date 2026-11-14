import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extractLinks, normalizeLink } from '../src/shared/links'
import { LinkGrabber } from '../src/main/link-grabber'
import { importBrowserMessage } from '../src/main/browser-bridge'

test('normalization deduplicates fragments without damaging signed queries', () => {
  assert.deepEqual(extractLinks('https://example.com/file.zip?token=a%2Bb#one\nhttps://example.com/file.zip?token=a%2Bb#two'), ['https://example.com/file.zip?token=a%2Bb'])
  assert.equal(normalizeLink('javascript:alert(1)'), null)
  assert.equal(normalizeLink('https://user:secret@example.com/a'), null)
  assert.equal(normalizeLink('../file.zip', 'https://example.com/a/'), 'https://example.com/file.zip')
  assert.throws(() => extractLinks('a'.repeat(2_000_001)), /large/)
})

test('browser imports only stage valid URLs and repeated imports add nothing', () => {
  let events = 0
  const inbox = new LinkGrabber(() => events++)
  assert.equal(importBrowserMessage(inbox, { action: 'import', urls: ['https://example.com/a.zip#x', 'https://example.com/a.zip#y', 'file:///C:/secret'] }), 1)
  assert.equal(importBrowserMessage(inbox, { action: 'import', urls: ['https://example.com/a.zip'] }), 0)
  assert.equal(inbox.list()[0].status, 'new')
  assert.equal(inbox.list()[0].source, 'browser')
  assert.equal(events, 2)
  assert.throws(() => importBrowserMessage(inbox, { action: 'download', urls: [] }), /Unsupported/)
  assert.throws(() => importBrowserMessage(inbox, { action: 'import', urls: [42] }), /Invalid/)
  assert.throws(() => inbox.add(Array(2001).fill('https://example.com/')), /Maximum/)
})

test('inbox overflow is atomic and removed links can be imported again', () => {
  const inbox = new LinkGrabber(() => undefined)
  for (let batch = 0; batch < 3; batch++) inbox.add(Array.from({ length: batch === 2 ? 1000 : 2000 }, (_, i) => `https://example.com/${batch}-${i}.zip`))
  assert.throws(() => inbox.add(['https://example.com/new.zip']), /full/)
  assert.equal(inbox.list().length, 5000)
  const first = inbox.list()[0]
  inbox.remove([first.id])
  assert.equal(inbox.add([first.url]), 1)
})
