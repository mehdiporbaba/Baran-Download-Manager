import { createServer, type Server } from 'node:net'
import { userInfo } from 'node:os'
import type { LinkGrabber } from './link-grabber'

export const MAX_MESSAGE = 256 * 1024
export const PIPE_NAME = `baran-download-manager-${userInfo().username.replace(/[^a-zA-Z0-9_-]/g, '_')}`

export function importBrowserMessage(inbox: LinkGrabber, input: unknown): number {
  if (!input || typeof input !== 'object') throw new Error('Invalid browser message')
  const message = input as { action?: string; urls?: unknown }
  if (message.action !== 'import' || !Array.isArray(message.urls)) throw new Error('Unsupported browser command')
  if (message.urls.some(url => typeof url !== 'string')) throw new Error('Invalid URL list')
  return inbox.add(message.urls as string[], 'browser')
}

/** Native Messaging host forwards framed JSON here; no HTTP port is exposed. */
export async function startBrowserBridge(inbox: LinkGrabber, imported: () => void, pipeName = PIPE_NAME): Promise<Server | null> {
  if (process.platform !== 'win32') return null
  const server = createServer(socket => {
    let buffer = Buffer.alloc(0)
    let handled = false
    socket.setTimeout(5000, () => socket.destroy())
    socket.on('error', () => undefined)
    const reply = (value: object): void => {
      const body = Buffer.from(JSON.stringify(value))
      const header = Buffer.alloc(4)
      header.writeUInt32LE(body.length)
      socket.end(Buffer.concat([header, body]))
    }
    socket.on('data', chunk => {
      if (handled) return
      buffer = Buffer.concat([buffer, chunk])
      if (buffer.length > MAX_MESSAGE + 4) { handled = true; reply({ ok: false, error: 'Message too large' }); return }
      if (buffer.length < 4) return
      const size = buffer.readUInt32LE(0)
      if (size < 1 || size > MAX_MESSAGE) { handled = true; reply({ ok: false, error: 'Invalid message size' }); return }
      if (buffer.length < size + 4) return
      handled = true
      try {
        const count = importBrowserMessage(inbox, JSON.parse(buffer.subarray(4, size + 4).toString('utf8')))
        reply({ ok: true, count })
        imported()
      } catch (error) { reply({ ok: false, error: (error as Error).message }) }
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(`\\\\.\\pipe\\${pipeName}`, () => { server.removeListener('error', reject); resolve() })
  })
  server.on('error', error => console.error('[browser-bridge]', error.message))
  return server
}
