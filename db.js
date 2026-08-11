/**
 * 数据存储层
 * 优先使用 better-sqlite3（SQLite 数据库文件），
 * 若该原生模块在当前环境不可用，则自动回退到 JSON 文件存储。
 */
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let betterSqlite = null;
try {
  betterSqlite = require('better-sqlite3');
} catch (e) {
  console.warn('[db] better-sqlite3 不可用，自动回退到 JSON 文件存储:', e.message);
}

if (betterSqlite) {
  const db = new betterSqlite(path.join(DATA_DIR, 'dadishu.db'));
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS scores (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      score      INTEGER NOT NULL,
      difficulty TEXT DEFAULT '简单',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const stmts = {
    userByName: db.prepare('SELECT * FROM users WHERE username = ?'),
    userById: db.prepare('SELECT * FROM users WHERE id = ?'),
    insertUser: db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)'),
    insertScore: db.prepare('INSERT INTO scores (user_id, score, difficulty) VALUES (?, ?, ?)'),
    scoresByUser: db.prepare(
      'SELECT score, difficulty, created_at FROM scores WHERE user_id = ? ORDER BY score DESC, id DESC LIMIT ?'
    ),
    leaderboard: db.prepare(`
      SELECT u.username, MAX(s.score) AS best, s.difficulty, MAX(s.created_at) AS updated_at
      FROM scores s
      JOIN users u ON u.id = s.user_id
      GROUP BY u.id
      ORDER BY best DESC, updated_at ASC
      LIMIT ?
    `),
  };

  module.exports = {
    getUserByName: (name) => stmts.userByName.get(name),
    getUserById: (id) => stmts.userById.get(id),
    createUser: (name, hash) => {
      const info = stmts.insertUser.run(name, hash);
      return { id: Number(info.lastInsertRowid), username: name };
    },
    createScore: (userId, score, difficulty) => {
      stmts.insertScore.run(userId, score, difficulty);
    },
    getScoresByUser: (userId, limit) => stmts.scoresByUser.all(userId, limit),
    getLeaderboard: (limit) => stmts.leaderboard.all(limit),
  };
} else {
  /* ---------------- JSON 文件回退实现 ---------------- */
  const usersFile = path.join(DATA_DIR, 'users.json');
  const scoresFile = path.join(DATA_DIR, 'scores.json');

  function readJson(file, fallback) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return fallback;
    }
  }
  function writeJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  }

  module.exports = {
    getUserByName: (name) => {
      const users = readJson(usersFile, []);
      return users.find((u) => u.username === name);
    },
    getUserById: (id) => {
      const users = readJson(usersFile, []);
      return users.find((u) => u.id === id);
    },
    createUser: (name, hash) => {
      const users = readJson(usersFile, []);
      const id = users.length ? users[users.length - 1].id + 1 : 1;
      users.push({ id, username: name, password_hash: hash, created_at: new Date().toISOString() });
      writeJson(usersFile, users);
      return { id, username: name };
    },
    createScore: (userId, score, difficulty) => {
      const scores = readJson(scoresFile, []);
      scores.push({ id: Date.now(), user_id: userId, score, difficulty, created_at: new Date().toISOString() });
      writeJson(scoresFile, scores);
    },
    getScoresByUser: (userId, limit) => {
      const scores = readJson(scoresFile, []);
      return scores
        .filter((s) => s.user_id === userId)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((s) => ({ score: s.score, difficulty: s.difficulty, created_at: s.created_at }));
    },
    getLeaderboard: (limit) => {
      const users = readJson(usersFile, []);
      const scores = readJson(scoresFile, []);
      const map = {};
      for (const s of scores) {
        const u = users.find((x) => x.id === s.user_id);
        if (!u) continue;
        if (!map[u.id] || s.score > map[u.id].best) {
          map[u.id] = { username: u.username, best: s.score, difficulty: s.difficulty, updated_at: s.created_at };
        }
      }
      return Object.values(map)
        .sort((a, b) => b.best - a.best)
        .slice(0, limit);
    },
  };
}
