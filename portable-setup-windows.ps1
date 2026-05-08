param(
    [string]$ProjectRoot = "",
    [string]$DatabaseName = "game_data",
    [string]$DatabaseUser = "postgres",
    [string]$DatabasePassword = "123456",
    [string]$PsqlExe = "C:\Program Files\PostgreSQL\18\bin\psql.exe",
    [string]$CreatedbExe = "C:\Program Files\PostgreSQL\18\bin\createdb.exe",
    [string]$PythonExe = "",
    [switch]$SkipNpmInstall,
    [switch]$SkipPythonInstall,
    [switch]$SkipDbRestore
)

$ErrorActionPreference = "Stop"

function Resolve-Tool {
    param(
        [string]$PreferredPath,
        [string]$CommandName,
        [string]$FriendlyName
    )

    if ($PreferredPath -and (Test-Path $PreferredPath)) {
        return $PreferredPath
    }

    $command = Get-Command $CommandName -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    throw "$FriendlyName not found. Install it or pass an explicit path."
}

function Invoke-Native {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$StepName
    )

    Write-Output "[$StepName] $FilePath $($Arguments -join ' ')"
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$StepName failed with exit code $LASTEXITCODE"
    }
}

$scriptRoot = $PSScriptRoot
if (-not $ProjectRoot) {
    if (Test-Path (Join-Path $scriptRoot "source\package.json")) {
        $ProjectRoot = Join-Path $scriptRoot "source"
    }
    else {
        $ProjectRoot = $scriptRoot
    }
}

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$backendRoot = Join-Path $ProjectRoot "backend"
$dumpFileCandidates = @(
    (Join-Path $scriptRoot "db\game_data_dump.sql"),
    (Join-Path $ProjectRoot "db\game_data_dump.sql")
)
$dumpFile = $dumpFileCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not (Test-Path (Join-Path $ProjectRoot "package.json"))) {
    throw "ProjectRoot does not look like the project root: $ProjectRoot"
}

if (-not (Test-Path $backendRoot)) {
    throw "Backend directory not found: $backendRoot"
}

$PsqlExe = if ($SkipDbRestore) { $PsqlExe } else { Resolve-Tool -PreferredPath $PsqlExe -CommandName "psql" -FriendlyName "PostgreSQL psql" }
$CreatedbExe = if ($SkipDbRestore) { $CreatedbExe } else { Resolve-Tool -PreferredPath $CreatedbExe -CommandName "createdb" -FriendlyName "PostgreSQL createdb" }
$npmExe = Resolve-Tool -PreferredPath "" -CommandName "npm.cmd" -FriendlyName "npm"
if (-not $SkipPythonInstall) {
    if (-not $PythonExe) {
        $PythonExe = if ($env:PYTHON_EXE) { $env:PYTHON_EXE } else { "" }
    }
    $PythonExe = Resolve-Tool -PreferredPath $PythonExe -CommandName "python" -FriendlyName "Python 3.11"
}

Write-Output "ProjectRoot: $ProjectRoot"
Write-Output "BackendRoot: $backendRoot"
Write-Output "Database: postgresql://$($DatabaseUser):******@localhost:5432/$DatabaseName"
Write-Output "psql: $PsqlExe"
Write-Output "createdb: $CreatedbExe"
Write-Output "python: $(if ($SkipPythonInstall) { 'skipped' } else { $PythonExe })"
Write-Output "npm: $npmExe"

$envFile = Join-Path $backendRoot ".env"
$envContent = @"
APP_ENV=development
APP_PORT=8000
DATABASE_URL=postgresql://$DatabaseUser`:$DatabasePassword@localhost:5432/$DatabaseName
ACTIVE_DATA_VERSION=latest
DATA_COLLECTION_MODE=manual-drop
AKSHARE_ENABLE=true
AKSHARE_SLEEP_MIN_SECONDS=1.5
AKSHARE_SLEEP_MAX_SECONDS=3.0
AKSHARE_RETRY_COUNT=3
AKSHARE_RETRY_BACKOFF_SECONDS=2.5
AKSHARE_CHUNK_SIZE=8
AKSHARE_CHUNK_COOLDOWN_SECONDS=6.0
AKSHARE_HISTORY_LOOKBACK_DAYS=240
JIN10_ENABLE=false
JIN10_API_BASE_URL=
JIN10_API_KEY=
JIN10_POLL_INTERVAL_SECONDS=300
JIN10_REQUEST_TIMEOUT_SECONDS=10
"@
Set-Content -Path $envFile -Value $envContent -Encoding UTF8
Write-Output "Wrote backend env: $envFile"

$env:PGPASSWORD = $DatabasePassword

if (-not $SkipDbRestore) {
    if (-not $dumpFile) {
        throw "Database dump not found. Expected db\game_data_dump.sql beside this script or under project root."
    }

    $exists = & $PsqlExe -U $DatabaseUser -d postgres -tAc "select 1 from pg_database where datname='$DatabaseName'"
    if (-not ($exists -match "1")) {
        Invoke-Native -FilePath $CreatedbExe -Arguments @("-U", $DatabaseUser, $DatabaseName) -StepName "Create database"
    }
    else {
        Write-Output "Database already exists: $DatabaseName"
    }

    Invoke-Native -FilePath $PsqlExe -Arguments @("-U", $DatabaseUser, "-d", $DatabaseName, "-v", "ON_ERROR_STOP=1", "-f", $dumpFile) -StepName "Restore database"
}
else {
    Write-Output "Skipping database restore."
}

$runtimeScript = Join-Path $backendRoot "scripts\init-runtime-directories.ps1"
if (Test-Path $runtimeScript) {
    & powershell.exe -ExecutionPolicy Bypass -File $runtimeScript
}

if (-not $SkipPythonInstall) {
    $packageDir = Join-Path $backendRoot ".packages"
    New-Item -ItemType Directory -Force -Path $packageDir | Out-Null
    Invoke-Native -FilePath $PythonExe -Arguments @("-m", "pip", "install", "-r", (Join-Path $backendRoot "requirements.txt"), "-t", $packageDir) -StepName "Install backend dependencies"
}
else {
    Write-Output "Skipping backend dependency install."
}

if (-not $SkipNpmInstall) {
    Push-Location $ProjectRoot
    try {
        Invoke-Native -FilePath $npmExe -Arguments @("install") -StepName "Install frontend dependencies"
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Output "Skipping frontend dependency install."
}

Write-Output ""
Write-Output "Portable setup completed."
Write-Output "Start backend:"
Write-Output "powershell.exe -ExecutionPolicy Bypass -File `"$backendRoot\scripts\run-api.ps1`""
Write-Output "Start frontend:"
Write-Output "cd `"$ProjectRoot`"; npm.cmd run dev"
Write-Output "Verify:"
Write-Output "http://127.0.0.1:8000/health"
Write-Output "http://127.0.0.1:3000/portfolio"
