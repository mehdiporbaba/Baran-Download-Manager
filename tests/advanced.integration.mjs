import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, copyFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
const root = resolve('.tools/advanced-integration', `${Date.now()}-${process.pid}`)
await mkdir(root, { recursive: true })
const app = resolve('dist/native/Baran Download Manager.exe'), fixture = join(root, 'AdvancedFixture.exe')
const build = spawnSync(`${process.env.WINDIR}/Microsoft.NET/Framework64/v4.0.30319/csc.exe`, ['/nologo', '/r:System.Core.dll', '/r:System.IO.Compression.dll', '/r:System.IO.Compression.FileSystem.dll', `/r:${app}`, `/out:${fixture}`, resolve('tests/AdvancedFixture.cs')], { encoding: 'utf8' })
assert.equal(build.status, 0, build.stdout + build.stderr)
await copyFile(app, join(root, 'Baran Download Manager.exe'))
await mkdir(join(root, 'profile/bin'), { recursive: true })
const mediaBuild = spawnSync(`${process.env.WINDIR}/Microsoft.NET/Framework64/v4.0.30319/csc.exe`, ['/nologo', '/r:System.Core.dll', `/out:${join(root, 'profile/bin/yt-dlp.exe')}`, resolve('tests/NativeMediaFixture.cs')], { encoding: 'utf8' })
assert.equal(mediaBuild.status, 0, mediaBuild.stdout + mediaBuild.stderr)
const result = spawnSync(fixture, [join(root, 'profile')], { encoding: 'utf8', timeout: 45000, windowsHide: true })
process.stdout.write(result.stdout)
assert.equal(result.status, 0, result.stderr)
