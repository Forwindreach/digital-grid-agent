$ErrorActionPreference = "Stop"

$launcher = Get-ChildItem -LiteralPath $PSScriptRoot -Filter "*.ps1" |
  Where-Object { $_.Name -notin @("start-digital-grid-worker.ps1", "deploy.ps1") } |
  Select-Object -First 1

if (-not $launcher) {
  throw "Main launcher script was not found."
}

& $launcher.FullName
