$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$manifestPath = Join-Path $PSScriptRoot '../package.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$packages = @($manifest.dependencies.PSObject.Properties) + @($manifest.devDependencies.PSObject.Properties)
$cutoff = [DateTimeOffset]::Now.AddDays(-21)
$approvedAgeExceptions = @('vitest@4.1.12', 'zod@4.6.7')

# Run manually in the user's network-enabled terminal. This script only queries npm.
foreach ($package in $packages) {
    $specification = "$($package.Name)@$($package.Value)"
    $rawMetadata = & npm.cmd view $specification version engines peerDependencies time --json
    if ($LASTEXITCODE -ne 0) {
        throw "Cannot verify $specification. Stop before installation."
    }
    $metadata = ($rawMetadata -join "`n") | ConvertFrom-Json
    if ($metadata.version -ne $package.Value) {
        throw "Unexpected registry version for $specification."
    }
    $releaseProperty = $metadata.time.PSObject.Properties[$package.Value]
    if ($null -eq $releaseProperty) {
        throw "Release date is missing for $specification."
    }
    $released = [DateTimeOffset]::Parse($releaseProperty.Value)
    if ($released -gt $cutoff -and $specification -notin $approvedAgeExceptions) {
        throw "$specification is less than 21 days old. Stop before installation."
    }
    $engineProperty = $metadata.PSObject.Properties['engines']
    $peerProperty = $metadata.PSObject.Properties['peerDependencies']
    [PSCustomObject]@{
        Package = $specification
        Released = $released.ToString('yyyy-MM-dd')
        ApprovedAgeException = $specification -in $approvedAgeExceptions
        Engines = if ($null -ne $engineProperty) { $engineProperty.Value | ConvertTo-Json -Compress } else { '-' }
        Peers = if ($null -ne $peerProperty) { $peerProperty.Value | ConvertTo-Json -Compress } else { '-' }
    } | Format-List
}
