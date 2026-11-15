const { rmSync } = require('node:fs')
const { join } = require('node:path')

module.exports = async function (context) {
  // Electron's demo application is unused. Preserve runtime/GPU libraries.
  if (context.electronPlatformName === 'win32') {
    rmSync(join(context.appOutDir, 'resources', 'default_app.asar'), { force: true })
  }
}
