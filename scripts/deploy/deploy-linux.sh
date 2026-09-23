#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "========================================"
echo "数字网格员一键部署（Linux）"
echo "========================================"

PORT_DEFAULT=3000
if grep -q "PORT || 3100" server.js 2>/dev/null; then
  PORT_DEFAULT=3100
fi
PORT="${PORT:-$PORT_DEFAULT}"

if ! command -v node >/dev/null 2>&1; then
  echo "未检测到 Node.js，尝试通过系统包管理器安装..."
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y nodejs npm
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y nodejs npm
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y nodejs npm
  else
    echo "请先安装 Node.js 18 或更高版本：https://nodejs.org/"
    exit 1
  fi
fi

echo "Node.js 版本：$(node -v)"
mkdir -p data/runtime

CONFIG_FILE="data/runtime/hiagent-config.json"
if [ ! -f "$CONFIG_FILE" ]; then
  echo ""
  echo "首次运行需要配置 HiAgent："
  read -r -p "HiAgent 接口地址: " ENDPOINT
  read -r -p "应用 ID: " APP_ID
  read -r -p "工作流 ID: " WORKFLOW_ID
  read -r -p "API Key: " API_KEY
  if [ -z "$ENDPOINT" ] || [ -z "$APP_ID" ] || [ -z "$WORKFLOW_ID" ] || [ -z "$API_KEY" ]; then
    echo "真实接口模式的配置项不能为空"
    exit 1
  fi
  node -e '
    const fs = require("fs");
    const config = {
      endpoint: process.argv[1],
      appId: process.argv[2],
      workflowId: process.argv[3],
      apiKey: process.argv[4]
    };
    fs.writeFileSync("data/runtime/hiagent-config.json", JSON.stringify(config, null, 2));
  ' "$ENDPOINT" "$APP_ID" "$WORKFLOW_ID" "$API_KEY"
  echo "HiAgent 配置已写入 $CONFIG_FILE"
else
  echo "已检测到 HiAgent 配置：$CONFIG_FILE"
fi

ENV_FILE="data/runtime/env.json"
if [ ! -f "$ENV_FILE" ]; then
  read -r -p "是否需要配置微信 AppID/AppSecret？[y/N]: " NEED_WECHAT
  if [ "$(printf '%s' "$NEED_WECHAT" | tr '[:upper:]' '[:lower:]')" = "y" ]; then
    read -r -p "微信小程序 AppID: " WECHAT_APP_ID
    read -r -p "微信小程序 AppSecret: " WECHAT_APP_SECRET
    node -e '
      const fs = require("fs");
      fs.writeFileSync(
        "data/runtime/env.json",
        JSON.stringify({ WECHAT_APP_ID: process.argv[1], WECHAT_APP_SECRET: process.argv[2] }, null, 2)
      );
    ' "$WECHAT_APP_ID" "$WECHAT_APP_SECRET"
    echo "微信配置已写入 $ENV_FILE"
  fi
fi

if [ -f "$ENV_FILE" ]; then
  export WECHAT_APP_ID
  export WECHAT_APP_SECRET
  WECHAT_APP_ID=$(node -p "require('./data/runtime/env.json').WECHAT_APP_ID || ''")
  WECHAT_APP_SECRET=$(node -p "require('./data/runtime/env.json').WECHAT_APP_SECRET || ''")
fi

LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")
echo ""
echo "启动地址：http://127.0.0.1:${PORT}"
echo "局域网地址：http://${LAN_IP}:${PORT}"
echo "按 Ctrl+C 停止服务"
echo ""

export PORT
exec node server.js
