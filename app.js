/* ═══════════════════════════════════════════════════════════
   MARK — Personal Cloud System
   app.js — Main Application Logic (v2.1 — All File Types + Download + Space Analysis)
═══════════════════════════════════════════════════════════ */

'use strict';

/* ─── Firebase Config ─── */
const FIREBASE_URLS = [
  'https://wery-777fe-default-rtdb.firebaseio.com',
  'https://qyvg-bb81a-default-rtdb.firebaseio.com',
  'https://jsh-2d229-default-rtdb.europe-west1.firebasedatabase.app'
];

const DB_NAMES = ['Firebase Primary', 'Firebase Secondary', 'Firebase Europe'];

// Firebase Realtime Database free tier: 1 GB storage per database
const DB_FREE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB per DB

/* ─── File Type Maps ─── */
const MIME_MAP = {
  // Images
  'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
  'gif': 'image/gif', 'webp': 'image/webp', 'bmp': 'image/bmp',
  'svg': 'image/svg+xml', 'ico': 'image/x-icon', 'tiff': 'image/tiff', 'tif': 'image/tiff',
  // Videos
  'mp4': 'video/mp4', 'webm': 'video/webm', 'avi': 'video/x-msvideo',
  'mov': 'video/quicktime', 'mkv': 'video/x-matroska', 'wmv': 'video/x-ms-wmv',
  'flv': 'video/x-flv', 'm4v': 'video/x-m4v', '3gp': 'video/3gpp',
  // Audio
  'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'ogg': 'audio/ogg',
  'flac': 'audio/flac', 'm4a': 'audio/x-m4a', 'aac': 'audio/aac',
  'wma': 'audio/x-ms-wma', 'aiff': 'audio/aiff', 'opus': 'audio/opus',
  // Documents
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'txt': 'text/plain', 'csv': 'text/csv', 'json': 'application/json',
  'xml': 'application/xml', 'html': 'text/html', 'htm': 'text/html',
  'md': 'text/markdown', 'rtf': 'application/rtf',
  // Archives
  'zip': 'application/zip', 'rar': 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed', 'tar': 'application/x-tar',
  'gz': 'application/gzip',
  // Code
  'js': 'text/javascript', 'ts': 'text/typescript', 'css': 'text/css',
  'py': 'text/x-python', 'java': 'text/x-java', 'cpp': 'text/x-c++src',
  'c': 'text/x-csrc', 'sh': 'application/x-sh', 'sql': 'application/sql',
  // Other
  'apk': 'application/vnd.android.package-archive',
  'exe': 'application/x-msdownload',
  'dmg': 'application/x-apple-diskimage',
};

function getMimeType(file) {
  if (file.type && file.type !== '') return file.type;
  const ext = file.name.split('.').pop().toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

/* ─── App State ─── */
const state = {
  activeDB: 0,
  files: { photos: [], videos: [], audio: [], docs: [] },
  pin: '',
  correctPin: '2009',
  unlocked: false,
  currentSection: 'dashboard',
  dbOnline: false,
  dbSpaceInfo: [],
};

/* ─── DOM References ─── */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

/* ═══════════════════════════════════════════════════════════
   LOCK SCREEN
═══════════════════════════════════════════════════════════ */
const lockScreen = $('lockScreen');
const app = $('app');
const lockDots = $('lockDots').querySelectorAll('span');
const lockError = $('lockError');

let pinBuffer = '';

function initLock() {
  $$('.key').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.val;
      if (val === 'clear') {
        pinBuffer = '';
        updateDots();
        lockError.classList.remove('visible');
      } else if (val === 'enter') {
        checkPin();
      } else {
        if (pinBuffer.length < 4) {
          pinBuffer += val;
          updateDots();
          if (pinBuffer.length === 4) setTimeout(checkPin, 180);
        }
      }
    });
  });

  document.addEventListener('keydown', e => {
    if (!state.unlocked) {
      if (e.key >= '0' && e.key <= '9' && pinBuffer.length < 4) {
        pinBuffer += e.key;
        updateDots();
        if (pinBuffer.length === 4) setTimeout(checkPin, 180);
      } else if (e.key === 'Backspace') {
        pinBuffer = pinBuffer.slice(0, -1);
        updateDots();
        lockError.classList.remove('visible');
      } else if (e.key === 'Enter') {
        checkPin();
      }
    }
  });
}

