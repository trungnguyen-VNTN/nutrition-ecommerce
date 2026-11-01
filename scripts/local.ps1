param([Parameter(Mandatory)][ValidateSet('Start', 'Stop')][string]$Action)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$run = Join-Path $root '.local-run'
New-Item -ItemType Directory -Force -Path $run | Out-Null
Set-Location -LiteralPath $root
$env:PATH += ';' + (Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin')
$lock = $null

function Test-DockerReady {
    $ErrorActionPreference = 'Continue'
    & docker info --format '{{.ServerVersion}}' *> $null
    return ($LASTEXITCODE -eq 0)
}

function Test-DatabaseReady {
    $ErrorActionPreference = 'Continue'
    & docker compose exec -T postgres pg_isready -U nutrition_dev -d nutrition_dev *> $null
    return ($LASTEXITCODE -eq 0)
}

function Get-OwnedProcess($record) {
    $process = Get-Process -Id $record.pid -ErrorAction SilentlyContinue
    if ($process -and $process.StartTime.ToUniversalTime().Ticks.ToString() -eq $record.started) {
        return $process
    }
    return $null
}

function Stop-Owned($name) {
    $path = Join-Path $run "$name.json"
    if (!(Test-Path -LiteralPath $path)) { return }
    $record = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    if (Get-OwnedProcess $record) {
        & taskkill.exe /PID $record.pid /T /F | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Cannot stop owned $name process $($record.pid)." }
        Write-Host "Stopped $name and its child processes."
    }
    Remove-Item -LiteralPath $path
}

function Start-Owned($name, $directory, $command) {
    $path = Join-Path $run "$name.json"
    if (Test-Path -LiteralPath $path) {
        $record = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
        if (Get-OwnedProcess $record) { return $record }
    }
    $process = Start-Process -FilePath $env:ComSpec -ArgumentList "/d /s /c `"$command`"" -WorkingDirectory $directory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $run "$name.log") -RedirectStandardError (Join-Path $run "$name-error.log")
    $record = @{ pid = $process.Id; started = $process.StartTime.ToUniversalTime().Ticks.ToString() }
    $record | ConvertTo-Json | Set-Content -LiteralPath $path
    return $record
}

function Wait-Http($name, $url, $record, $seconds) {
    $deadline = (Get-Date).AddSeconds($seconds)
    do {
        if (!(Get-OwnedProcess $record)) { throw "$name exited. See $run\$name.log and $name-error.log." }
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 3
            if ($response.StatusCode -eq 200) {
                if ($name -ne 'backend') { return }
                $health = Invoke-RestMethod -Uri $url -TimeoutSec 3
                if ($health.status -eq 'UP') { return }
            }
        } catch { $lastError = $_.Exception.Message }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    throw "$name not ready at $url. $lastError See $run."
}

function Assert-PortAvailable($port, $name) {
    $path = Join-Path $run "$name.json"
    if (Test-Path -LiteralPath $path) {
        if (Get-OwnedProcess (Get-Content -LiteralPath $path -Raw | ConvertFrom-Json)) { return }
    }
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        throw "Port $port is already used by a process not started by START.bat. Stop it yourself first."
    }
}

try {
    $lock = [IO.File]::Open((Join-Path $run 'launcher.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    if ($Action -eq 'Stop') {
        Stop-Owned 'frontend'
        Stop-Owned 'backend'
        & docker compose stop postgres
        if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL stop failed. No container or volume was deleted.' }
        Write-Host 'Local project stopped. Database data preserved.' -ForegroundColor Green
    } else {
        foreach ($tool in @('docker', 'java', 'npm.cmd')) {
            if (!(Get-Command $tool -ErrorAction SilentlyContinue)) { throw "Missing $tool. Install/configure it before starting." }
        }
        if (!(Test-Path (Join-Path $root 'frontend/node_modules/.bin/vite.cmd'))) {
            throw 'Frontend dependencies are missing. Run npm install in frontend once.'
        }
        Assert-PortAvailable 8080 'backend'
        Assert-PortAvailable 5173 'frontend'
        $ready = Test-DockerReady
        if (!$ready) {
            $desktop = Join-Path $env:ProgramFiles 'Docker/Docker/Docker Desktop.exe'
            if (!(Test-Path -LiteralPath $desktop)) { throw 'Docker Desktop was not found.' }
            Write-Host 'Starting Docker Desktop; waiting up to 120 seconds for Engine...'
            Start-Process -FilePath $desktop -WindowStyle Hidden
            $deadline = (Get-Date).AddSeconds(120)
            do {
                Start-Sleep -Seconds 3
                $ready = Test-DockerReady
                if ($ready) { break }
            } while ((Get-Date) -lt $deadline)
            if (!$ready) { throw 'Docker Engine is unavailable. Check Docker Desktop; no reset was attempted.' }
        }
        & docker compose up -d postgres
        if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL startup failed. Check Docker storage/Compose output above.' }
        Write-Host 'Waiting for PostgreSQL...'
        $deadline = (Get-Date).AddSeconds(60)
        do {
            $databaseReady = Test-DatabaseReady
            if ($databaseReady) { break }
            Start-Sleep -Seconds 2
        } while ((Get-Date) -lt $deadline)
        if (!$databaseReady) { throw 'PostgreSQL is not ready after 60 seconds.' }
        $env:MAVEN_OPTS = '-Xmx256m -XX:MaxMetaspaceSize=128m -XX:+UseSerialGC'
        $env:NODE_OPTIONS = '--max-old-space-size=384'
        Write-Host 'Starting backend (local profile, cached Maven dependencies)...'
        $backend = Start-Owned 'backend' (Join-Path $root 'backend') 'mvnw.cmd -o -B -ntp spring-boot:run -Dspring-boot.run.profiles=local "-Dspring-boot.run.jvmArguments=-Xmx256m -XX:MaxMetaspaceSize=128m -XX:+UseSerialGC"'
        Wait-Http 'backend' 'http://localhost:8080/actuator/health' $backend 180
        Write-Host 'Starting frontend...'
        $frontend = Start-Owned 'frontend' (Join-Path $root 'frontend') 'npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort'
        Wait-Http 'frontend' 'http://localhost:5173' $frontend 60
        Write-Host 'READY: http://localhost:5173 (logs: .local-run). Use STOP.bat to stop.' -ForegroundColor Green
        Start-Process 'http://localhost:5173'
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Startup was not reported successful. Use STOP.bat to stop any components already started.'
    exit 1
} finally {
    if ($lock) { $lock.Dispose() }
}

