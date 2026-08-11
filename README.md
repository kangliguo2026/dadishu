# 🐹 打地鼠游戏

带注册登录功能的 Web 打地鼠小游戏，含完整前后端。

## ✨ 功能

- ✅ 注册 / 登录（JWT Token 认证，密码 bcrypt 加密存储）
- ✅ 3x3 打地鼠游戏：三种难度（简单 / 中等 / 困难），每局 60 秒
- ✅ 得分、连击特效、音效（WebAudio 合成，无需音频文件）
- ✅ 排行榜 Top10（按个人最高分）
- ✅ 个人历史战绩查询
- ✅ 移动端适配

## 🛠 技术栈

| 端 | 技术 |
| --- | --- |
| 前端 | 原生 HTML + CSS + JavaScript（无框架依赖） |
| 后端 | Node.js + Express |
| 数据库 | SQLite（better-sqlite3，不可用时自动回退 JSON 文件） |
| 认证 | JWT + bcryptjs |

## 📁 目录结构

```
dadishu/
├── server.js              # 后端入口（Express）
├── db.js                  # 数据存储层（SQLite / JSON 回退）
├── ecosystem.config.js    # PM2 配置
├── package.json
└── public/                # 前端静态资源
    ├── index.html         # 登录 / 注册页
    ├── game.html          # 游戏页
    ├── css/style.css
    └── js/
        ├── auth.js        # 认证工具 + 地鼠 SVG + 音效
        └── game.js        # 游戏核心逻辑
```

## 🚀 本地运行

```bash
npm install
npm start
# 打开 http://localhost:3000
```

## 📡 API 接口

| 方法 | 路径 | 说明 | 鉴权 |
| --- | --- | --- | --- |
| POST | /api/register | 注册 `{username, password}` | 否 |
| POST | /api/login | 登录 `{username, password}`，返回 token | 否 |
| GET | /api/me | 当前用户信息 | 是 |
| POST | /api/scores | 保存成绩 `{score, difficulty}` | 是 |
| GET | /api/scores/mine | 我的历史成绩 | 是 |
| GET | /api/leaderboard | 排行榜 Top10 | 否 |
| GET | /api/health | 健康检查 | 否 |

## 🖥 服务器部署（PM2）

```bash
# 1. 安装 Node.js 18+（略）
# 2. 拉取代码
git clone <你的仓库地址> dadishu && cd dadishu
# 3. 安装依赖并启动
npm install --production
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save && pm2 startup   # 开机自启
# 4. 放行安全组 / 防火墙的 3000 端口
```

## ⚙️ 环境变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| PORT | 服务端口 | 3000 |
| JWT_SECRET | JWT 签名密钥（生产环境务必设置） | 随机生成 |

> 生产环境建议设置 `JWT_SECRET` 环境变量，并使用 nginx 反向代理 + HTTPS。
