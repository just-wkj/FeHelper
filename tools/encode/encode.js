'use strict';
const input = document.getElementById('input');
const output = document.getElementById('output');
const modeSel = document.getElementById('mode');
const dirBtns = document.querySelectorAll('.enc-dir [data-dir]');
const inInfo = document.getElementById('inInfo');
let dir = 'encode';

document.getElementById('backBtn').addEventListener('click', function () {
  location.href = chrome.runtime.getURL('popup/popup.html');
});

// 哈希是单向的，切换到哈希模式时锁定方向为编码
function syncDirUI() {
  const isHash = ['md5', 'sha1', 'sha256'].indexOf(modeSel.value) >= 0;
  if (isHash) {
    dir = 'encode';
    dirBtns.forEach(function (b) { b.disabled = b.dataset.dir === 'decode'; b.classList.toggle('active', b.dataset.dir === 'encode'); });
  } else {
    dirBtns.forEach(function (b) { b.disabled = false; });
  }
}

// ===== 编解码实现 =====
function utf8ToBytes(str) { return new TextEncoder().encode(str); }
function bytesToUtf8(bytes) { return new TextEncoder ? new TextDecoder().decode(bytes) : bytes; }

const CODECS = {
  base64: {
    encode: function (s) {
      const bytes = utf8ToBytes(s);
      let bin = '';
      bytes.forEach(function (b) { bin += String.fromCharCode(b); });
      return btoa(bin);
    },
    decode: function (s) {
      try {
        const bin = atob(s.replace(/\s+/g, ''));
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder().decode(bytes);
      } catch (e) { throw new Error('非法 Base64 字符'); }
    }
  },
  url: {
    encode: function (s) { return encodeURIComponent(s); },
    decode: function (s) { return decodeURIComponent(s); }
  },
  html: {
    encode: function (s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    decode: function (s) {
      const txt = document.createElement('textarea');
      txt.innerHTML = s;
      return txt.value;
    }
  },
  unicode: {
    encode: function (s) {
      let out = '';
      for (let i = 0; i < s.length; i++) {
        const code = s.charCodeAt(i);
        out += '\\u' + code.toString(16).padStart(4, '0');
      }
      return out;
    },
    decode: function (s) {
      return s.replace(/\\u([0-9a-fA-F]{4})/g, function (m, g) { return String.fromCharCode(parseInt(g, 16)); });
    }
  },
  hex: {
    encode: function (s) {
      const bytes = utf8ToBytes(s);
      return Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, '0'); }).join(' ');
    },
    decode: function (s) {
      const hex = s.replace(/0x/gi, '').replace(/[\s,;]+/g, '');
      if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) throw new Error('非法十六进制');
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
      return new TextDecoder().decode(bytes);
    }
  }
};

async function convert() {
  const mode = modeSel.value;
  const text = input.value;
  inInfo.textContent = text.length ? text.length + ' 字符' : '';
  if (!text) { output.value = ''; return; }
  try {
    if (mode in CODECS) {
      const fn = dir === 'encode' ? CODECS[mode].encode : CODECS[mode].decode;
      output.value = fn(text);
    } else if (mode === 'md5') {
      output.value = MX.md5(text);
    } else if (mode === 'sha1') {
      output.value = await MX.sha('SHA-1', text);
    } else if (mode === 'sha256') {
      output.value = await MX.sha('SHA-256', text);
    }
    output.style.color = '';
  } catch (e) {
    output.value = '❌ ' + e.message;
    output.style.color = 'var(--mx-error)';
  }
}

let timer = null;
input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(convert, 150); });
modeSel.addEventListener('change', function () { syncDirUI(); convert(); });
dirBtns.forEach(function (b) {
  b.addEventListener('click', function () {
    dir = b.dataset.dir;
    dirBtns.forEach(function (x) { x.classList.toggle('active', x === b); });
    convert();
  });
});

document.getElementById('btnSwap').addEventListener('click', function () {
  const isHash = ['md5', 'sha1', 'sha256'].indexOf(modeSel.value) >= 0;
  if (isHash) { MX.toast('哈希不可逆，无法交换', 'warn'); return; }
  input.value = output.value;
  // 交换后自动反方向
  dir = dir === 'encode' ? 'decode' : 'encode';
  dirBtns.forEach(function (b) { b.classList.toggle('active', b.dataset.dir === dir); });
  convert();
});
document.getElementById('btnCopy').addEventListener('click', function () { MX.copy(output.value); });
document.getElementById('btnClear').addEventListener('click', function () { input.value = ''; output.value = ''; inInfo.textContent = ''; });

syncDirUI();
