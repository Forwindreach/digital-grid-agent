$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $ProjectRoot

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Utf8NoBom([string]$Path, [string]$Text) {
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Text, $encoding)
}

function Test-LocalPort([int]$Port) {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $client.Connect("127.0.0.1", $Port)
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

function Resolve-NodeExecutable {
  $portableNode = Join-Path $ProjectRoot "runtime\node-win\node.exe"
  if (Test-Path $portableNode) {
    return $portableNode
  }

  $pathNode = Get-Command node -ErrorAction SilentlyContinue
  if ($pathNode) {
    return $pathNode.Source
  }

  Write-Step "未检测到 Node.js，正在下载 Windows 便携版"
  $runtimeRoot = Join-Path $ProjectRoot "runtime"
  $nodeDir = Join-Path $runtimeRoot "node-win"
  $zipPath = Join-Path $runtimeRoot "node-win-x64.zip"
  $extractDir = Join-Path $runtimeRoot "node-extract"
  New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null

  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $url = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip"
  Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing
  if (Test-Path $extractDir) {
    Remove-Item -Recurse -Force $extractDir
  }
  Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force
  $inner = Get-ChildItem $extractDir -Directory | Select-Object -First 1
  if (-not $inner) {
    throw "Node.js 解压失败。"
  }
  if (Test-Path $nodeDir) {
    Remove-Item -Recurse -Force $nodeDir
  }
  Move-Item $inner.FullName $nodeDir -Force
  return (Join-Path $nodeDir "node.exe")
}

function Get-ServerPort([string]$ServerFile) {
  $text = Get-Content $ServerFile -Raw
  if ($text -match "PORT\s*\|\|\s*(\d+)") {
    return [int]$Matches[1]
  }
  return 3000
}

function Get-PreferredLanIPv4 {
  $virtualAdapters = "vEthernet|WSL|Hyper-V|VMware|VirtualBox|ZeroTier|Tailscale|Loopback|Bluetooth"
  $wifiAdapters = "Native 802\.11|Wi-?Fi|Wireless|WLAN|无线"
  try {
    $configs = Get-NetIPConfiguration -ErrorAction Stop |
      Where-Object {
        $_.IPv4Address -and
        $_.NetAdapter.Status -eq "Up"
      }

    $candidates = foreach ($config in $configs) {
      $adapterText = "$($config.InterfaceAlias) $($config.NetAdapter.InterfaceDescription) $($config.NetAdapter.MediaType) $($config.NetAdapter.PhysicalMediaType)"
      if ($adapterText -match $virtualAdapters) {
        continue
      }
      foreach ($address in @($config.IPv4Address)) {
        $ip = $address.IPAddress
        if (-not $ip -or $ip -like "127.*" -or $ip -like "169.254.*") {
          continue
        }
        [PSCustomObject]@{
          IP = $ip
          InterfaceAlias = $config.InterfaceAlias
          IsWiFi = ($adapterText -match $wifiAdapters)
          HasGateway = [bool]$config.IPv4DefaultGateway
        }
      }
    }

    # 手机热点通过无线网卡接入。即使网线同时连接，也必须优先选择 Wi-Fi，
    # 否则小程序会拿到以太网地址，无法从热点局域网访问电脑。
    $selected = $candidates |
      Sort-Object @{ Expression = "IsWiFi"; Descending = $true },
                  @{ Expression = "HasGateway"; Descending = $true } |
      Select-Object -First 1
    if ($selected) {
      return $selected
    }
  } catch {
  }
  return $null
}

function Update-MiniProgramBaseUrl([int]$Port, [string]$HostAddress) {
  $miniRoot = Join-Path $ProjectRoot "miniprogram"
  if (-not (Test-Path $miniRoot)) {
    return
  }
  $hostName = if ([string]::IsNullOrWhiteSpace($HostAddress)) { "127.0.0.1" } else { $HostAddress }
  $baseUrl = "http://${hostName}:$Port"
  $configPath = Join-Path $miniRoot "config.js"
  $configText = "module.exports = {`r`n  API_BASE_URL: `"$baseUrl`"`r`n};`r`n"
  Write-Utf8NoBom $configPath $configText

  $apiPath = Join-Path $miniRoot "utils\api.js"
  if (Test-Path $apiPath) {
    $apiText = Get-Content $apiPath -Raw
    if (-not $apiText.Contains('../config')) {
      $apiText = [Regex]::Replace($apiText, 'const DEFAULT_BASE_URL = .*?;', "const DEFAULT_BASE_URL = `"$baseUrl`";")
      Write-Utf8NoBom $apiPath $apiText
    }
  }
}

