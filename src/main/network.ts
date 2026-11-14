import { session, type Session } from 'electron'
import { createHash } from 'node:crypto'
import { proxyConfiguration, externalProxy, type ProxySettings } from '../shared/network-policy'

let provider: () => ProxySettings = () => ({ proxyMode: 'direct', proxy: '' })
const sessions = new Map<string, Promise<Session>>()
export function setNetworkSettingsProvider(next: () => ProxySettings): void { provider = next }
async function networkSession(): Promise<Session> {
  const config = proxyConfiguration(provider())
  const key = JSON.stringify(config)
  let pending = sessions.get(key)
  if (!pending) {
    pending = (async () => {
      const partition = `baran-network-${createHash('sha256').update(key).digest('hex').slice(0, 16)}`
      const client = session.fromPartition(partition, { cache: false })
      await client.setProxy(config)
      return client
    })()
    sessions.set(key, pending)
    pending.catch(() => sessions.delete(key))
  }
  return pending
}
/** Uses Chromium's proxy resolver, including the operating system's PAC configuration. */
export async function networkFetch(input: string | URL, init?: RequestInit): Promise<Response> {
  const client = await networkSession()
  return client.fetch(input.toString(), init)
}
export async function mediaProxy(url: string): Promise<string> {
  const settings = provider()
  proxyConfiguration(settings)
  if (settings.proxyMode === 'direct') return ''
  if (settings.proxyMode === 'manual') return settings.proxy
  return externalProxy(await (await networkSession()).resolveProxy(url))
}