function updateDots() {
  lockDots.forEach((dot, i) => dot.classList.toggle('filled', i < pinBuffer.length));
}

function checkPin() {
  if (pinBuffer === state.correctPin) {
    unlock();
  } else {
    shakeLock();
    lockError.classList.add('visible');
    pinBuffer = '';
    setTimeout(() => {
      updateDots();
      lockError.classList.remove('visible');
    }, 1600);
  }
}

function shakeLock() {
  const dots = $('lockDots');
  dots.style.animation = 'none';
  dots.offsetHeight;
  dots.style.animation = 'shake 0.4s ease';
  const styleId = 'shakeStyle';
  if (!document.getElementById(styleId)) {
    const s = document.createElement('style');
    s.id = styleId;
    s.textContent = `@keyframes shake {
      0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)}
      40%{transform:translateX(8px)} 60%{transform:translateX(-6px)}
      80%{transform:translateX(6px)}
    }`;
    document.head.appendChild(s);
  }
}

function unlock() {
  state.unlocked = true;
  lockScreen.style.animation = 'lockOut 0.5s ease forwards';
  const lockOutStyle = document.createElement('style');
  lockOutStyle.textContent = `@keyframes lockOut { to { opacity: 0; transform: scale(1.05); pointer-events: none; } }`;
  document.head.appendChild(lockOutStyle);
  setTimeout(() => {
    lockScreen.classList.remove('active');
    lockScreen.classList.add('hidden');
    app.classList.remove('hidden');
    initApp();
  }, 500);
}

function lock() {
  state.unlocked = false;
  pinBuffer = '';
  updateDots();
  app.classList.add('hidden');
  lockScreen.classList.remove('hidden');
  lockScreen.classList.add('active');
  lockScreen.style.animation = '';
  toast('Sistema bloqueado', 'info');
}

/* ═══════════════════════════════════════════════════════════
   BASE85 ENCODING (for photos)
═══════════════════════════════════════════════════════════ */
const b85 = (() => {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~";

  function encode(uint8arr) {
    let out = '';
    for (let i = 0; i < uint8arr.length; i += 4) {
      const chunk = uint8arr.slice(i, i + 4);
      const padded = new Uint8Array(4);
      padded.set(chunk);
      const padding = 4 - chunk.length;
      let n = (padded[0] << 24) | (padded[1] << 16) | (padded[2] << 8) | padded[3];
      n = n >>> 0;
      let group = '';
      for (let j = 0; j < 5; j++) {
        group = chars[n % 85] + group;
        n = Math.floor(n / 85);
      }
      out += group.slice(0, 5 - padding);
    }
    return out;
  }

  function decode(str) {
    const result = [];
    for (let i = 0; i < str.length; i += 5) {
      const chunk = str.slice(i, i + 5);
      const padding = 5 - chunk.length;
      let n = 0;
      for (let j = 0; j < 5; j++) {
        const ch = j < chunk.length ? chunk[j] : chars[84];
        n = n * 85 + chars.indexOf(ch);
      }
      for (let j = 3; j >= padding; j--) result.push((n >> (j * 8)) & 0xff);
    }
    return new Uint8Array(result);
  }

  return { encode, decode };
})();

/* ─── Base64 standard ─── */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

function readFileAsBase64(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result.split(',')[1]);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

async function readFileAsBase85(file) {
  const buf = await file.arrayBuffer();
  return b85.encode(new Uint8Array(buf));
}

async function encodeFile(file) {
  const mimeType = getMimeType(file);
  if (mimeType.startsWith('image/')) {
    const data = await readFileAsBase85(file);
    return { encoding: 'base85', data };
  } else {
    const data = await readFileAsBase64(file);
    return { encoding: 'base64', data };
  }
}

/* ═══════════════════════════════════════════════════════════
   FIREBASE REALTIME DATABASE
═══════════════════════════════════════════════════════════ */
async function fbReq(method, path, body = null) {
  const url = `${FIREBASE_URLS[state.activeDB]}${path}.json`;
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== null) opts.body = JSON.stringify(body);
  try {
    const r = await fetch(url, opts);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    for (let i = 0; i < FIREBASE_URLS.length; i++) {
      if (i === state.activeDB) continue;
      try {
        const url2 = `${FIREBASE_URLS[i]}${path}.json`;
        const r2 = await fetch(url2, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
        if (r2.ok) { state.activeDB = i; return await r2.json(); }
      } catch (_) {}
    }
    throw e;
  }
}

