param(
    [string]$PsqlExe = "C:\Program Files\PostgreSQL\18\bin\psql.exe",
    [string]$CreatedbExe = "C:\Program Files\PostgreSQL\18\bin\createdb.exe",
    [string]$DatabaseName = "game_data",
    [string]$DatabaseUser = "postgres",
    [string]$DatabasePassword = "123456",
    [string]$DumpFile = (Join-Path $PSScriptRoot "game_data_dump.sql")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $PsqlExe)) {
    $psqlCommand = Get-Command psql -ErrorAction SilentlyContinue
    if ($psqlCommand) {
        $PsqlExe = $psqlCommand.Source
    }
    else {
        throw "psql not found. Set -PsqlExe to your PostgreSQL psql.exe path."
    }
}

if (-not (Test-Path $CreatedbExe)) {
    $createdbCommand = Get-Command createdb -ErrorAction SilentlyContinue
    if ($createdbCommand) {
        $CreatedbExe = $createdbCommand.Source
    }
    else {
        throw "createdb not found. Set -CreatedbExe to your PostgreSQL createdb.exe path."
    }
}

if (-not (Test-Path $DumpFile)) {
    throw "Dump file not found: $DumpFile"
}

$env:PGPASSWORD = $DatabasePassword

Write-Output "Creating database if needed: $DatabaseName"
$exists = & $PsqlExe -U $DatabaseUser -d postgres -tAc "select 1 from pg_database where datname='$DatabaseName'"
if (-not ($exists -match "1")) {
    & $CreatedbExe -U $DatabaseUser $DatabaseName
    if ($LASTEXITCODE -ne 0) {
        throw "createdb failed with exit code $LASTEXITCODE"
    }
}
else {
    Write-Output "Database already exists: $DatabaseName"
}

Write-Output "Restoring dump: $DumpFile"
& $PsqlExe -U $DatabaseUser -d $DatabaseName -v ON_ERROR_STOP=1 -f $DumpFile
if ($LASTEXITCODE -ne 0) {
    throw "psql restore failed with exit code $LASTEXITCODE"
}

Write-Output "Database restore completed."
