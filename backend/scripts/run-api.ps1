$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$pythonExe = if ($env:PYTHON_EXE) { $env:PYTHON_EXE } else { "C:\Program Files\PostgreSQL\18\pgAdmin 4\python\python.exe" }
$packageDir = Join-Path $projectRoot ".packages"

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

Push-Location $projectRoot
try {
    & $pythonExe (Join-Path $projectRoot "scripts\serve_api.py") $packageDir $projectRoot
}
finally {
    Pop-Location
}
