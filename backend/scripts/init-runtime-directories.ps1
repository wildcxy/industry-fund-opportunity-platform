$workspaceRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

$directories = @(
    "runtime\config",
    "runtime\logs",
    "runtime\logs\jobs",
    "runtime\logs\api",
    "runtime\logs\web",
    "runtime\data-archive",
    "runtime\data-archive\raw",
    "runtime\scripts",
    "runtime\manual-drop",
    "runtime\manual-drop\master",
    "runtime\manual-drop\daily"
)

foreach ($directory in $directories) {
    New-Item -ItemType Directory -Force -Path (Join-Path $workspaceRoot $directory) | Out-Null
}

Write-Output "Runtime directories initialized."