async function saveFile(category, fileObj) {
  return await fbReq('POST', `/mark/${category}`, fileObj);
}

async function loadAllFiles() {
  const data = await fbReq('GET', '/mark');
  return data || {};
}

async function deleteFileFromDB(category, key) {
  await fbReq('DELETE', `/mark/${category}/${key}`);
}

async function clearAllFromDB() {
  await fbReq('DELETE', '/mark');
}

/* ─── Check DB status + Space Analysis ─── */
async function checkDBStatus() {
  const dot = document.querySelector('.db-dot');
  let anyOnline = false;
  state.dbSpaceInfo = [];

  for (let i = 0; i < FIREBASE_URLS.length; i++) {
    const dotEl = $(`db${i}dot`);
    const statusEl = $(`db${i}status`);
    const spaceEl = $(`db${i}space`);
    const barEl = $(`db${i}bar`);
    const freeEl = $(`db${i}free`);

    try {
      const r = await fetch(`${FIREBASE_URLS[i]}/.json?shallow=true`, { method: 'GET' });
      if (r.ok) {
        dotEl.className = 'db-item-dot online';
        if (statusEl) statusEl.textContent = 'Online ✓';
        anyOnline = true;
        if (!state.dbOnline) state.activeDB = i;

        // Estimate used space from all data in this DB
        try {
          const dataResp = await fetch(`${FIREBASE_URLS[i]}/mark.json`);
          if (dataResp.ok) {
            const rawText = await dataResp.text();
            const usedBytes = new Blob([rawText]).size;
            const freeBytes = Math.max(0, DB_FREE_LIMIT_BYTES - usedBytes);
            const usedPct = Math.min(100, (usedBytes / DB_FREE_LIMIT_BYTES) * 100);

            state.dbSpaceInfo.push({ name: DB_NAMES[i], used: usedBytes, free: freeBytes, total: DB_FREE_LIMIT_BYTES, online: true });

            if (spaceEl) spaceEl.textContent = `Usado: ${formatSize(usedBytes)} / ${formatSize(DB_FREE_LIMIT_BYTES)}`;
            if (freeEl) freeEl.textContent = `Livre: ${formatSize(freeBytes)}`;
            if (barEl) {
              barEl.querySelector('.db-space-fill').style.width = usedPct + '%';
              barEl.querySelector('.db-space-fill').style.background =
                usedPct > 80 ? 'var(--c-danger)' : usedPct > 50 ? 'var(--c-warn)' : 'var(--c-success)';
            }
          }
        } catch (_) {
          state.dbSpaceInfo.push({ name: DB_NAMES[i], used: 0, free: DB_FREE_LIMIT_BYTES, total: DB_FREE_LIMIT_BYTES, online: true });
        }

      } else {
        dotEl.className = 'db-item-dot offline';
        if (statusEl) statusEl.textContent = 'Offline ✗';
        if (spaceEl) spaceEl.textContent = 'Indisponível';
        if (freeEl) freeEl.textContent = '—';
        state.dbSpaceInfo.push({ name: DB_NAMES[i], used: 0, free: 0, total: DB_FREE_LIMIT_BYTES, online: false });
      }
    } catch {
      dotEl.className = 'db-item-dot offline';
      if (statusEl) statusEl.textContent = 'Sem conexão';
      if (spaceEl) spaceEl.textContent = 'Sem conexão';
      if (freeEl) freeEl.textContent = '—';
      state.dbSpaceInfo.push({ name: DB_NAMES[i], used: 0, free: 0, total: DB_FREE_LIMIT_BYTES, online: false });
    }
  }

  if (dot) dot.className = 'db-dot ' + (anyOnline ? 'online' : 'offline');
  state.dbOnline = anyOnline;

  // Update total free space summary
  updateTotalSpaceSummary();
}

