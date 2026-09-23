$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $ProjectRoot

Write-Host "数字网格员一键启动（Windows）" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "未检测到 Node.js，请先安装 Node.js 18 或更高版本：https://nodejs.org/"
}

$RuntimeDir = Join-Path $ProjectRoot "data\runtime"
$ConfigFile = Join-Path $RuntimeDir "hiagent-config.json"
New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null

if (-not (Test-Path $ConfigFile)) {
  $UseReal = Read-Host "是否配置 HiAgent 真实接口？[y/N]"
  if ($UseReal -match "^[Yy]") {
    $Endpoint = Read-Host "HiAgent 接口地址"
    $AppId = Read-Host "应用 ID"
    $WorkflowId = Read-Host "工作流 ID"
    $ApiKey = Read-Host "API Key"

    if (
      [string]::IsNullOrWhiteSpace($Endpoint) -or
      [string]::IsNullOrWhiteSpace($AppId) -or
      [string]::IsNullOrWhiteSpace($WorkflowId) -or
      [string]::IsNullOrWhiteSpace($ApiKey)
    ) {
      throw "真实接口模式的配置项不能为空"
    }

    @{
      endpoint = $Endpoint
      appId = $AppId
      workflowId = $WorkflowId
      apiKey = $ApiKey
    } | ConvertTo-Json | Set-Content -Path $ConfigFile -Encoding UTF8
  }
}

$Port = if ($env:PORT) { $env:PORT } else { "3100" }
$Process = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $ProjectRoot -PassThru
Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:$Port"

Write-Host "服务已启动，进程 ID：$($Process.Id)" -ForegroundColor Green
