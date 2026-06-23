/* ===== 莫一兮工具箱 通用 JS ===== */
(function () {
  'use strict';
  const MX = window.MX = {};

  // Toast 提示
  const wrap = document.createElement('div');
  wrap.className = 'mx-toast-wrap';
  document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(wrap); });
  MX.toast = function (msg, type) {
    const el = document.createElement('div');
    el.className = 'mx-toast' + (type ? ' ' + type : '');
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      el.style.transition = 'all .2s';
      setTimeout(function () { el.remove(); }, 200);
    }, 2000);
  };

  // 复制到剪贴板
  MX.copy = function (text) {
    if (text === '' || text == null) { MX.toast('内容为空', 'warn'); return Promise.resolve(false); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () {
        MX.toast('已复制', 'success'); return true;
      }, function () { return fallbackCopy(text); });
    }
    return fallbackCopy(text);
  };
  function fallbackCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      MX.toast(ok ? '已复制' : '复制失败', ok ? 'success' : 'error');
      return Promise.resolve(ok);
    } catch (e) { MX.toast('复制失败', 'error'); return Promise.resolve(false); }
  }

  // 下载文件
  MX.download = function (filename, blobOrText, mime) {
    let blob = blobOrText;
    if (typeof blobOrText === 'string') blob = new Blob([blobOrText], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  };

  // Tab 切换：data-mx-tab="组名" + data-mx-panel="组名"
  // root: tabs 按钮容器；scope: 面板所在的查找范围（面板常与 tabs 是兄弟节点，
  //   而非 tabs 的子元素，默认在整个 document 查找）
  MX.tabs = function (root, scope) {
    const findScope = scope || document;
    const buttons = root.querySelectorAll('[data-mx-tab]');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const group = btn.getAttribute('data-mx-tab');
        root.querySelectorAll('[data-mx-tab]').forEach(function (b) { b.classList.toggle('active', b === btn); });
        findScope.querySelectorAll('[data-mx-panel]').forEach(function (p) {
          p.classList.toggle('active', p.getAttribute('data-mx-panel') === group);
        });
        const onTab = root._onTabChange; if (onTab) onTab(group);
      });
    });
    return { root: root, go: function (group) { const b = root.querySelector('[data-mx-tab="' + group + '"]'); if (b) b.click(); } };
  };

  // 绑定拖拽/点击上传区。onFile(file) 回调。
  MX.bindDrop = function (zone, onFile, opts) {
    opts = opts || {};
    const input = document.createElement('input');
    input.type = 'file';
    if (opts.accept) input.accept = opts.accept;
    input.style.display = 'none';
    zone.appendChild(input);

    zone.addEventListener('click', function (e) {
      if (e.target.tagName === 'INPUT') return;
      input.click();
    });
    input.addEventListener('change', function () {
      if (input.files && input.files[0]) handle(input.files[0]);
      input.value = '';
    });
    zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', function (e) { e.preventDefault(); zone.classList.remove('dragover'); });
    zone.addEventListener('drop', function (e) {
      e.preventDefault(); zone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]);
    });

    function handle(file) {
      if (opts.maxSize && file.size > opts.maxSize) {
        MX.toast('文件超过 ' + (opts.maxSize / 1024 / 1024).toFixed(0) + 'MB 上限', 'error');
        return;
      }
      onFile(file);
    }
  };

  // 读取文件为 ArrayBuffer / DataURL / Text
  MX.readFile = function (file, type) {
    return new Promise(function (resolve, reject) {
      const r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
      if (type === 'arraybuffer') r.readAsArrayBuffer(file);
      else if (type === 'dataurl') r.readAsDataURL(file);
      else r.readAsText(file);
    });
  };

  // MD5 实现（Web Crypto 不支持 MD5）。基于 Paul Johnston 的 RFC1321 实现 (BSD 许可)。
  // 输入支持字符串（按 UTF-8 编码）或 Uint8Array。返回十六进制串。
  MX.md5 = (function () {
    function safeAdd(x, y) {
      var lsw = (x & 0xffff) + (y & 0xffff);
      var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
      return (msw << 16) | (lsw & 0xffff);
    }
    function bitRol(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
    function md5cmn(q, a, b, x, s, t) { return safeAdd(bitRol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
    function md5ff(a, b, c, d, x, s, t) { return md5cmn((b & c) | (~b & d), a, b, x, s, t); }
    function md5gg(a, b, c, d, x, s, t) { return md5cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function md5hh(a, b, c, d, x, s, t) { return md5cmn(b ^ c ^ d, a, b, x, s, t); }
    function md5ii(a, b, c, d, x, s, t) { return md5cmn(c ^ (b | ~d), a, b, x, s, t); }

    function binlMD5(x, len) {
      x[len >> 5] |= 0x80 << (len % 32);
      x[(((len + 64) >>> 9) << 4) + 14] = len;
      var i, olda, oldb, oldc, oldd,
        a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
      for (i = 0; i < x.length; i += 16) {
        olda = a; oldb = b; oldc = c; oldd = d;
        a = md5ff(a, b, c, d, x[i], 7, -680876936);
        d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
        c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
        b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
        a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
        d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
        c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
        b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
        a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
        d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
        c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
        b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
        a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
        d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
        c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
        b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
        a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
        d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
        c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
        b = md5gg(b, c, d, a, x[i], 20, -373897302);
        a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
        d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
        c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
        b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
        a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
        d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
        c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
        b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
        a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
        d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
        c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
        b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);
        a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
        d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
        c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
        b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
        a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
        d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
        c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
        b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
        a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
        d = md5hh(d, a, b, c, x[i], 11, -358537222);
        c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
        b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
        a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
        d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
        c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
        b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
        a = md5ii(a, b, c, d, x[i], 6, -198630844);
        d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
        c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
        b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
        a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
        d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
        c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
        b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
        a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
        d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
        c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
        b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
        a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
        d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
        c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
        b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);
        a = safeAdd(a, olda); b = safeAdd(b, oldb); c = safeAdd(c, oldc); d = safeAdd(d, oldd);
      }
      return [a, b, c, d];
    }

    function binl2hex(binarray) {
      var hexTab = '0123456789abcdef', str = '', i;
      for (i = 0; i < binarray.length * 4; i++) {
        str += hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0x0F) +
               hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 0x0F);
      }
      return str;
    }

    // bytes8 数组 → 32 位字数组
    function bytesToWords(bytes) {
      var words = [], i;
      for (i = 0; i < bytes.length * 8; i += 8) {
        words[i >> 5] |= (bytes[i / 8] & 0xff) << (i % 32);
      }
      return words;
    }

    return function (input) {
      var bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
      return binl2hex(binlMD5(bytesToWords(bytes), bytes.length * 8));
    };
  })();

  // Web Crypto SHA。返回 Promise<hex 字符串>
  MX.sha = function (alg, text) {
    const bytes = new TextEncoder().encode(text);
    return crypto.subtle.digest(alg, bytes).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  };
})();