function updateTotalSpaceSummary() {
  const totalFree = state.dbSpaceInfo.reduce((s, db) => s + (db.online ? db.free : 0), 0);
  const totalUsed = state.dbSpaceInfo.reduce((s, db) => s + db.used, 0);
  const totalCapacity = state.dbSpaceInfo.reduce((s, db) => s + db.total, 0);

  const summaryEl = $('spaceSummary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="space-summary-row">
        <span>Espaço Total Livre</span>
        <span class="space-value-free">${formatSize(totalFree)}</span>
      </div>
      <div class="space-summary-row">
        <span>Total Usado</span>
        <span>${formatSize(totalUsed)}</span>
      </div>
      <div class="space-summary-row">
        <span>Capacidade Total</span>
        <span>${formatSize(totalCapacity)}</span>
      </div>
    `;
  }
}

/* ═══════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
═══════════════════════════════════════════════════════════ */
function toast(msg, type = 'info') {
  const container = $('toastContainer');
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.innerHTML = `<span class="toast-dot"></span>${msg}`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

/* ═══════════════════════════════════════════════════════════
   UPLOAD LOGIC — ALL FILE TYPES
═══════════════════════════════════════════════════════════ */
async function handleUpload(files) {
  const overlay = $('uploadOverlay');
  const progressFill = $('uploadProgressFill');
  const progressText = $('uploadProgressText');
  const fileName = $('uploadFileName');
  const log = $('uploadLog');

  overlay.classList.remove('hidden');
  log.innerHTML = '';

  const addLog = msg => {
    const line = document.createElement('div');
    line.textContent = `> ${msg}`;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const progress = Math.round((i / files.length) * 100);
    progressFill.style.width = progress + '%';
    progressText.textContent = progress + '%';
    fileName.textContent = file.name;

    addLog(`Processando: ${file.name} (${formatSize(file.size)})`);

    try {
      // Fix MIME type if browser didn't detect it
      const fixedFile = file.type ? file : new File([file], file.name, { type: getMimeType(file) });
      const { encoding, data } = await encodeFile(fixedFile);
      addLog(`Codificação: ${encoding.toUpperCase()}`);

      const mimeType = getMimeType(fixedFile);
      const category = getCategory(mimeType, file.name);
      const fileObj = {
        name: file.name,
        type: mimeType,
        size: file.size,
        encoding,
        data,
        date: new Date().toISOString(),
        category,
      };

      addLog(`Enviando para Firebase (${DB_NAMES[state.activeDB]})...`);
      const result = await saveFile(category, fileObj);
      addLog(`✓ Salvo com ID: ${result.name}`);
      toast(`${file.name} salvo!`, 'success');

    } catch (err) {
      addLog(`✗ Erro: ${err.message}`);
      toast(`Erro ao salvar ${file.name}`, 'error');
    }
  }

  progressFill.style.width = '100%';
  progressText.textContent = '100%';
  addLog('Upload concluído!');

  setTimeout(() => {
    overlay.classList.add('hidden');
    loadAndRenderAll();
  }, 1200);
}

function getCategory(mimeType, filename = '') {
  if (mimeType.startsWith('image/')) return 'photos';
  if (mimeType.startsWith('video/')) return 'videos';
  if (mimeType.startsWith('audio/')) return 'audio';
  // Also detect by extension for edge cases
  const ext = filename.split('.').pop().toLowerCase();
  if (['mp3','wav','ogg','flac','m4a','aac','wma','aiff','opus'].includes(ext)) return 'audio';
  if (['mp4','webm','avi','mov','mkv','wmv','flv','m4v','3gp'].includes(ext)) return 'videos';
  if (['jpg','jpeg','png','gif','webp','bmp','svg','ico','tiff','tif'].includes(ext)) return 'photos';
  return 'docs';
}

/* ═══════════════════════════════════════════════════════════
   RENDER FUNCTIONS
═══════════════════════════════════════════════════════════ */
function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function getFileIcon(type, filename = '') {
  if (!type) type = '';
  const ext = filename.split('.').pop().toLowerCase();

  if (type.startsWith('image/')) return `<svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`;
  if (type.startsWith('video/')) return `<svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>`;
  if (type.startsWith('audio/')) return `<svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;

  // Document type icons
  if (['xls','xlsx'].includes(ext) || type.includes('spreadsheet') || type.includes('excel'))
    return `<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 11h2v2H8zm0 4h2v2H8zm4-4h2v2h-2zm0 4h2v2h-2zm4-4h2v2h-2zm0 4h2v2h-2z"/></svg>`;
  if (['doc','docx'].includes(ext) || type.includes('word'))
    return `<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM7 17l2-6 2 4 2-2 2 4H7z"/></svg>`;
  if (['ppt','pptx'].includes(ext) || type.includes('presentation'))
    return `<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 8h-3v3H9v-3H6V9h3V6h2v3h3v2z"/></svg>`;
  if (ext === 'pdf' || type.includes('pdf'))
    return `<svg viewBox="0 0 24 24"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/></svg>`;
  if (['zip','rar','7z','tar','gz'].includes(ext))
    return `<svg viewBox="0 0 24 24"><path d="M20 6h-2.18c.07-.44.18-.88.18-1 0-2.21-1.79-4-4-4S10 2.79 10 5c0 .12.11.56.18 1H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-3c1.1 0 2 .9 2 2H12c0-1.1.9-2 2-2zm6 17H8V8h3v2h2V8h7v12zm-5-8h-2v2h-2v2h2v-2h2v2h2v-2h-2z"/></svg>`;

  return `<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>`;
}

/* ─── Decode back to src URL ─── */
function decodeToURL(item) {
  if (!item || !item.data) return null;
  try {
    if (item.encoding === 'base85') {
      const bytes = b85.decode(item.data);
      const blob = new Blob([bytes], { type: item.type || 'application/octet-stream' });
      return URL.createObjectURL(blob);
    } else {
      const binary = atob(item.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: item.type || 'application/octet-stream' });
      return URL.createObjectURL(blob);
    }
  } catch (e) {
    console.error('Decode error:', e);
    return null;
  }
}

