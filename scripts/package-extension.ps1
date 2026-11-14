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
$archive = Join-Path $repository 'dist\Baran-Browser-Extension-1.0.0.zip'
Compress-Archive -Path $destination -DestinationPath $archive -Force
Write-Output $archive
