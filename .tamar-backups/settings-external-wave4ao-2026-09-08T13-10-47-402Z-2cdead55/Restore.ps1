#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$node = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $node) { $node = Get-Command node -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1 }
if (-not $node) { throw "Node.js was not found." }
& $node.Source (Join-Path $PSScriptRoot "restore-runner.cjs") rollback $PSScriptRoot
if ($LASTEXITCODE -ne 0) { throw "Restore stopped on a conflict; inspect the messages above." }
