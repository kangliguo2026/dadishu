/**
 * 打地鼠游戏后端服务
 * Express + SQLite + JWT 认证
 */
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// JWT 密钥：优先读环境变量，否则用随机值（重启后旧 token 失效）
const JWT_SECRET =
  process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ---------------- 认证中间件 ---------------- */
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: '未登录，请先登录' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

/* ---------------- 接口 ---------------- */

// 注册
app.post('/api/register', (req, res) => {
  const username = String((req.body && req.body.username) || '').trim();
  const password = String((req.body && req.body.password) || '');
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  if (username.length < 2 || username.length > 20) {
    return res.status(400).json({ error: '用户名长度需在 2-20 个字符之间' });
  }
  if (!/^[\w\u4e00-\u9fa5]+$/.test(username)) {
    return res.status(400).json({ error: '用户名只能包含中英文、数字和下划线' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码长度至少 6 位' });
  }
  if (password.length > 64) {
    return res.status(400).json({ error: '密码长度不能超过 64 位' });
  }
  if (db.getUserByName(username)) {
    return res.status(409).json({ error: '用户名已被注册' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const user = db.createUser(username, hash);
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '7d',
  });
  res.json({ token, user: { id: user.id, username: user.username } });
});

// 登录
app.post('/api/login', (req, res) => {
  const username = String((req.body && req.body.username) || '').trim();
  const password = String((req.body && req.body.password) || '');
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  const user = db.getUserByName(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '7d',
  });
  res.json({ token, user: { id: user.id, username: user.username } });
});

// 当前登录用户信息
app.get('/api/me', auth, (req, res) => {
  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ user: { id: user.id, username: user.username } });
});

// 保存一局成绩
app.post('/api/scores', auth, (req, res) => {
  const score = Number(req.body && req.body.score);
  const difficulty = String((req.body && req.body.difficulty) || '简单').slice(0, 20);
  if (!Number.isFinite(score) || score < 0 || score > 100000) {
    return res.status(400).json({ error: '成绩无效' });
  }
  db.createScore(req.user.id, Math.floor(score), difficulty);
  res.json({ ok: true });
});

// 我的历史成绩
app.get('/api/scores/mine', auth, (req, res) => {
  res.json({ scores: db.getScoresByUser(req.user.id, 20) });
});

// 排行榜（按各用户最高分）
app.get('/api/leaderboard', (req, res) => {
  res.json({ board: db.getLeaderboard(10) });
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.listen(PORT, HOST, () => {
  console.log(`🐹 打地鼠游戏已启动: http://${HOST}:${PORT}`);
});
