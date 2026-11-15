param([switch]$SkipFrontend, [switch]$SkipInstaller, [string]$CertificateThumbprint = $env:BARAN_SIGNING_THUMBPRINT)
$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
$version = (Get-Content -LiteralPath (Join-Path $repository 'package.json') -Raw | ConvertFrom-Json).version
$dependencies = Join-Path $repository '.tools/native-deps'
New-Item -ItemType Directory -Force -Path $dependencies | Out-Null
function Get-Dependency([string]$Name, [string]$Url, [string]$Hash) {
    $archive = Join-Path $dependencies "$Name.zip"
    if (-not (Test-Path -LiteralPath $archive)) { Invoke-WebRequest -Uri $Url -OutFile $archive }
    if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $Hash) { throw "Checksum mismatch: $Name" }
    $folder = Join-Path $dependencies $Name
    if (-not (Test-Path -LiteralPath $folder)) { Expand-Archive -LiteralPath $archive -DestinationPath $folder }
    return $folder
}
$webview = Get-Dependency 'webview2' 'https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/1.0.4314.35/microsoft.web.webview2.1.0.4314.35.nupkg' '90778DEB1B77E36292828B4B5833C9255C27533F40E0DDD55891AE718944EDC4'
$html = Get-Dependency 'html' 'https://api.nuget.org/v3-flatcontainer/htmlagilitypack/1.13.1/htmlagilitypack.1.13.1.nupkg' 'FC3F549E1C86EFF1EE6E7AD872A7C0F5AC21CEE093D0F606F8270B3E937AFCCE'
$aria = Get-Dependency 'aria2' 'https://github.com/aria2/aria2/releases/download/release-1.37.0/aria2-1.37.0-win-64bit-build1.zip' '67D015301EEF0B612191212D564C5BB0A14B5B9C4796B76454276A4D28D9B288'
if (-not $SkipFrontend) {
    Push-Location $repository
    try { npm run build; if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' } } finally { Pop-Location }
}
$destination = [IO.Path]::GetFullPath((Join-Path $repository 'dist/native'))
$expected = [IO.Path]::GetFullPath((Join-Path $repository 'dist/native'))
if ($destination -ne $expected -or -not $destination.StartsWith([IO.Path]::GetFullPath((Join-Path $repository 'dist')) + [IO.Path]::DirectorySeparatorChar)) { throw 'Invalid build directory' }
if (Test-Path -LiteralPath $destination) { Remove-Item -LiteralPath $destination -Recurse -Force }
New-Item -ItemType Directory -Force -Path $destination, "$destination/bin", "$destination/native-host", "$destination/licenses" | Out-Null
Copy-Item -LiteralPath (Join-Path $repository 'out/renderer') -Destination (Join-Path $destination 'ui') -Recurse
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'bridge.js'), (Join-Path $repository 'resources/icon.ico') -Destination $destination
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'mobile.html') -Destination $destination
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'runtime-components.json') -Destination $destination
Copy-Item -LiteralPath (Join-Path $webview 'lib/net462/Microsoft.Web.WebView2.Core.dll'), (Join-Path $webview 'lib/net462/Microsoft.Web.WebView2.WinForms.dll'), (Join-Path $webview 'runtimes/win-x64/native/WebView2Loader.dll'), (Join-Path $html 'lib/Net45/HtmlAgilityPack.dll') -Destination $destination
Copy-Item -LiteralPath (Join-Path $aria 'aria2-1.37.0-win-64bit-build1/aria2c.exe') -Destination "$destination/bin"
Copy-Item -LiteralPath (Join-Path $repository 'LICENSE') -Destination "$destination/licenses/Baran-GPL.txt"
Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'licenses') -File | Copy-Item -Destination "$destination/licenses"
foreach ($package in @('react', 'react-dom', 'lucide-react', 'tailwindcss')) {
    Get-ChildItem -LiteralPath (Join-Path $repository "node_modules/$package") -File | Where-Object { $_.Name -match '^LICENSE' } | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination (Join-Path "$destination/licenses" ($package + '-' + $_.Name)) }
}
Get-ChildItem -LiteralPath (Join-Path $aria 'aria2-1.37.0-win-64bit-build1') -File | Where-Object { $_.Name -match 'COPYING|LICENSE|AUTHORS|NOTICE' } | Copy-Item -Destination "$destination/licenses"
foreach ($folder in @($webview, $html)) {
    Get-ChildItem -LiteralPath $folder -File | Where-Object { $_.Name -match 'LICENSE|NOTICE' } | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination (Join-Path "$destination/licenses" ((Split-Path $folder -Leaf) + '-' + $_.Name)) }
}
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$sources = Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.cs' -File | ForEach-Object FullName
& $compiler /nologo /target:winexe /platform:x64 /optimize+ "/win32icon:$(Join-Path $repository 'resources/icon.ico')" "/out:$destination/Baran Download Manager.exe" /r:System.Web.Extensions.dll /r:System.Core.dll /r:System.Security.dll /r:Microsoft.CSharp.dll /r:System.Windows.Forms.dll /r:System.Drawing.dll "/r:$destination/HtmlAgilityPack.dll" "/r:$destination/Microsoft.Web.WebView2.Core.dll" "/r:$destination/Microsoft.Web.WebView2.WinForms.dll" $sources
if ($LASTEXITCODE -ne 0) { throw 'Native application compilation failed' }
& $compiler /nologo /target:exe "/out:$destination/native-host/BaranNativeHost.exe" (Join-Path $repository 'browser-extension/native-host/NativeHost.cs')
if ($LASTEXITCODE -ne 0) { throw 'Native messaging host compilation failed' }
if ($CertificateThumbprint) { & (Join-Path $PSScriptRoot 'sign.ps1') -Files @((Join-Path $destination 'Baran Download Manager.exe'), (Join-Path $destination 'native-host/BaranNativeHost.exe')) -CertificateThumbprint $CertificateThumbprint }
$archive = Join-Path $repository "dist/Baran-Download-Manager-Native-Portable-$version-x64.zip"
Compress-Archive -Path (Join-Path $destination '*') -DestinationPath $archive -Force
Write-Output $archive
if (-not $SkipInstaller) {
    $nsis = Get-ChildItem -LiteralPath (Join-Path $env:LOCALAPPDATA 'electron-builder/Cache') -Filter 'makensis.exe' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $nsis) {
        $nsisArchive = Join-Path $dependencies 'nsis.7z'
        if (-not (Test-Path -LiteralPath $nsisArchive)) { Invoke-WebRequest 'https://github.com/electron-userland/electron-builder-binaries/releases/download/nsis-3.0.4.1/nsis-3.0.4.1.7z' -OutFile $nsisArchive }
        if ((Get-FileHash -LiteralPath $nsisArchive -Algorithm SHA256).Hash -ne '9877DF902530F96357D13A7A31AE2B9DF67F48B11FFC9A1700A7C961574EC5FA') { throw 'NSIS checksum mismatch' }
        $extractor = Join-Path $dependencies '7zr.exe'
        if (-not (Test-Path -LiteralPath $extractor)) { Invoke-WebRequest 'https://github.com/ip7z/7zip/releases/download/26.06/7zr.exe' -OutFile $extractor }
        if ((Get-FileHash -LiteralPath $extractor -Algorithm SHA256).Hash -ne 'E80DB2DAD715A6C5ADABE292D31ED54E11F4E9B99CA349827B50573B175891BC') { throw '7-Zip checksum mismatch' }
        $nsisFolder = Join-Path $dependencies 'nsis'
        & $extractor x $nsisArchive "-o$nsisFolder" -y | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'NSIS extraction failed' }
        $nsis = Get-ChildItem -LiteralPath $nsisFolder -Filter 'makensis.exe' -File -Recurse | Select-Object -First 1
        if (-not $nsis) { throw 'NSIS compiler was not found after extraction' }
    }
    & $nsis.FullName "/DAPP_VERSION=$version" "/DAPP_SOURCE=$destination" "/DOUTPUT=$(Join-Path $repository "dist/Baran-Download-Manager-Native-Setup-$version-x64.exe")" (Join-Path $PSScriptRoot 'installer.nsi')
    if ($LASTEXITCODE -ne 0) { throw 'Native installer compilation failed' }
    if ($CertificateThumbprint) { & (Join-Path $PSScriptRoot 'sign.ps1') -Files @((Join-Path $repository "dist/Baran-Download-Manager-Native-Setup-$version-x64.exe")) -CertificateThumbprint $CertificateThumbprint }
}
