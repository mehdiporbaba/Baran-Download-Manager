import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isDue, validateStartAt } from '../src/shared/scheduling'
import { proxyConfiguration, externalProxy } from '../src/shared/network-policy'
import { instagramUrl, galleryAssets } from '../src/shared/instagram'
import { initialWindow } from '../src/shared/window-size'

test('scheduling honors future times, overdue restarts, pauses and cancellation', () => {
  assert.equal(isDue({ status: 'queued', startAt: 2000 }, 1000), false)
  assert.equal(isDue({ status: 'queued', startAt: 2000 }, 2000), true)
  assert.equal(isDue({ status: 'queued', startAt: 2000 }, 3000), true)
  assert.equal(isDue({ status: 'paused', startAt: 2000 }, 3000), false)
  assert.equal(isDue({ status: 'canceled' }, 3000), false)
  assert.equal(isDue({ status: 'queued' }, 1000), true)
  assert.throws(() => validateStartAt(NaN), /Invalid/)
  assert.throws(() => validateStartAt('tomorrow'), /Invalid/)
})
test('manual proxy validation rejects credentials and unsupported schemes; automatic uses system resolver', () => {
  assert.deepEqual(proxyConfiguration({ proxyMode: 'system', proxy: '' }), { mode: 'system' })
  assert.deepEqual(proxyConfiguration({ proxyMode: 'direct', proxy: '' }), { mode: 'direct' })
  assert.equal(proxyConfiguration({ proxyMode: 'manual', proxy: 'socks5://127.0.0.1:1080' }).proxyRules, 'socks5://127.0.0.1:1080')
  for (const proxy of ['file:///secret', 'http://user:pass@localhost:8080', 'https://example.com/path']) assert.throws(() => proxyConfiguration({ proxyMode: 'manual', proxy }))
  assert.equal(externalProxy('PROXY 127.0.0.1:8080; DIRECT'), 'http://127.0.0.1:8080')
  assert.equal(externalProxy('SOCKS5 127.0.0.1:1080'), 'socks5://127.0.0.1:1080')
  assert.equal(externalProxy('DIRECT'), '')
})
test('Instagram extractor accepts specific media links and filters results to media CDNs', () => {
  assert.equal(instagramUrl('https://www.instagram.com/stories/person/123/'), 'https://www.instagram.com/stories/person/123/')
  assert.throws(() => instagramUrl('https://instagram.com.evil.test/p/a/'))
  assert.throws(() => instagramUrl('https://www.instagram.com/person/'))
  const result = galleryAssets([[2, {}], [3, 'https://scontent.cdninstagram.com/image.jpg?token=a', { shortcode: 'ABC', num: 1, extension: 'jpg' }], [3, 'https://scontent.cdninstagram.com/image.jpg?token=a', {}], [3, 'https://evil.test/x.exe', {}], [6, 'https://instagram.com/p/child', {}]])
  assert.deepEqual(result, [{ url: 'https://scontent.cdninstagram.com/image.jpg?token=a', fileName: 'instagram-ABC-1.jpg' }])
})
test('initial window fits small, full HD, 4K and secondary-monitor work areas in logical pixels', () => {
  for (const [width, height] of [[640, 480], [1366, 728], [1920, 1040], [3840, 2080]]) {
    const window = initialWindow({ x: -1920, y: 30, width, height })
    assert.ok(window.width <= width && window.height <= height)
    assert.ok(window.minWidth <= window.width && window.minHeight <= window.height)
    assert.ok(window.x >= -1920 && window.x + window.width <= -1920 + width)
    assert.ok(window.y >= 30 && window.y + window.height <= 30 + height)
    assert.ok(window.width <= 1000 && window.height <= 680)
  }
})
