$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "========================================"

function Get-PreferredLanIPv4 {
  $virtualAdapters = "vEthernet|WSL|Hyper-V|VMware|VirtualBox|ZeroTier|Tailscale|Loopback|Bluetooth"
  $wifiAdapters = "Native 802\.11|Wi-?Fi|Wireless|WLAN|无线"
  try {
    $candidates = foreach ($config in (Get-NetIPConfiguration -ErrorAction Stop)) {
      if (-not $config.IPv4Address -or $config.NetAdapter.Status -ne "Up") {
        continue
      }
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

    return $candidates |
      Sort-Object @{ Expression = "IsWiFi"; Descending = $true },
                  @{ Expression = "HasGateway"; Descending = $true } |
      Select-Object -First 1
  } catch {
    return $null
  }
}

function Update-MiniProgramBaseUrl([int]$Port, [string]$HostAddress) {
  if ([string]::IsNullOrWhiteSpace($HostAddress)) {
    return
  }
  $configPath = Join-Path $PSScriptRoot "miniprogram\config.js"
  if (-not (Test-Path $configPath)) {
    return
  }
  $baseUrl = "http://${HostAddress}:$Port"
  $configText = "module.exports = {`r`n  API_BASE_URL: `"$baseUrl`"`r`n};`r`n"
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($configPath, $configText, $encoding)
  Write-Host "已同步小程序后端地址：$baseUrl"
}
Write-Host "数字网格员一键部署（Windows）"
Write-Host "========================================"

$PortDefault = 3000
if (Select-String -Path server.js -Pattern "PORT \|\| 3100" -Quiet) {
  $PortDefault = 3100
}
$Port = if ($env:PORT) { $env:PORT } else { $PortDefault }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "未检测到 Node.js，尝试通过 winget 安装..."
  winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  Write-Host "请重新打开 PowerShell 后再次运行本脚本。"
  exit 1
}

Write-Host "Node.js 版本：$(node -v)"
New-Item -ItemType Directory -Force -Path data\runtime | Out-Null

$ConfigFile = "data\runtime\hiagent-config.json"
if (-not (Test-Path $ConfigFile)) {
  Write-Host ""
  Write-Host "首次运行需要配置 HiAgent："
  $Endpoint = Read-Host "接口地址 [http://14.103.118.162:32300/api/proxy/api/v1]"
  if ([string]::IsNullOrWhiteSpace($Endpoint)) {
    $Endpoint = "http://14.103.118.162:32300/api/proxy/api/v1"
  }
  $AppId = Read-Host "应用 ID [personal-d9fih1mmreq4ugfv7o5g]"
  if ([string]::IsNullOrWhiteSpace($AppId)) {
    $AppId = "personal-d9fih1mmreq4ugfv7o5g"
  }
  $WorkflowId = Read-Host "工作流 ID [d9mr3rhb9rsa732g1ajg]"
  if ([string]::IsNullOrWhiteSpace($WorkflowId)) {
    $WorkflowId = "d9mr3rhb9rsa732g1ajg"
  }
  $ApiKey = Read-Host "API Key"
  if ([string]::IsNullOrWhiteSpace($ApiKey)) {
    Write-Host "API Key 不能为空"
    exit 1
  }
  $Config = @{
    endpoint = $Endpoint
    appId = $AppId
    workflowId = $WorkflowId
    apiKey = $ApiKey
  }
  $Config | ConvertTo-Json | Set-Content -Path $ConfigFile -Encoding UTF8
  Write-Host "HiAgent 配置已写入 $ConfigFile"
} else {
  Write-Host "已检测到 HiAgent 配置：$ConfigFile"
}

$EnvFile = "data\runtime\env.json"
if (-not (Test-Path $EnvFile)) {
  $NeedWechat = Read-Host "是否需要配置微信 AppID/AppSecret？[y/N]"
  if ($NeedWechat.ToLower() -eq "y") {
    $WechatAppId = Read-Host "微信小程序 AppID"
    $WechatAppSecret = Read-Host "微信小程序 AppSecret"
    $WechatEnv = @{
      WECHAT_APP_ID = $WechatAppId
      WECHAT_APP_SECRET = $WechatAppSecret
    }
    $WechatEnv | ConvertTo-Json | Set-Content -Path $EnvFile -Encoding UTF8
    Write-Host "微信配置已写入 $EnvFile"
  }
}

if (Test-Path $EnvFile) {
  $EnvJson = Get-Content $EnvFile -Raw | ConvertFrom-Json
  $env:WECHAT_APP_ID = $EnvJson.WECHAT_APP_ID
  $env:WECHAT_APP_SECRET = $EnvJson.WECHAT_APP_SECRET
}

$env:PORT = $Port
$LanNetwork = Get-PreferredLanIPv4
if ($LanNetwork) {
  Update-MiniProgramBaseUrl $Port $LanNetwork.IP
}

$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($IsAdmin) {
  netsh advfirewall firewall add rule name="DigitalGridWorker" dir=in action=allow protocol=TCP localport=$Port | Out-Null
  Write-Host "已添加防火墙放行规则：TCP $Port"
}

Write-Host ""
Write-Host "启动地址：http://127.0.0.1:$Port"
if ($LanNetwork) {
  Write-Host "已选网卡：$($LanNetwork.InterfaceAlias)$(if ($LanNetwork.IsWiFi) { '（Wi-Fi / 手机热点优先）' } else { '（未检测到可用 Wi-Fi，已使用有线网络）' })"
  Write-Host "局域网地址：http://$($LanNetwork.IP):$Port"
  Write-Host "请在微信小程序中使用此地址。"
} else {
  Write-Host "未检测到可用的局域网 IPv4，请先让电脑连接手机热点后重试。" -ForegroundColor Red
}
Write-Host "按 Ctrl+C 停止服务"
Write-Host ""

node server.js