function Find-WeChatDevToolsCli {
  $programFilesX86 = [Environment]::GetFolderPath("ProgramFilesX86")
  $programFiles = [Environment]::GetFolderPath("ProgramFiles")
  $localAppData = [Environment]::GetFolderPath("LocalApplicationData")
  $candidates = @(
    (Join-Path $programFilesX86 "Tencent\微信web开发者工具\cli.bat"),
    (Join-Path $programFiles "Tencent\微信web开发者工具\cli.bat"),
    (Join-Path $localAppData "Programs\微信开发者工具\cli.bat"),
    (Join-Path $localAppData "微信开发者工具\cli.bat")
  )
  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }
  return $null
}

Write-Host "========================================" -ForegroundColor Green
Write-Host " 数字网格员 Windows 一键启动" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$nodeExe = Resolve-NodeExecutable
Write-Host "Node.js：$(& $nodeExe -v)"

New-Item -ItemType Directory -Force -Path (Join-Path $ProjectRoot "data\runtime") | Out-Null
$configFile = Join-Path $ProjectRoot "data\runtime\hiagent-config.json"
if (-not (Test-Path $configFile)) {
  Write-Step "HiAgent 配置"
  Write-Host "直接回车使用本地模拟模式，评审演示不需要 API Key。"
  $useReal = Read-Host "是否配置 HiAgent 真实接口？[y/N]"
  if ($useReal -match "^[Yy]") {
    $endpoint = Read-Host "HiAgent 接口地址"
    $appId = Read-Host "应用 ID"
    $workflowId = Read-Host "工作流 ID"
    $apiKey = Read-Host "API Key"
    if (
      -not [string]::IsNullOrWhiteSpace($endpoint) -and
      -not [string]::IsNullOrWhiteSpace($appId) -and
      -not [string]::IsNullOrWhiteSpace($workflowId) -and
      -not [string]::IsNullOrWhiteSpace($apiKey)
    ) {
      $json = @{
        endpoint = $endpoint
        appId = $appId
        workflowId = $workflowId
        apiKey = $apiKey
      } | ConvertTo-Json
      Write-Utf8NoBom $configFile $json
      Write-Host "HiAgent 配置已保存。" -ForegroundColor Green
    }
  }
}

$port = Get-ServerPort (Join-Path $ProjectRoot "server.js")
while (Test-LocalPort $port) {
  Write-Host "端口 $port 已被占用，尝试 $($port + 1)。" -ForegroundColor Yellow
  $port += 1
}
$lanNetwork = Get-PreferredLanIPv4
$lanIp = if ($lanNetwork) { $lanNetwork.IP } else { $null }
Update-MiniProgramBaseUrl $port $lanIp
$env:PORT = "$port"

Write-Step "启动数字网格员后端"
$serverProcess = Start-Process -FilePath $nodeExe -ArgumentList "server.js" -WorkingDirectory $ProjectRoot -PassThru

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/health" -UseBasicParsing -TimeoutSec 1
    if ($response.StatusCode -eq 200) {
      $ready = $true
      break
    }
  } catch {
  }
}

if (-not $ready) {
  Write-Host "服务启动失败，请确认端口未被占用后重试。" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "数字网格员已启动：" -ForegroundColor Green
Write-Host "网页端：http://127.0.0.1:$port"
if ($lanIp) {
  Write-Host "已选网卡：$($lanNetwork.InterfaceAlias)$(if ($lanNetwork.IsWiFi) { '（Wi-Fi / 手机热点优先）' } else { '（未检测到可用 Wi-Fi，已使用有线网络）' })"
  Write-Host "局域网地址：http://${lanIp}:$port"
  Write-Host "小程序真机后端：http://${lanIp}:$port"
} else {
  Write-Host "未检测到可用的局域网 IPv4，请先让电脑连接手机热点后重试。" -ForegroundColor Red
}
Write-Host "管理员账号：admin / admin123"
Write-Host "网格员账号：hualin01 / 123456"

Start-Process "http://127.0.0.1:$port"

Write-Step "打开微信小程序项目"
$wechatCli = Find-WeChatDevToolsCli
if ($wechatCli) {
  Start-Process -FilePath $wechatCli -ArgumentList @("open", "--project", $ProjectRoot)
  Write-Host "已请求微信开发者工具打开项目。" -ForegroundColor Green
} else {
  Write-Host "未检测到微信开发者工具，已打开官方下载页面。" -ForegroundColor Yellow
  Start-Process "https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html"
}

Write-Host ""
Write-Host "后端已在新窗口运行，关闭该 Node.js 窗口即可停止服务。" -ForegroundColor Yellow
