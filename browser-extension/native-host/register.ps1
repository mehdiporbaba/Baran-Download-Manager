param(
    [Parameter(Mandatory=$true)][ValidatePattern('^[a-p]{32}$')][string]$ExtensionId,
    [ValidateSet('chrome','edge')][string]$Browser = 'chrome',
    [switch]$Unregister
)
$ErrorActionPreference = 'Stop'
$vendor = if ($Browser -eq 'edge') { 'Microsoft\Edge' } else { 'Google\Chrome' }
$registryPath = "HKCU:\Software\$vendor\NativeMessagingHosts\com.baran.downloadmanager"
if ($Unregister) {
    if (Test-Path -LiteralPath $registryPath) { Remove-Item -LiteralPath $registryPath }
    Write-Output "Unregistered Baran native host for $Browser."
    exit
}
$hostExe = Join-Path $PSScriptRoot 'BaranNativeHost.exe'
if (-not (Test-Path -LiteralPath $hostExe)) {
    $compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
    if (-not (Test-Path -LiteralPath $compiler)) { throw '.NET Framework C# compiler is required for a source checkout.' }
    & $compiler /nologo /target:exe "/out:$hostExe" (Join-Path $PSScriptRoot 'NativeHost.cs')
    if ($LASTEXITCODE -ne 0) { throw 'Native host compilation failed.' }
}
$manifest = Join-Path $PSScriptRoot "com.baran.downloadmanager.$Browser.json"
$configuration = @{
    name = 'com.baran.downloadmanager'
    description = 'Baran browser link bridge'
    path = $hostExe
    type = 'stdio'
    allowed_origins = @("chrome-extension://$ExtensionId/")
} | ConvertTo-Json
[System.IO.File]::WriteAllText($manifest, $configuration, [System.Text.UTF8Encoding]::new($false))
New-Item -Path $registryPath -Force | Out-Null
Set-Item -LiteralPath $registryPath -Value $manifest
Write-Output "Registered Baran for $Browser extension $ExtensionId. Keep this folder in place."
