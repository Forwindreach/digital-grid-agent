#!/bin/bash

# macOS 可双击的数字网格员启动器。
# 会自动准备 Node.js、选择可用端口、更新小程序 API 地址，
# 然后启动后端并打开网页端和微信开发者工具。

set -u

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT" || exit 1

# 从 Finder 双击 .command 时 PATH 通常比 Terminal 中短。
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

SERVER_PID=""
NODE_EXE=""

print_step() {
  printf '\n\033[36m==> %s\033[0m\n' "$1"
}

pause_on_error() {
  local exit_code="${1:-1}"
  printf '\n\033[31m启动失败（错误码 %s）。\033[0m\n' "$exit_code"
  printf '按回车键关闭窗口……'
  read -r _
  exit "$exit_code"
}

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    printf '\n正在停止数字网格员后端……\n'
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

resolve_node() {
  local portable_node="$PROJECT_ROOT/runtime/node-mac/bin/node"
  if [ -x "$portable_node" ]; then
    NODE_EXE="$portable_node"
    return 0
  fi

  if command -v node >/dev/null 2>&1; then
    NODE_EXE="$(command -v node)"
    return 0
  fi

  print_step "未检测到 Node.js，正在下载 macOS 便携版"
  local machine
  local node_arch
  machine="$(uname -m)"
  case "$machine" in
    arm64) node_arch="arm64" ;;
    x86_64) node_arch="x64" ;;
    *)
      printf '暂不支持的 Mac 处理器架构：%s\n' "$machine"
      return 1
      ;;
  esac

  local node_version="20.18.0"
  local runtime_root="$PROJECT_ROOT/runtime"
  local archive="$runtime_root/node-v${node_version}-darwin-${node_arch}.tar.gz"
  local extract_dir="$runtime_root/node-mac-extract"
  local node_dir="$runtime_root/node-mac"
  local download_url="https://nodejs.org/dist/v${node_version}/node-v${node_version}-darwin-${node_arch}.tar.gz"

  mkdir -p "$runtime_root" || return 1
  curl --fail --location --progress-bar "$download_url" --output "$archive" || return 1

  # 删除范围只限于本项目 runtime 内的两个固定目录。
  [ ! -e "$extract_dir" ] || rm -rf "$extract_dir"
  [ ! -e "$node_dir" ] || rm -rf "$node_dir"
  mkdir -p "$extract_dir" "$node_dir" || return 1
  tar -xzf "$archive" -C "$extract_dir" || return 1
  local extracted="$extract_dir/node-v${node_version}-darwin-${node_arch}"
  [ -d "$extracted" ] || return 1
  mv "$extracted"/* "$node_dir"/ || return 1
  rm -f "$archive"
  rm -rf "$extract_dir"

  NODE_EXE="$portable_node"
  [ -x "$NODE_EXE" ]
}

get_server_port() {
  local detected
  detected="$(sed -nE 's/.*PORT[[:space:]]*\|\|[[:space:]]*([0-9]+).*/\1/p' server.js | head -n 1)"
  printf '%s' "${PORT:-${detected:-3000}}"
}

port_is_busy() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN 2>/dev/null | grep -q LISTEN
}

get_lan_ip() {
  local interface_name=""
  local address=""

  interface_name="$(route -n get default 2>/dev/null | awk '/interface:/{print $2; exit}')"
  if [ -n "$interface_name" ]; then
    address="$(ipconfig getifaddr "$interface_name" 2>/dev/null || true)"
  fi
  if [ -z "$address" ]; then
    address="$(ipconfig getifaddr en0 2>/dev/null || true)"
  fi
  if [ -z "$address" ]; then
    address="$(ipconfig getifaddr en1 2>/dev/null || true)"
  fi
  printf '%s' "$address"
}

update_miniprogram_base_url() {
  local base_url="$1"
  local config_path="$PROJECT_ROOT/miniprogram/config.js"
  [ -d "$PROJECT_ROOT/miniprogram" ] || return 0
  printf 'module.exports = {\n  API_BASE_URL: "%s"\n};\n' "$base_url" > "$config_path"
}

find_wechat_cli() {
  local candidate
  for candidate in \
    "/Applications/wechatwebdevtools.app/Contents/MacOS/cli" \
    "/Applications/微信开发者工具.app/Contents/MacOS/cli" \
    "$HOME/Applications/wechatwebdevtools.app/Contents/MacOS/cli" \
    "$HOME/Applications/微信开发者工具.app/Contents/MacOS/cli"; do
    if [ -x "$candidate" ]; then
      printf '%s' "$candidate"
      return 0
    fi
  done
  return 1
}

printf '\033[32m========================================\n'
printf ' 数字网格员 macOS 一键启动\n'
printf '========================================\033[0m\n'

resolve_node || pause_on_error 1

NODE_MAJOR="$($NODE_EXE -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || printf '0')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  printf 'Node.js 版本过低，需要 18 或更高版本。\n'
  pause_on_error 1
fi
printf 'Node.js：%s\n' "$($NODE_EXE -v)"

mkdir -p "$PROJECT_ROOT/data/runtime" || pause_on_error 1

