/* 认证与 API 公共工具 */
const API_BASE = '/api';

function setToken(t) { localStorage.setItem('dadishu_token', t); }
function getToken() { return localStorage.getItem('dadishu_token') || ''; }
function clearToken() { localStorage.removeItem('dadishu_token'); }
function setUser(u) { localStorage.setItem('dadishu_user', JSON.stringify(u)); }
function getUser() {
  try { return JSON.parse(localStorage.getItem('dadishu_user') || 'null'); } catch { return null; }
}
function logout() {
  clearToken();
  localStorage.removeItem('dadishu_user');
  window.location.href = '/';
}

async function api(path, options = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
  let data = {};
  try { data = await res.json(); } catch (e) { /* 忽略解析失败 */ }
  if (!res.ok) {
    const err = new Error(data.error || '请求失败，请稍后再试');
    err.status = res.status;
    throw err;
  }
  return data;
}

/* 地鼠 SVG 组件 */
const MOLE_SVG = `
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <!-- 耳朵 -->
  <circle cx="34" cy="46" r="13" fill="#8a5a35"/>
  <circle cx="86" cy="46" r="13" fill="#8a5a35"/>
  <circle cx="34" cy="46" r="6.5" fill="#f0b8a0"/>
  <circle cx="86" cy="46" r="6.5" fill="#f0b8a0"/>
  <!-- 身体 -->
  <path d="M20 120 Q18 78 38 62 Q48 30 60 30 Q72 30 82 62 Q102 78 100 120 Z" fill="#a06a44"/>
  <!-- 肚皮 -->
  <ellipse cx="60" cy="104" rx="34" ry="20" fill="#d9a06b"/>
  <!-- 眼睛 -->
  <ellipse cx="46" cy="56" rx="7" ry="8.5" fill="#2d1b0e"/>
  <ellipse cx="74" cy="56" rx="7" ry="8.5" fill="#2d1b0e"/>
  <circle cx="48" cy="52" r="2.6" fill="#fff"/>
  <circle cx="76" cy="52" r="2.6" fill="#fff"/>
  <!-- 鼻子 -->
  <ellipse cx="60" cy="68" rx="8.5" ry="6" fill="#f28c8c"/>
  <!-- 牙齿 -->
  <rect x="54" y="74" width="5.5" height="6.5" rx="1.2" fill="#fff" stroke="#d9d9d9" stroke-width="0.8"/>
  <rect x="60.5" y="74" width="5.5" height="6.5" rx="1.2" fill="#fff" stroke="#d9d9d9" stroke-width="0.8"/>
  <!-- 胡须 -->
  <path d="M30 66 L10 60 M30 72 L8 72" stroke="#7a5a3a" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M90 66 L110 60 M90 72 L112 72" stroke="#7a5a3a" stroke-width="2" stroke-linecap="round" fill="none"/>
</svg>`;

/* 音效（WebAudio 合成，无需音频文件） */
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function tone(freq, dur, type = 'sine', vol = 0.09, delay = 0) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const t0 = ctx.currentTime + delay;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}
function sHit() { tone(880, 0.09, 'square', 0.08); tone(1320, 0.14, 'square', 0.05, 0.05); }
function sMiss() { tone(220, 0.12, 'triangle', 0.07); }
function sStart() { tone(523, 0.12, 'sine', 0.08); tone(784, 0.16, 'sine', 0.08, 0.1); }
function sEnd() { tone(660, 0.14, 'sine', 0.08); tone(440, 0.2, 'sine', 0.08, 0.14); }
