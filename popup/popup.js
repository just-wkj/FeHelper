'use strict';
// 新标签页打开的工具
const TAB_TOOLS = [
  { id: 'json',    icon: '{ }',  cls: 'ic-json',    name: 'JSON 美化',     desc: '格式化、压缩、校验、树形折叠' },
  { id: 'qr',      icon: '⊟',    cls: 'ic-qr',      name: '二维码工具',    desc: '生成二维码 / 图片识别解码' },
  { id: 'encode',  icon: '⇄',   cls: 'ic-encode',  name: '编码转换',      desc: 'Base64 / URL / HTML / Hex / 哈希' },
  { id: 'excel',   icon: '▦',   cls: 'ic-excel',   name: 'Excel 转 JSON', desc: 'xlsx / xls / csv 解析导出' }
];
// 当前页面直接获取的工具（popup 内联）
const INLINE_TOOLS = [
  { id: 'cookie',  icon: '🍪', cls: 'ic-cookie',  name: 'Cookie 获取',  desc: '读取当前页面的 Cookie' },
  { id: 'ls',      icon: '🗄',  cls: 'ic-storage', name: 'LocalStorage', desc: '读取当前页面的 LocalStorage' }
];

document.addEventListener('DOMContentLoaded', function () {
  renderTabTools();
  renderInlineTools();
  initCookieView();
  initLsView();
});

// ===== 渲染菜单卡片 =====
function renderTabTools() {
  const list = document.getElementById('tabToolList');
  TAB_TOOLS.forEach(function (t) { list.appendChild(makeItem(t, function () { openTab(t.id); })); });
}
function renderInlineTools() {
  const list = document.getElementById('inlineToolList');
  INLINE_TOOLS.forEach(function (t) {
    list.appendChild(makeItem(t, function () { switchView(t.id + 'View'); }));
  });
}
function makeItem(t, onClick) {
  const item = document.createElement('div');
  item.className = 'pp-item';
  item.innerHTML =
    '<div class="icon ' + t.cls + '">' + t.icon + '</div>' +
    '<div class="info"><div class="name">' + t.name + '</div><div class="desc">' + t.desc + '</div></div>' +
    '<div class="arrow">›</div>';
  item.addEventListener('click', onClick);
  return item;
}
function openTab(id) {
  chrome.tabs.create({ url: chrome.runtime.getURL('tools/' + id + '/index.html') });
}

// ===== 视图切换 =====
function switchView(viewId) {
  document.querySelectorAll('.pp-view').forEach(function (v) { v.style.display = 'none'; });
  document.getElementById(viewId).style.display = 'block';
  // 切换到 cookie/ls 视图时自动列出全部
  if (viewId === 'cookieView') { document.getElementById('cookieKey').value = ''; document.getElementById('cookieQuery').click(); }
  if (viewId === 'lsView') { document.getElementById('lsKey').value = ''; document.getElementById('lsQuery').click(); }
}
document.getElementById('cookieBack').addEventListener('click', function () { switchView('menuView'); });
document.getElementById('lsBack').addEventListener('click', function () { switchView('menuView'); });

// ===== 获取当前激活标签页 =====
// 优先用 tabs.query，如果拿不到 url（权限不足），降级用 chrome.tabs.getCurrent
function getActiveTab() {
  return new Promise(function (resolve) {
    if (!chrome.tabs || !chrome.tabs.query) { resolve(null); return; }
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (chrome.runtime.lastError) {
        console.warn('[getActiveTab] query error:', chrome.runtime.lastError.message);
      }
      resolve(tabs[0] || null);
    });
  });
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ============================================================
// Cookie 视图
// ============================================================
function initCookieView() {
  const keyInput = document.getElementById('cookieKey');
  const resultEl = document.getElementById('cookieResult');
  const hostEl = document.getElementById('cookieHost');
  const btnCopy = document.getElementById('cookieCopy');
  const btnCopyAll = document.getElementById('cookieCopyAll');
  let lastValue = '', lastAllJson = '';

  getActiveTab().then(function (tab) {
    if (tab && tab.url) {
      try { hostEl.textContent = new URL(tab.url).hostname; }
      catch (e) { hostEl.textContent = tab.url.slice(0, 40); }
    } else {
      hostEl.textContent = '未检测到标签页';
    }
  });

  function query() {
    getActiveTab().then(function (tab) {
      if (!tab) {
        resultEl.innerHTML = '<span class="kv-empty">未检测到活动标签页</span>';
        return;
      }
      if (!tab.url || !/^https?:\/\//.test(tab.url)) {
        resultEl.innerHTML = '<span class="kv-empty">当前页面协议非 http/https（' + esc(tab.url || '无URL') + '），无法读取 Cookie。<br>请在普通网页上使用。</span>';
        return;
      }
      const url = tab.url;
      chrome.cookies.getAll({ url: url }, function (cookies) {
        const key = keyInput.value.trim();
        btnCopy.disabled = true; btnCopyAll.disabled = true; lastValue = ''; lastAllJson = '';

        if (key) {
          // 查单个
          const found = cookies.filter(function (c) { return c.name === key; });
          if (found.length === 0) {
            resultEl.innerHTML = '<span class="kv-empty">未找到 Cookie: ' + esc(key) + '</span>';
            return;
          }
          const c = found[0];
          resultEl.innerHTML =
            '<div><span class="r-name">name:</span> ' + esc(c.name) + '</div>' +
            '<div><span class="r-name">value:</span> <span class="r-val">' + esc(c.value) + '</span></div>' +
            '<div class="r-meta">domain: ' + esc(c.domain) + ' · path: ' + esc(c.path) + ' · httpOnly: ' + c.httpOnly + '</div>';
          lastValue = c.value;
          btnCopy.disabled = false;
        } else {
          // 列出全部
          if (cookies.length === 0) {
            resultEl.innerHTML = '<span class="kv-empty">该网站无 Cookie</span>';
            return;
          }
          let html = '<table><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody>';
          const obj = {};
          cookies.forEach(function (c) {
            html += '<tr><td>' + esc(c.name) + '</td><td>' + esc(c.value) + '</td></tr>';
            obj[c.name] = c.value;
          });
          html += '</tbody></table>';
          resultEl.innerHTML = html;
          lastAllJson = JSON.stringify(obj, null, 2);
          btnCopyAll.disabled = false;
        }
      });
    });
  }

  let timer = null;
  keyInput.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(query, 300);
  });
  document.getElementById('cookieQuery').addEventListener('click', query);
  btnCopy.addEventListener('click', function () { if (lastValue) MX.copy(lastValue); });
  btnCopyAll.addEventListener('click', function () { if (lastAllJson) MX.copy(lastAllJson); });
}

