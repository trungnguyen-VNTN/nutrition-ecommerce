<#
  Turn the AWS dev app on or off for a demo (D20). Run it yourself: it applies with the
  nutrition-apply profile and Terraform asks you to type "yes" after showing the plan.

    .\scripts\demo-infra.ps1 up     # start RDS, create ALB + ECS service (~10-15 min)
    .\scripts\demo-infra.ps1 down   # remove ALB + ECS service, stop RDS (~5-10 min)

  While down, only storage and small fixed items are billed. AWS restarts a stopped RDS
  instance after 7 days; run "down" again if the app stays off longer than that.
#>
param(
  [Parameter(Mandatory = $true)][ValidateSet('up', 'down')][string]$Mode,
  [string]$Owner = 'trungnguyen-VNTN'
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$dev = Join-Path $repo 'infra\envs\dev'

$terraform = (Get-Command terraform -ErrorAction SilentlyContinue).Source
if (-not $terraform) {
  $terraform = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Hashicorp.Terraform*\terraform.exe" -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
}
if (-not $terraform) { throw 'Terraform not found. Install it with: winget install Hashicorp.Terraform' }

$aws = (Get-Command aws -ErrorAction SilentlyContinue).Source
if (-not $aws) { $aws = 'C:\Program Files\Amazon\AWSCLIV2\aws.exe' }
if (-not (Test-Path $aws)) { throw 'AWS CLI not found. Install it with: winget install Amazon.AWSCLI' }

if (-not (Test-Path (Join-Path $dev 'backend.hcl'))) {
  throw 'infra/envs/dev/backend.hcl is missing. See infra/README.md.'
}

$env:AWS_PROFILE = 'nutrition-apply'
$env:TF_VAR_owner = $Owner

& $aws sts get-caller-identity --query Arn --output text *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'SSO session expired or missing, logging in...'
  & $aws sso login --sso-session nutrition
  if ($LASTEXITCODE -ne 0) { throw 'aws sso login failed.' }
}

& $terraform "-chdir=$dev" init -input=false "-backend-config=backend.hcl" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'terraform init failed.' }

$running = if ($Mode -eq 'up') { 'true' } else { 'false' }
Write-Host "Planning app_running=$running. Read the plan, then type yes to apply." -ForegroundColor Cyan
& $terraform "-chdir=$dev" apply "-var=app_running=$running"
if ($LASTEXITCODE -ne 0) { throw 'terraform apply failed or was cancelled.' }

if ($Mode -eq 'up') {
  $url = & $terraform "-chdir=$dev" output -raw app_url
  Write-Host "App is starting at $url (API may need 2-3 more minutes)." -ForegroundColor Green
} else {
  Write-Host 'App is off. RDS is stopping; only storage is billed now.' -ForegroundColor Green
}

$env:AWS_PROFILE = 'nutrition-plan'
