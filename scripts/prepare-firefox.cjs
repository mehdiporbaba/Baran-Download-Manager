const { mkdirSync, copyFileSync, existsSync, rmSync } = require('node:fs')
const { resolve, join } = require('node:path')
const root = resolve(__dirname, '..')
const destination = join(root, 'dist', 'firefox-submission')
if (existsSync(destination)) rmSync(destination, { recursive: true })
mkdirSync(destination, { recursive: true })
for (const name of ['background.js', 'popup.html', 'popup.js', 'icon128.png', 'PRIVACY.md']) {
  copyFileSync(join(root, 'browser-extension', name), join(destination, name))
}
copyFileSync(join(root, 'browser-extension', 'manifest.firefox.json'), join(destination, 'manifest.json'))
copyFileSync(join(root, 'LICENSE'), join(destination, 'LICENSE'))
console.log(destination)
