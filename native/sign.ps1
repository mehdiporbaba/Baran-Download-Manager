param(
    [Parameter(Mandatory=$true)][string[]]$Files,
    [Parameter(Mandatory=$true)][ValidatePattern('^[a-fA-F0-9]{40}$')][string]$CertificateThumbprint
)
$ErrorActionPreference = 'Stop'
$certificate = Get-Item -LiteralPath "Cert:\CurrentUser\My\$CertificateThumbprint"
if (-not $certificate.HasPrivateKey -or $certificate.NotAfter -le (Get-Date)) { throw 'A current code-signing certificate with its private key is required' }
$usage = $certificate.EnhancedKeyUsageList | Where-Object { $_.ObjectId.Value -eq '1.3.6.1.5.5.7.3.3' }
if (-not $usage) { throw 'The certificate does not permit code signing' }
foreach ($file in $Files) {
    $result = Set-AuthenticodeSignature -LiteralPath $file -Certificate $certificate -HashAlgorithm SHA256 -TimestampServer 'http://timestamp.digicert.com'
    if ($result.Status -ne 'Valid') { throw "Signing did not produce a trusted signature for $file`: $($result.Status)" }
}
