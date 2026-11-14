import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { after, before, test } from 'node:test'
import { scanLinks, scanScope } from '../src/main/scanner'

let origin: string
let outsideRequests = 0
const server = createServer((req, res) => {
  const path = req.url || '/'
  if (path === '/outside/' || path === '/evil.zip') outsideRequests++
  if (path === '/files/') {
    res.setHeader('Content-Type', 'text/html')
    res.end('<a href="a.zip?sig=a%2Bb&amp;x=1#one">A</a><a href="a.zip?sig=a%2Bb&amp;x=1#two">dup</a><a href="sub/">sub</a><a href="../evil.zip">outside</a><a href="/outside/">out</a><a href="javascript:alert(1)">bad</a>')
  } else if (path === '/files/sub/') {
    res.setHeader('Content-Type', 'text/html')
    res.end('<a href="b.pdf">B</a><a href="../">cycle</a>')
  } else if (path === '/files/redirect.html') {
    res.writeHead(302, { Location: '/outside/' }); res.end()
  } else if (path === '/files/local.html') {
    res.writeHead(302, { Location: '/files/sub/' }); res.end()
  } else if (path === '/files/huge.html') {
    res.setHeader('Content-Type', 'text/html'); res.end('x'.repeat(2 * 1024 * 1024 + 1))
  } else if (path === '/files/slow.html') {
    res.setHeader('Content-Type', 'text/html'); res.write('<html>')
  } else if (path === '/files/direct') {
    res.setHeader('Content-Type', 'application/zip'); res.end('data')
  } else { res.writeHead(404); res.end() }
})
before(async () => {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
})
after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) })

test('recursive scan stays in scope, decodes HTML entities, deduplicates and terminates cycles', async () => {
  const found: string[] = []
  const summary = await scanLinks({ url: `${origin}/files/`, depth: 2, maxPages: 10 }, new AbortController().signal, urls => found.push(...urls))
  assert.deepEqual(found, [`${origin}/files/a.zip?sig=a%2Bb&x=1`, `${origin}/files/sub/b.pdf`])
  assert.equal(summary.pages, 2)
  assert.equal(summary.found, 2)
  assert.deepEqual(summary.errors, [])
  assert.equal(outsideRequests, 0)
})

test('page limits and depth zero are respected', async () => {
  const summary = await scanLinks({ url: `${origin}/files/`, depth: 2, maxPages: 1 }, new AbortController().signal, () => undefined)
  assert.equal(summary.pages, 1)
  assert.equal(summary.limited, true)
  const shallow = await scanLinks({ url: `${origin}/files/`, depth: 0, maxPages: 10 }, new AbortController().signal, () => undefined)
  assert.equal(shallow.pages, 1)
  assert.equal(shallow.found, 1)
})

test('redirects outside scope are blocked before the outside request', async () => {
  const summary = await scanLinks({ url: `${origin}/files/redirect.html`, depth: 1, maxPages: 5 }, new AbortController().signal, () => undefined)
  assert.match(summary.errors[0], /leaves/)
  assert.equal(outsideRequests, 0)
  const allowed = scanScope(`${origin}/files/`)
  assert.equal(allowed(`${origin}/files-other/a.zip`), false)
  assert.equal(allowed(`${origin}/files/%2Foutside.zip`), false)
})

test('relative links use the final redirect URL', async () => {
  const found: string[] = []
  await scanLinks({ url: `${origin}/files/local.html`, depth: 0, maxPages: 5 }, new AbortController().signal, urls => found.push(...urls))
  assert.deepEqual(found, [`${origin}/files/sub/b.pdf`])
})

test('oversized HTML is rejected and direct file seeds are staged', async () => {
  const summary = await scanLinks({ url: `${origin}/files/huge.html`, depth: 0, maxPages: 1 }, new AbortController().signal, () => undefined)
  assert.match(summary.errors[0], /2 MB/)
  const found: string[] = []
  await scanLinks({ url: `${origin}/files/direct`, depth: 0, maxPages: 1 }, new AbortController().signal, urls => found.push(...urls))
  assert.deepEqual(found, [`${origin}/files/direct`])
})

test('cancel interrupts a stalled response body', async () => {
  const controller = new AbortController()
  const pending = scanLinks({ url: `${origin}/files/slow.html`, depth: 0, maxPages: 1 }, controller.signal, () => undefined)
  const timer = setTimeout(() => controller.abort(), 100)
  const result = await pending
  clearTimeout(timer)
  assert.equal(result.canceled, true)
})
