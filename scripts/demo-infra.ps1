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

if ($Mode -eq 'up') {
  # aws_rds_instance_state waits for "available" before it acts, so it can stop the database
  # but never start a stopped one (provider limitation). Start it here first; Terraform then
  # finds it available and only creates the ALB and ECS service. Start/stop only, no create/delete.
  $db = 'nutrition-dev-postgres'
  $deadline = (Get-Date).AddMinutes(25)
  while ($true) {
    $status = & $aws rds describe-db-instances --db-instance-identifier $db `
      --query 'DBInstances[0].DBInstanceStatus' --output text
    if ($LASTEXITCODE -ne 0) { throw "Cannot read the status of RDS instance $db." }
    if ($status -eq 'available') { break }
    if ($status -eq 'stopped') {
      Write-Host "Starting database $db (about 5-8 minutes)..." -ForegroundColor Cyan
      & $aws rds start-db-instance --db-instance-identifier $db --query 'DBInstance.DBInstanceStatus' --output text | Out-Null
      if ($LASTEXITCODE -ne 0) { throw "Could not start RDS instance $db. See the error above." }
    } else {
      Write-Host "Database status: $status, waiting..."
    }
    if ((Get-Date) -gt $deadline) { throw "Database $db is still '$status' after 25 minutes." }
    Start-Sleep -Seconds 20
  }
  Write-Host "Database $db is available." -ForegroundColor Green
}

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
