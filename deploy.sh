#!/usr/bin/env bash
# ============================================================
# 打地鼠游戏 - 腾讯轻量服务器一键部署脚本
# 用法: bash deploy.sh   （自动使用 sudo，兼容 root/普通用户、Ubuntu/CentOS）
# 环境变量: APP_DIR 可自定义安装目录（默认 /opt/dadishu）
# ============================================================
set -e

APP_DIR="${APP_DIR:-/opt/dadishu}"

# ---- sudo 前缀（非 root 自动加 sudo） ----
SUDO=""
if [ "$(id -u)" != "0" ]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    echo "错误：需要 root 或 sudo 权限"
    exit 1
  fi
fi

echo "========== 1. 检测系统环境 =========="
if [ -f /etc/os-release ]; then
  . /etc/os-release
  echo "系统: $PRETTY_NAME  (id=$ID)"
  OS_ID=$ID
else
  OS_ID=unknown
fi

echo "========== 2. 安装 Node.js 20（如缺失） =========="
if ! command -v node >/dev/null 2>&1; then
  if [ "$OS_ID" = "ubuntu" ] || [ "$OS_ID" = "debian" ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO bash -
    $SUDO apt-get install -y nodejs
  else
    curl -fsSL https://rpm.nodesource.com/setup_20.x | $SUDO bash -
    $SUDO yum install -y nodejs || $SUDO dnf install -y nodejs
  fi
fi
echo "Node: $(node -v)  npm: $(npm -v)"

echo "========== 3. 安装 PM2 =========="
if ! command -v pm2 >/dev/null 2>&1; then
  $SUDO npm install -g pm2 --registry=https://registry.npmmirror.com
fi
echo "PM2: $(pm2 -v)"

echo "========== 4. 准备代码 =========="
mkdir -p "$APP_DIR"
cd "$APP_DIR"
if [ ! -f "$APP_DIR/server.js" ]; then
  if [ ! -d "$APP_DIR/.git" ]; then
    echo "[提示] 未检测到代码，尝试从 GitHub 克隆..."
    git clone --depth 1 https://github.com/kangliguo2026/dadishu.git /tmp/dadishu_repo 2>/dev/null \
      && cp -r /tmp/dadishu_repo/. "$APP_DIR/" \
      || { echo "[提示] GitHub 克隆失败，请先将项目文件上传到 $APP_DIR 后重新执行本脚本"; exit 1; }
  else
    git pull 2>/dev/null || true
  fi
fi

echo "========== 5. 安装依赖（国内镜像） =========="
# better-sqlite3 原生模块走 npmmirror 预编译二进制镜像
export npm_config_better_sqlite3_binary_host=https://npmmirror.com/mirrors/better-sqlite3
npm install --production --registry=https://registry.npmmirror.com

echo "========== 6. 启动服务（PM2） =========="
pm2 delete dadishu >/dev/null 2>&1 || true
pm2 start ecosystem.config.js
pm2 save
# 开机自启（尽力而为，无 sudo 权限时跳过）
$SUDO -n pm2 startup systemd -u "$(whoami)" --hp "$HOME" >/dev/null 2>&1 || true

echo "========== 7. 部署完成 =========="
echo "访问地址: http://<服务器公网IP>:3001 （请在腾讯云控制台放行 TCP 3001 端口）"
pm2 list