/* ─── Download — works for ALL file types ─── */
function downloadFile(item) {
  try {
    const url = decodeToURL(item);
    if (!url) { toast('Erro ao preparar download', 'error'); return; }
    const a = document.createElement('a');
    a.href = url;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast(`Download: ${item.name}`, 'success');
  } catch (e) {
    toast('Erro no download', 'error');
  }
}

/* ─── Photos ─── */
function renderPhotos(photos, filter = '') {
  const grid = $('photoGrid');
  const items = Object.entries(photos || {}).filter(([, v]) =>
    !filter || v.name.toLowerCase().includes(filter.toLowerCase())
  );

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">◈</div><p>Nenhuma foto armazenada</p></div>`;
    return;
  }

  grid.innerHTML = '';
  items.forEach(([key, item], idx) => {
    const card = document.createElement('div');
    card.className = 'photo-card';
    card.style.animationDelay = `${idx * 0.04}s`;

    const img = document.createElement('img');
    img.alt = item.name;
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    img.style.background = 'var(--c-surface2)';

    card.innerHTML = `
      <div class="photo-card-actions">
        <button class="card-action-btn dl" title="Download">⬇</button>
        <button class="card-action-btn del" title="Deletar">✕</button>
      </div>
      <div class="photo-card-info">
        <div class="photo-card-name">${item.name}</div>
        <div class="photo-card-size">${formatSize(item.size)}</div>
      </div>
    `;
    card.insertBefore(img, card.firstChild);

    setTimeout(() => {
      try { img.src = decodeToURL(item) || img.src; } catch (e) {}
    }, idx * 80);

    card.addEventListener('click', e => {
      if (e.target.closest('.card-action-btn')) return;
      openLightbox(item, 'photo');
    });

    card.querySelector('.card-action-btn.dl').addEventListener('click', e => {
      e.stopPropagation();
      downloadFile(item);
    });

    card.querySelector('.card-action-btn.del').addEventListener('click', async e => {
      e.stopPropagation();
      if (confirm(`Deletar "${item.name}"?`)) {
        await deleteFileFromDB('photos', key);
        toast(`${item.name} deletado`, 'error');
        loadAndRenderAll();
      }
    });

    grid.appendChild(card);
  });
}

