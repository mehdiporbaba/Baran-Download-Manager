export type ProxySettings = { proxyMode: 'direct' | 'system' | 'manual'; proxy: string }
export function proxyConfiguration(settings: ProxySettings): { mode: 'direct' | 'system' | 'fixed_servers'; proxyRules?: string; proxyBypassRules?: string } {
  if (!['direct', 'system', 'manual'].includes(settings.proxyMode)) throw new Error('Invalid proxy mode')
  if (settings.proxyMode !== 'manual') return { mode: settings.proxyMode }
  let url: URL
  try { url = new URL(settings.proxy) } catch { throw new Error('Enter a proxy URL, for example http://127.0.0.1:8080') }
  if (!['http:', 'https:', 'socks4:', 'socks5:'].includes(url.protocol) || !url.hostname || url.username || url.password || url.search || url.hash || (url.pathname && url.pathname !== '/')) throw new Error('Use an HTTP, HTTPS, SOCKS4 or SOCKS5 proxy URL without credentials or a path')
  return { mode: 'fixed_servers', proxyRules: `${url.protocol}//${url.host}`, proxyBypassRules: '<-loopback>' }
}
export function externalProxy(resolution: string): string {
  const first = resolution.split(';')[0].trim()
  if (first === 'DIRECT') return ''
  const match = /^(PROXY|HTTPS|SOCKS|SOCKS4|SOCKS5)\s+(.+)$/i.exec(first)
  if (!match) throw new Error('System proxy could not be mapped to the media downloader')
  return `${({ PROXY: 'http', HTTPS: 'https', SOCKS: 'socks5', SOCKS4: 'socks4', SOCKS5: 'socks5' } as Record<string, string>)[match[1].toUpperCase()]}://${match[2]}`
}
