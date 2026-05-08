param(
    [Parameter(Mandatory = $true)]
    [string]$JobModule
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$workspaceRoot = Split-Path -Parent $projectRoot
$logDir = Join-Path $workspaceRoot "runtime\logs\jobs"
$pythonExe = if ($env:PYTHON_EXE) { $env:PYTHON_EXE } else { "C:\Program Files\PostgreSQL\18\pgAdmin 4\python\python.exe" }
$packageDir = Join-Path $projectRoot ".packages"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

if (-not (Test-Path $pythonExe)) {
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCommand) {
        $pythonExe = $pythonCommand.Source
    }
    else {
        throw "Python interpreter not found. Set PYTHON_EXE or install Python 3.11."
    }
}

if (-not (Test-Path $packageDir)) {
    throw ".packages directory not found. Please install backend dependencies first."
}

$logFile = Join-Path $logDir "$JobModule`_$timestamp.log"
$jobModuleName = "jobs.$JobModule"

Push-Location $projectRoot
try {
    Write-Output "[$(Get-Date -Format s)] start $JobModule" | Tee-Object -FilePath $logFile -Append
    & $pythonExe (Join-Path $projectRoot "scripts\run_module.py") $packageDir $projectRoot $jobModuleName 2>&1 | Tee-Object -FilePath $logFile -Append
    Write-Output "[$(Get-Date -Format s)] success $JobModule" | Tee-Object -FilePath $logFile -Append
}
finally {
    Pop-Location
}