/* ─── Videos ─── */
function renderVideos(videos, filter = '') {
  const grid = $('videoGrid');
  const items = Object.entries(videos || {}).filter(([, v]) =>
    !filter || v.name.toLowerCase().includes(filter.toLowerCase())
  );

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">◈</div><p>Nenhum vídeo armazenado</p></div>`;
    return;
  }

  grid.innerHTML = '';
  items.forEach(([key, item], idx) => {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.style.animationDelay = `${idx * 0.05}s`;
    card.innerHTML = `
      <div class="video-thumb">
        <div class="video-play-icon"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
      </div>
      <div class="video-info">
        <div class="video-name">${item.name}</div>
        <div class="video-meta">${formatSize(item.size)} · ${formatDate(item.date)}</div>
      </div>
      <div class="video-actions">
        <button class="card-action-btn dl" title="Download">⬇</button>
        <button class="card-action-btn del" title="Deletar">✕</button>
      </div>
    `;

    card.addEventListener('click', e => {
      if (e.target.closest('.card-action-btn')) return;
      openLightbox(item, 'video');
    });

    card.querySelector('.card-action-btn.dl').addEventListener('click', e => {
      e.stopPropagation();
      downloadFile(item);
    });

    card.querySelector('.card-action-btn.del').addEventListener('click', async e => {
      e.stopPropagation();
      if (confirm(`Deletar "${item.name}"?`)) {
        await deleteFileFromDB('videos', key);
        toast(`${item.name} deletado`, 'error');
        loadAndRenderAll();
      }
    });

    grid.appendChild(card);
  });
}

/* ─── Audio ─── */
function renderAudio(audio) {
  const list = $('audioList');
  const items = Object.entries(audio || {});

  if (!items.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">◈</div><p>Nenhum áudio armazenado</p></div>`;
    return;
  }

  list.innerHTML = '';
  items.forEach(([key, item], idx) => {
    const el = document.createElement('div');
    el.className = 'audio-item';
    el.style.animationDelay = `${idx * 0.05}s`;
    const ext = item.name.split('.').pop().toUpperCase();
    el.innerHTML = `
      <div class="audio-icon">
        <svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
      </div>
      <div class="audio-info">
        <div class="audio-name">${item.name}</div>
        <div class="audio-meta"><span class="file-type-badge">${ext}</span> ${formatSize(item.size)} · ${formatDate(item.date)}</div>
      </div>
      <div class="audio-controls">
        <button class="audio-play-btn" title="Reproduzir">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <button class="card-action-btn dl" title="Download">⬇</button>
        <button class="card-action-btn del" title="Deletar">✕</button>
      </div>
    `;

    el.querySelector('.audio-play-btn').addEventListener('click', () => {
      playAudio(item, el.querySelector('.audio-play-btn'));
    });

    el.querySelector('.card-action-btn.dl').addEventListener('click', () => downloadFile(item));

    el.querySelector('.card-action-btn.del').addEventListener('click', async () => {
      if (confirm(`Deletar "${item.name}"?`)) {
        await deleteFileFromDB('audio', key);
        toast(`${item.name} deletado`, 'error');
        loadAndRenderAll();
      }
    });

    list.appendChild(el);
  });
}

let currentAudio = null;

function playAudio(item, btn) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  const url = decodeToURL(item);
  if (!url) { toast('Erro ao reproduzir áudio', 'error'); return; }
  const audio = new Audio(url);
  currentAudio = audio;
  btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
  audio.play().catch(() => toast('Erro ao reproduzir — tente baixar o arquivo', 'error'));
  audio.addEventListener('ended', () => {
    btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
    currentAudio = null;
  });
  btn.addEventListener('click', () => {
    if (!audio.paused) {
      audio.pause();
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
    }
  }, { once: true });
}

/* ─── Files table — ALL file types ─── */
function renderFiles(docs, filter = '') {
  const tbody = $('fileTableBody');
  const items = Object.entries(docs || {}).filter(([, v]) =>
    !filter || v.name.toLowerCase().includes(filter.toLowerCase())
  );

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">◈</div><p>Nenhum arquivo</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  items.forEach(([key, item]) => {
    const tr = document.createElement('tr');
    const ext = item.name.split('.').pop().toUpperCase();
    tr.innerHTML = `
      <td>
        <div class="file-table-name">
          <div class="recent-item-icon" style="width:28px;height:28px;">${getFileIcon(item.type, item.name)}</div>
          <span title="${item.name}">${item.name}</span>
        </div>
      </td>
      <td><span class="file-type-badge">${ext}</span></td>
      <td>${formatSize(item.size)}</td>
      <td>${formatDate(item.date)}</td>
      <td>
        <div class="file-actions">
          <button class="file-btn dl">⬇ Download</button>
          <button class="file-btn del">✕ Deletar</button>
        </div>
      </td>
    `;

    tr.querySelector('.file-btn.dl').addEventListener('click', () => downloadFile(item));
    tr.querySelector('.file-btn.del').addEventListener('click', async () => {
      if (confirm(`Deletar "${item.name}"?`)) {
        await deleteFileFromDB('docs', key);
        toast(`${item.name} deletado`, 'error');
        loadAndRenderAll();
      }
    });

    tbody.appendChild(tr);
  });
}

