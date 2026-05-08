param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$PythonExe = $(if ($env:PYTHON_EXE) { $env:PYTHON_EXE } else { "C:\Program Files\PostgreSQL\18\pgAdmin 4\python\python.exe" }),
    [string]$PsqlExe = "C:\Program Files\PostgreSQL\18\bin\psql.exe",
    [string]$DatabaseName = "game_data",
    [string]$DatabaseUser = "postgres",
    [string]$DatabasePassword = "123456",
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

$requirementsFile = Join-Path $ProjectRoot "requirements.txt"
$packageDir = Join-Path $ProjectRoot ".packages"
$schemaFile = Join-Path $ProjectRoot "db\\sql\\001_init_schema.sql"
$initRuntimeScript = Join-Path $ProjectRoot "scripts\\init-runtime-directories.ps1"
$runJobScript = Join-Path $ProjectRoot "scripts\\run-job.ps1"

if (-not (Test-Path $PythonExe)) {
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCommand) {
        $PythonExe = $pythonCommand.Source
    }
    else {
        throw "Python interpreter not found: $PythonExe"
    }
}

if (-not (Test-Path $PsqlExe)) {
    throw "psql executable not found: $PsqlExe"
}

if (-not (Test-Path $requirementsFile)) {
    throw "requirements.txt not found: $requirementsFile"
}

if (-not (Test-Path $schemaFile)) {
    throw "schema file not found: $schemaFile"
}

Write-Host "[1/4] Initializing runtime directories..."
& powershell.exe -ExecutionPolicy Bypass -File $initRuntimeScript

if (-not $SkipInstall) {
    Write-Host "[2/4] Installing backend dependencies into .packages..."
    if (-not (Test-Path $packageDir)) {
        New-Item -ItemType Directory -Force -Path $packageDir | Out-Null
    }

    & $PythonExe -m pip install -r $requirementsFile -t $packageDir
}
else {
    Write-Host "[2/4] Skipping dependency install."
}

Write-Host "[3/4] Applying database schema..."
$env:PGPASSWORD = $DatabasePassword
& $PsqlExe -h localhost -U $DatabaseUser -d $DatabaseName -f $schemaFile

Write-Host "[4/4] Seeding demo data..."
& powershell.exe -ExecutionPolicy Bypass -File $runJobScript -JobModule seed_demo_data

Write-Host "Backend bootstrap completed."
