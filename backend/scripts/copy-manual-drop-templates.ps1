param(
    [string]$TradeDate = "",
    [string]$TemplateRoot = "E:\game\backend\templates\manual-drop",
    [string]$DropzoneRoot = "E:\game\runtime\manual-drop"
)

$ErrorActionPreference = "Stop"

if (-not $TradeDate) {
    $TradeDate = Get-Date -Format "yyyy-MM-dd"
}

$targetRoot = Join-Path $DropzoneRoot $TradeDate

if (-not (Test-Path $TemplateRoot)) {
    throw "Template root not found: $TemplateRoot"
}

New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null
Copy-Item -Path (Join-Path $TemplateRoot "*") -Destination $targetRoot -Recurse -Force

Write-Output "Manual drop templates copied to $targetRoot"