CONFIG_FILE="$PROJECT_ROOT/data/runtime/hiagent-config.json"
if [ ! -f "$CONFIG_FILE" ]; then
  print_step "HiAgent 配置"
  printf '直接回车使用本地模拟模式，评审演示不需要 API Key。\n'
  printf '是否配置 HiAgent 真实接口？[y/N] '
  read -r USE_REAL
  if [[ "$USE_REAL" =~ ^[Yy]$ ]]; then
    printf '接口地址 [http://14.103.118.162:32300/api/proxy/api/v1]: '
    read -r ENDPOINT
    ENDPOINT="${ENDPOINT:-http://14.103.118.162:32300/api/proxy/api/v1}"
    printf '应用 ID [personal-d9fih1mmreq4ugfv7o5g]: '
    read -r APP_ID
    APP_ID="${APP_ID:-personal-d9fih1mmreq4ugfv7o5g}"
    printf '工作流 ID [d9mr3rhb9rsa732g1ajg]: '
    read -r WORKFLOW_ID
    WORKFLOW_ID="${WORKFLOW_ID:-d9mr3rhb9rsa732g1ajg}"
    printf 'API Key: '
    stty -echo 2>/dev/null || true
    read -r API_KEY
    stty echo 2>/dev/null || true
    printf '\n'
    if [ -n "$API_KEY" ]; then
      "$NODE_EXE" -e '
        const fs = require("fs");
        const config = {
          endpoint: process.argv[1],
          appId: process.argv[2],
          workflowId: process.argv[3],
          apiKey: process.argv[4]
        };
        fs.writeFileSync(process.argv[5], JSON.stringify(config, null, 2));
      ' "$ENDPOINT" "$APP_ID" "$WORKFLOW_ID" "$API_KEY" "$CONFIG_FILE" || pause_on_error 1
      printf '\033[32mHiAgent 配置已保存。\033[0m\n'
    else
      printf '未输入 API Key，将使用本地模拟模式。\n'
    fi
  fi
fi

ENV_FILE="$PROJECT_ROOT/data/runtime/env.json"
if [ -f "$ENV_FILE" ]; then
  export WECHAT_APP_ID
  export WECHAT_APP_SECRET
  WECHAT_APP_ID="$($NODE_EXE -p "require(process.argv[1]).WECHAT_APP_ID || ''" "$ENV_FILE")"
  WECHAT_APP_SECRET="$($NODE_EXE -p "require(process.argv[1]).WECHAT_APP_SECRET || ''" "$ENV_FILE")"
fi

PORT_NUMBER="$(get_server_port)"
while port_is_busy "$PORT_NUMBER"; do
  printf '\033[33m端口 %s 已被占用，尝试 %s。\033[0m\n' "$PORT_NUMBER" "$((PORT_NUMBER + 1))"
  PORT_NUMBER=$((PORT_NUMBER + 1))
done

LAN_IP="$(get_lan_ip)"
if [ -n "$LAN_IP" ]; then
  MINI_BASE_URL="http://${LAN_IP}:${PORT_NUMBER}"
else
  MINI_BASE_URL="http://127.0.0.1:${PORT_NUMBER}"
fi
update_miniprogram_base_url "$MINI_BASE_URL" || pause_on_error 1

print_step "启动数字网格员后端"
PORT="$PORT_NUMBER" "$NODE_EXE" server.js &
SERVER_PID=$!

READY=0
ATTEMPT=0
while [ "$ATTEMPT" -lt 30 ]; do
  sleep 0.5
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    break
  fi
  if curl --silent --fail --max-time 1 "http://127.0.0.1:${PORT_NUMBER}/api/health" >/dev/null 2>&1; then
    READY=1
    break
  fi
  ATTEMPT=$((ATTEMPT + 1))
done

if [ "$READY" -ne 1 ]; then
  printf '\033[31m服务启动失败，请查看上方错误信息。\033[0m\n'
  pause_on_error 1
fi

printf '\n\033[32m数字网格员已启动：\033[0m\n'
printf '网页端：http://127.0.0.1:%s\n' "$PORT_NUMBER"
if [ -n "$LAN_IP" ]; then
  printf '局域网地址：http://%s:%s\n' "$LAN_IP" "$PORT_NUMBER"
  printf '\033[33m小程序真机后端：http://%s:%s\033[0m\n' "$LAN_IP" "$PORT_NUMBER"
else
  printf '\033[33m未检测到局域网 IP，真机测试前请先连接 Wi-Fi 或手机热点。\033[0m\n'
fi
printf '管理员账号：admin / admin123\n'
printf '网格员账号：hualin01 / 123456\n'

if [ "${DGW_NO_OPEN:-0}" != "1" ]; then
  open "http://127.0.0.1:${PORT_NUMBER}" >/dev/null 2>&1 || true

  WECHAT_CLI="$(find_wechat_cli || true)"
  if [ -n "$WECHAT_CLI" ]; then
    print_step "打开微信小程序项目"
    "$WECHAT_CLI" open --project "$PROJECT_ROOT" >/dev/null 2>&1 &
    printf '\033[32m已请求微信开发者工具打开项目。\033[0m\n'
  else
    printf '\033[33m未检测到微信开发者工具，已打开官方下载页。\033[0m\n'
    open "https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html" >/dev/null 2>&1 || true
  fi
fi

printf '\n\033[33m请保持此窗口运行；关闭窗口或按 Control+C 可停止后端。\033[0m\n\n'

if [ "${DGW_EXIT_AFTER_READY:-0}" = "1" ]; then
  exit 0
fi

wait "$SERVER_PID"
SERVER_STATUS=$?
SERVER_PID=""
if [ "$SERVER_STATUS" -ne 0 ]; then
  pause_on_error "$SERVER_STATUS"
fi

printf '\n后端已停止。按回车键关闭窗口……'
read -r _
