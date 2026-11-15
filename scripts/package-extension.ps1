$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $repository 'dist\extension\browser-extension'
New-Item -ItemType Directory -Force -Path (Join-Path $destination 'native-host') | Out-Null
foreach ($file in @('manifest.json', 'background.js', 'popup.html', 'popup.js', 'icon128.png')) {
    Copy-Item -LiteralPath (Join-Path $repository "browser-extension\$file") -Destination (Join-Path $destination $file)
}
foreach ($file in @('NativeHost.cs', 'register.ps1')) {
    Copy-Item -LiteralPath (Join-Path $repository "browser-extension\native-host\$file") -Destination (Join-Path $destination "native-host\$file")
}
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $compiler /nologo /target:exe "/out:$(Join-Path $destination 'native-host\BaranNativeHost.exe')" (Join-Path $destination 'native-host\NativeHost.cs')
if ($LASTEXITCODE -ne 0) { throw 'Native host build failed' }
Copy-Item -LiteralPath (Join-Path $repository 'docs\GUIDE.md') -Destination (Join-Path $destination 'GUIDE.md')
Copy-Item -LiteralPath (Join-Path $repository 'LICENSE') -Destination (Join-Path $destination 'LICENSE')
Copy-Item -LiteralPath (Join-Path $repository 'browser-extension/PRIVACY.md') -Destination (Join-Path $destination 'PRIVACY.md')
$version = (Get-Content (Join-Path $repository 'browser-extension/manifest.json') -Raw | ConvertFrom-Json).version
$archive = Join-Path $repository "dist\Baran-Browser-Extension-$version.zip"
Compress-Archive -Path $destination -DestinationPath $archive -Force
Write-Output $archive

# XPI must contain manifest.json at its root. This is an UNSIGNED developer
# artifact; Mozilla signing is required for normal Firefox installation.
$firefox = Join-Path $repository 'dist\extension\firefox'
New-Item -ItemType Directory -Force -Path $firefox | Out-Null
foreach ($file in @('background.js', 'popup.html', 'popup.js', 'icon128.png')) {
    Copy-Item -LiteralPath (Join-Path $repository "browser-extension\$file") -Destination (Join-Path $firefox $file)
}
Copy-Item -LiteralPath (Join-Path $repository 'browser-extension\manifest.firefox.json') -Destination (Join-Path $firefox 'manifest.json')
Copy-Item -LiteralPath (Join-Path $repository 'LICENSE'), (Join-Path $repository 'browser-extension/PRIVACY.md') -Destination $firefox
$firefoxZip = Join-Path $repository "dist\Baran-Firefox-Extension-$version-unsigned.zip"
Compress-Archive -Path (Join-Path $firefox '*') -DestinationPath $firefoxZip -Force
$xpi = Join-Path $repository "dist\Baran-Firefox-Extension-$version-unsigned.xpi"
Move-Item -LiteralPath $firefoxZip -Destination $xpi -Force
Write-Output "$xpi (requires Mozilla signing before public installation)"