// ============================================================
// LocalStorage 视图
// ============================================================
function initLsView() {
  const keyInput = document.getElementById('lsKey');
  const resultEl = document.getElementById('lsResult');
  const hostEl = document.getElementById('lsHost');
  const btnCopy = document.getElementById('lsCopy');
  const btnCopyAll = document.getElementById('lsCopyAll');
  let lastValue = '', lastAllJson = '';

  getActiveTab().then(function (tab) {
    if (tab && tab.url) {
      try { hostEl.textContent = new URL(tab.url).hostname; }
      catch (e) { hostEl.textContent = tab.url.slice(0, 40); }
    } else {
      hostEl.textContent = '未检测到标签页';
    }
  });

  // 注入脚本到目标页
  function inject(func, args) {
    return getActiveTab().then(function (tab) {
      if (!tab) throw new Error('未检测到活动标签页');
      if (!tab.url || !/^https?:\/\//.test(tab.url)) throw new Error('当前页面协议非 http/https（' + (tab.url || '无URL') + '），请在普通网页上使用');
      // 用 Promise 形式调用 executeScript
      return chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: func,
        args: args || []
      });
    }).then(function (results) {
      if (!results || results.length === 0) throw new Error('注入失败：无返回值');
      return results[0].result;
    });
  }

  function query() {
    const key = keyInput.value.trim();
    btnCopy.disabled = true; btnCopyAll.disabled = true; lastValue = ''; lastAllJson = '';
    resultEl.innerHTML = '<span class="kv-empty">查询中...</span>';

    if (key) {
      inject(window.__mxReadItem, [key]).then(function (res) {
        if (!res || !res.ok) { resultEl.innerHTML = '<span class="kv-empty">读取失败: ' + esc(res ? res.error : '无返回') + '</span>'; return; }
        if (res.value === null) { resultEl.innerHTML = '<span class="kv-empty">未找到 Key: ' + esc(key) + '</span>'; return; }
        resultEl.innerHTML =
          '<div><span class="r-name">key:</span> ' + esc(key) + '</div>' +
          '<div><span class="r-name">value:</span> <span class="r-val">' + esc(res.value) + '</span></div>' +
          '<div class="r-meta">长度: ' + res.value.length + ' 字符</div>';
        lastValue = res.value;
        btnCopy.disabled = false;
      }).catch(function (err) {
        resultEl.innerHTML = '<span class="kv-empty">[err] ' + esc(err.message || err) + '</span>';
      });
    } else {
      inject(window.__mxReadAll, []).then(function (res) {
        if (!res || !res.ok) { resultEl.innerHTML = '<span class="kv-empty">读取失败: ' + esc(res ? res.error : '无返回') + '</span>'; return; }
        if (res.count === 0) { resultEl.innerHTML = '<span class="kv-empty">LocalStorage 为空</span>'; return; }
        let html = '<table><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>';
        Object.keys(res.items).forEach(function (k) {
          html += '<tr><td>' + esc(k) + '</td><td>' + esc(res.items[k]) + '</td></tr>';
        });
        html += '</tbody></table>';
        resultEl.innerHTML = html;
        lastAllJson = JSON.stringify(res.items, null, 2);
        btnCopyAll.disabled = false;
      }).catch(function (err) {
        resultEl.innerHTML = '<span class="kv-empty">[err] ' + esc(err.message || err) + '</span>';
      });
    }
  }

  let timer = null;
  keyInput.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(query, 300);
  });
  document.getElementById('lsQuery').addEventListener('click', query);
  btnCopy.addEventListener('click', function () { if (lastValue) MX.copy(lastValue); });
  btnCopyAll.addEventListener('click', function () { if (lastAllJson) MX.copy(lastAllJson); });
}

// ============================================================
// 注入到目标页面的函数（必须是全局独立函数，不能是闭包，否则无法序列化）
// ============================================================
// 读取单个 localStorage key
window.__mxReadItem = function (k) {
  try { return { ok: true, value: localStorage.getItem(k) }; }
  catch (e) { return { ok: false, error: e.message }; }
};
// 读取全部 localStorage
window.__mxReadAll = function () {
  try {
    var items = {};
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      items[key] = localStorage.getItem(key);
    }
    return { ok: true, items: items, count: localStorage.length };
  } catch (e) { return { ok: false, error: e.message }; }
};
