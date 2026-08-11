# 🚀 部署文档：腾讯轻量服务器

本文档介绍如何将打地鼠游戏部署到腾讯云轻量应用服务器（Lighthouse）。

## 方式一：一键脚本部署（推荐）

将 `deploy.sh` 上传到服务器（或通过 git 克隆到服务器），然后执行：

```bash
bash deploy.sh
```

脚本会自动完成：检测系统 → 安装 Node.js 20 → 安装 PM2 → 拉取代码 → 安装依赖（国内镜像）→ 启动服务 → 开机自启。

## 方式二：手动部署

```bash
# 1. 安装 Node.js 20（Ubuntu/Debian）
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 2. 安装 PM2
npm install -g pm2 --registry=https://registry.npmmirror.com

# 3. 拉取代码
git clone https://github.com/kangliguo2026/dadishu.git /opt/dadishu
cd /opt/dadishu

# 4. 安装依赖（国内镜像加速）
export npm_config_better_sqlite3_binary_host=https://npmmirror.com/mirrors/better-sqlite3
npm install --production --registry=https://registry.npmmirror.com

# 5. 启动并设置开机自启
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 3. 防火墙 / 安全组放行

在腾讯云控制台（轻量服务器 → 防火墙）放行 **TCP 3000** 端口，然后通过浏览器访问：

```
http://<服务器公网IP>:3000
```

## 4. 常用运维命令

```bash
pm2 status            # 查看服务状态
pm2 logs dadishu      # 查看日志
pm2 restart dadishu   # 重启服务
pm2 stop dadishu      # 停止服务
```

## 5. 环境变量（可选）

| 变量 | 说明 |
| --- | --- |
| `PORT` | 服务端口（默认 3000） |
| `JWT_SECRET` | JWT 签名密钥（生产建议设置） |

可在 `ecosystem.config.js` 的 `env` 中修改，或：

```bash
pm2 env dadishu JWT_SECRET 你的密钥
pm2 restart dadishu
```

## 6. 建议：nginx 反向代理 + HTTPS（可选）

将服务通过 80 端口对外并提供 HTTPS：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
