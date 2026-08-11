#!/usr/bin/env bash
# ============================================================
# 打地鼠游戏 - 腾讯轻量服务器一键部署脚本
# 用法: bash deploy.sh    （需 root 或 sudo 权限，兼容 Ubuntu/CentOS）
# ============================================================
set -e

echo "========== 1. 检测系统环境 =========="
if [ -f /etc/os-release ]; then
  . /etc/os-release
  echo "系统: $PRETTY_NAME"
  OS_ID=$ID
else
  OS_ID=unknown
  echo "无法识别系统类型"
fi

echo "========== 2. 安装 Node.js 20（如缺失） =========="
if ! command -v node >/dev/null 2>&1; then
  if [ "$OS_ID" = "ubuntu" ] || [ "$OS_ID" = "debian" ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  else
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs || dnf install -y nodejs
  fi
fi
echo "Node: $(node -v)  npm: $(npm -v)"

echo "========== 3. 安装 PM2 =========="
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2 --registry=https://registry.npmmirror.com
fi
echo "PM2: $(pm2 -v)"

echo "========== 4. 拉取代码 =========="
APP_DIR=/opt/dadishu
if [ ! -d "$APP_DIR/.git" ]; then
  mkdir -p /opt
  git clone https://github.com/kangliguo2026/dadishu.git "$APP_DIR" 2>/dev/null \
    || { echo "[提示] GitHub 克隆失败，请将项目上传到 $APP_DIR 后重新执行本脚本"; exit 1; }
fi
cd "$APP_DIR"
git pull 2>/dev/null || true

echo "========== 5. 安装依赖（使用国内镜像） =========="
# better-sqlite3 原生模块走 npmmirror 预编译二进制镜像
export npm_config_better_sqlite3_binary_host=https://npmmirror.com/mirrors/better-sqlite3
npm install --production --registry=https://registry.npmmirror.com

echo "========== 6. 启动服务（PM2） =========="
pm2 delete dadishu >/dev/null 2>&1 || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup 2>/dev/null || true

echo "========== 7. 部署完成 =========="
echo "访问地址: http://<服务器公网IP>:3000"
echo "服务状态:"
pm2 list