/* ─── Dashboard ─── */
function renderDashboard(allData) {
  const photos = allData.photos || {};
  const videos = allData.videos || {};
  const audio = allData.audio || {};
  const docs = allData.docs || {};

  const pc = Object.keys(photos).length;
  const vc = Object.keys(videos).length;
  const ac = Object.keys(audio).length;
  const dc = Object.keys(docs).length;
  const total = pc + vc + ac + dc;

  $('totalFiles').textContent = total;
  $('totalPhotos').textContent = pc;
  $('totalVideos').textContent = vc;
  $('totalAudio').textContent = ac;
  $('totalDocs').textContent = dc;

  $('s-total').textContent = total;
  $('s-photos').textContent = pc;
  $('s-videos').textContent = vc;
  $('s-audio').textContent = ac;
  $('s-docs').textContent = dc;

  // Storage estimation from original file sizes
  const totalBytes = [
    ...Object.values(photos),
    ...Object.values(videos),
    ...Object.values(audio),
    ...Object.values(docs)
  ].reduce((sum, f) => sum + (f.size || 0), 0);

  const maxEstimate = 3 * DB_FREE_LIMIT_BYTES; // 3 GB total across all DBs
  const fillPct = Math.min(100, (totalBytes / maxEstimate) * 100);
  $('storageFill').style.width = fillPct + '%';
  $('storageText').textContent = `${formatSize(totalBytes)} usados`;

  // Recent list
  const all = [
    ...Object.entries(photos).map(([k, v]) => ({ ...v, key: k, cat: 'photos' })),
    ...Object.entries(videos).map(([k, v]) => ({ ...v, key: k, cat: 'videos' })),
    ...Object.entries(audio).map(([k, v]) => ({ ...v, key: k, cat: 'audio' })),
    ...Object.entries(docs).map(([k, v]) => ({ ...v, key: k, cat: 'docs' })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  const recentList = $('recentList');
  if (!all.length) {
    recentList.innerHTML = `<div class="empty-state"><div class="empty-icon">◈</div><p>Nenhum arquivo ainda</p></div>`;
    return;
  }

  recentList.innerHTML = '';
  all.forEach((item, idx) => {
    const el = document.createElement('div');
    el.className = 'recent-item';
    el.style.animationDelay = `${idx * 0.05}s`;
    el.innerHTML = `
      <div class="recent-item-icon">${getFileIcon(item.type, item.name)}</div>
      <div class="recent-item-info">
        <div class="recent-item-name">${item.name}</div>
        <div class="recent-item-meta">${formatDate(item.date)}</div>
      </div>
      <div class="recent-item-actions">
        <button class="file-btn dl" title="Download">⬇</button>
        <div class="recent-item-size">${formatSize(item.size)}</div>
      </div>
    `;
    el.querySelector('.file-btn.dl').addEventListener('click', e => {
      e.stopPropagation();
      downloadFile(item);
    });
    el.addEventListener('click', () => switchSection(item.cat));
    recentList.appendChild(el);
  });
}

/* ─── Lightbox ─── */
function openLightbox(item, mediaType) {
  const lb = $('lightbox');
  const content = $('lightboxContent');
  const meta = $('lightboxMeta');

  content.innerHTML = '<div style="color:var(--c-white-dim);font-family:var(--font-mono)">Carregando...</div>';
  lb.classList.remove('hidden');
  meta.innerHTML = `${item.name} · ${formatSize(item.size)} · ${formatDate(item.date)}
    <button class="file-btn dl" style="margin-left:12px" onclick="downloadFile(window._lbItem)">⬇ Download</button>`;
  window._lbItem = item;

  const url = decodeToURL(item);

  if (mediaType === 'photo') {
    const img = document.createElement('img');
    img.src = url;
    img.alt = item.name;
    content.innerHTML = '';
    content.appendChild(img);
  } else if (mediaType === 'video') {
    const vid = document.createElement('video');
    vid.src = url;
    vid.controls = true;
    vid.autoplay = false;
    content.innerHTML = '';
    content.appendChild(vid);
  }
}

$('lightboxClose').addEventListener('click', () => {
  $('lightbox').classList.add('hidden');
  const vid = $('lightboxContent').querySelector('video');
  if (vid) vid.pause();
});

$('lightbox').addEventListener('click', e => {
  if (e.target === $('lightbox')) {
    $('lightbox').classList.add('hidden');
    const vid = $('lightboxContent').querySelector('video');
    if (vid) vid.pause();
  }
});

/* ═══════════════════════════════════════════════════════════
   LOAD & RENDER ALL
═══════════════════════════════════════════════════════════ */
async function loadAndRenderAll() {
  try {
    const allData = await loadAllFiles();
    state.files.photos = allData.photos || {};
    state.files.videos = allData.videos || {};
    state.files.audio = allData.audio || {};
    state.files.docs = allData.docs || {};

    renderDashboard(allData);
    renderPhotos(state.files.photos);
    renderVideos(state.files.videos);
    renderAudio(state.files.audio);
    renderFiles(state.files.docs);
  } catch (err) {
    toast('Erro ao carregar dados', 'error');
    console.error(err);
  }
}

/* ═══════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════ */
const sectionTitles = {
  dashboard: 'Dashboard',
  photos: 'Galeria de Fotos',
  videos: 'Biblioteca de Vídeos',
  audio: 'Arquivos de Áudio',
  files: 'Gerenciador de Arquivos',
  settings: 'Configurações'
};

function switchSection(name) {
  $$('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.section === name));
  $$('.section').forEach(sec => sec.classList.remove('active'));
  $(`section-${name}`).classList.add('active');
  $('topbarTitle').textContent = sectionTitles[name] || name;
  state.currentSection = name;
  $('sidebar').classList.remove('open');
}

/* ═══════════════════════════════════════════════════════════
   INIT APP
═══════════════════════════════════════════════════════════ */
async function initApp() {
  $$('.nav-item').forEach(btn => btn.addEventListener('click', () => switchSection(btn.dataset.section)));

  $('uploadBtn').addEventListener('click', () => $('fileInput').click());

  $('fileInput').addEventListener('change', e => {
    const files = Array.from(e.target.files);
    if (files.length > 0) { handleUpload(files); e.target.value = ''; }
  });

  $('lockBtn').addEventListener('click', lock);

  $('menuToggle').addEventListener('click', () => $('sidebar').classList.toggle('open'));

  $('searchPhotos').addEventListener('input', e => renderPhotos(state.files.photos, e.target.value));
  $('searchVideos').addEventListener('input', e => renderVideos(state.files.videos, e.target.value));
  $('searchFiles').addEventListener('input', e => renderFiles(state.files.docs, e.target.value));

  $$('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const grid = $('photoGrid');
      btn.dataset.view === 'list' ? grid.classList.add('list-view') : grid.classList.remove('list-view');
    });
  });

  $('clearAllBtn').addEventListener('click', async () => {
    if (confirm('ATENÇÃO: Isso apagará TODOS os arquivos permanentemente. Confirmar?')) {
      try {
        await clearAllFromDB();
        toast('Todos os dados apagados', 'error');
        loadAndRenderAll();
      } catch (err) {
        toast('Erro ao apagar dados', 'error');
      }
    }
  });

  // Refresh space button
  const refreshSpaceBtn = $('refreshSpaceBtn');
  if (refreshSpaceBtn) {
    refreshSpaceBtn.addEventListener('click', async () => {
      refreshSpaceBtn.textContent = 'ANALISANDO...';
      refreshSpaceBtn.disabled = true;
      await checkDBStatus();
      refreshSpaceBtn.textContent = 'ATUALIZAR ESPAÇO';
      refreshSpaceBtn.disabled = false;
      toast('Análise de espaço atualizada', 'success');
    });
  }

  // Check DB status
  await checkDBStatus();
  setInterval(checkDBStatus, 60000);

  // Load all files
  await loadAndRenderAll();

  // Drag and drop
  const mainContent = document.querySelector('.content-area');
  mainContent.addEventListener('dragover', e => {
    e.preventDefault();
    mainContent.style.outline = '2px dashed var(--c-purple)';
  });
  mainContent.addEventListener('dragleave', () => { mainContent.style.outline = ''; });
  mainContent.addEventListener('drop', e => {
    e.preventDefault();
    mainContent.style.outline = '';
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleUpload(files);
  });

  toast('Sistema MARK inicializado', 'success');
}

/* ═══════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initLock();
});