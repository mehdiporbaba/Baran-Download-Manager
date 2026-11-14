import { app } from 'electron'
import { promises as fs, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { bundledBin, runCapture } from './engines/youtube'
import { networkFetch, mediaProxy } from './network'
import { instagramUrl, galleryAssets } from '../shared/instagram'
import type { Settings } from '../shared/types'

async function galleryBinary(): Promise<string> {
  const bundled = bundledBin('gallery-dl')
  if (bundled) return bundled
  const check = await runCapture('gallery-dl', ['--version'], 5000)
  if (check.code === 0) return 'gallery-dl'
  throw new Error('Instagram needs gallery-dl. Use Install Instagram tool below, or install gallery-dl on your system.')
}
export async function collectInstagram(value: string, settings: Settings): Promise<Array<{ url: string; fileName: string }>> {
  const url = instagramUrl(value)
  const binary = await galleryBinary()
  const args = ['--config-ignore', '--no-input', '--no-colors', '--no-postprocessors', '-j', '--range', '1-100', '--http-timeout', '20', '--retries', '2']
  args.push('--proxy', await mediaProxy(url))
  if (settings.cookiesFile && existsSync(settings.cookiesFile)) args.push('--cookies', settings.cookiesFile)
  else if (settings.cookiesBrowser) args.push('--cookies-from-browser', `${settings.cookiesBrowser}/instagram.com`)
  args.push('--', url)
  const response = await runCapture(binary, args, 90_000)
  let assets: Array<{ url: string; fileName: string }>
  try { assets = galleryAssets(JSON.parse(response.stdout)) }
  catch { throw new Error('Instagram extraction failed. The post may require a signed-in browser, cookies, or an updated gallery-dl.') }
  if (!assets.length) throw new Error('No downloadable media was returned. For restricted posts or stories, select your signed-in browser in Settings → Tools and retry.')
  return assets
}
export async function installGallery(): Promise<void> {
  if (process.platform !== 'win32') throw new Error('Install gallery-dl through pipx on this platform, then restart Baran.')
  const metadata = await networkFetch('https://api.github.com/repos/mikf/gallery-dl/releases/latest', { signal: AbortSignal.timeout(30_000), headers: { Accept: 'application/vnd.github+json' } })
  if (!metadata.ok) throw new Error(`Could not check gallery-dl release: HTTP ${metadata.status}`)
  const release = await metadata.json() as { assets?: Array<{ name: string; browser_download_url: string; digest?: string }> }
  const asset = release.assets?.find(item => item.name === 'gallery-dl.exe')
  if (!asset || !asset.browser_download_url.startsWith('https://github.com/mikf/gallery-dl/releases/')) throw new Error('Official gallery-dl executable was not found')
  const response = await networkFetch(asset.browser_download_url, { signal: AbortSignal.timeout(180_000) })
  if (!response.ok || !response.body) throw new Error(`Tool download failed: HTTP ${response.status}`)
  const directory = join(app.getPath('userData'), 'bin')
  await fs.mkdir(directory, { recursive: true })
  const target = join(directory, 'gallery-dl.exe')
  const temporary = `${target}.download`
  const handle = await fs.open(temporary, 'w')
  const hash = createHash('sha256')
  let size = 0
  try {
    for await (const bytes of response.body) {
      size += bytes.length
      if (size > 200 * 1024 * 1024) throw new Error('Tool download exceeds 200 MB')
      hash.update(bytes)
      await handle.write(bytes)
    }
    const digest = hash.digest('hex')
    if (asset.digest?.startsWith('sha256:') && digest !== asset.digest.slice(7)) throw new Error('Tool checksum verification failed')
    await handle.close()
    await fs.rename(temporary, target)
  } catch (error) { await handle.close().catch(() => undefined); await fs.unlink(temporary).catch(() => undefined); throw error }
}
