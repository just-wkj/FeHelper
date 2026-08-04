'use strict';
const input = document.getElementById('input');
const output = document.getElementById('output');
const treeView = document.getElementById('treeView');
const outputBody = document.getElementById('outputBody');
const errBanner = document.getElementById('errBanner');
const okBanner = document.getElementById('okBanner');
const inputInfo = document.getElementById('inputInfo');

document.getElementById('backBtn').addEventListener('click', function () {
  location.href = chrome.runtime.getURL('popup/popup.html');
});

let currentView = 'text';

function showErr(msg) { errBanner.textContent = msg; errBanner.classList.add('show'); okBanner.classList.remove('show'); }
function showOk(msg) { okBanner.textContent = msg; okBanner.classList.add('show'); errBanner.classList.remove('show'); }
function clearBanner() { errBanner.classList.remove('show'); okBanner.classList.remove('show'); }

function getIndent() {
  const v = document.getElementById('indent').value;
  return v === '\\t' ? '\t' : parseInt(v, 10);
}

// 安全解析，返回 {ok, value, error}
function tryParse(str) {
  try { return { ok: true, value: JSON.parse(str) }; }
  catch (e) { return { ok: false, error: e }; }
}

// 语法高亮渲染（接收已格式化的 JSON 字符串）
function highlight(jsonStr) {
  const esc = jsonStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)/g,
    function (match) {
      let cls = 'tk-number';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'tk-key' : 'tk-string';
      } else if (/true|false/.test(match)) {
        cls = 'tk-bool';
      } else if (/null/.test(match)) {
        cls = 'tk-null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    }
  );
}

function setOutputText(text) {
  output.style.display = 'block';
  treeView.style.display = 'none';
  output.innerHTML = highlight(text) || '<span class="empty-out">点击「格式化」查看结果</span>';
}
function setOutputEmpty() {
  output.innerHTML = '<span class="empty-out">点击「格式化」查看结果</span>';
  treeView.innerHTML = '';
}

// 在错误信息里补充行列号
function locateError(str, err) {
  // 方式1: V8 含 position 信息（"position N"）
  let pos = null;
  const m1 = /position (\d+)/.exec(err.message);
  if (m1) pos = parseInt(m1[1], 10);
  // 方式2: V8/JSON 报错里带源码片段 "(line:col)" 或 "at line N column M"
  if (pos == null) {
    const m2 = /at line (\d+) column (\d+)/i.exec(err.message);
    if (m2) return '第 ' + m2[1] + ' 行, 第 ' + m2[2] + ' 列: ' + err.message;
  }
  // 方式3: 错误信息里包含出错的源码片段，在原文中搜索首个出现位置来反推行列
  if (pos == null) {
    const frag = /in JSON at position \d+\s*[\s\S]*?`([^`]+)`/.exec(err.message);
    if (!frag) {
      // V8 风格: 'Unexpected token X "..." is not valid JSON' -> 取被引号包裹的源码段
      const seg = /"([^"]+)"\s+is not valid JSON/.exec(err.message);
      if (seg) {
        const idx = str.indexOf(seg[1]);
        if (idx >= 0) pos = idx;
      }
    }
  }
  if (pos != null && pos <= str.length) {
    const before = str.substring(0, pos);
    const line = before.split('\n').length;
    const col = pos - (before.lastIndexOf('\n') >= 0 ? before.lastIndexOf('\n') : -1);
    return '第 ' + line + ' 行, 第 ' + col + ' 列: ' + err.message;
  }
  return err.message;
}

// 将已解析的值渲染到输出区（文本/树形）。合法时不提示，仅清除残留的错误提示。
function renderResult(value) {
  if (currentView === 'tree') {
    renderTree(value);
  } else {
    setOutputText(JSON.stringify(value, null, getIndent()));
  }
  clearBanner();
}

// ===== 格式化（手动，点击按钮时显示错误） =====
document.getElementById('btnFormat').addEventListener('click', function () {
  const raw = input.value.trim();
  if (!raw) { showErr('输入为空'); setOutputEmpty(); return; }
  const r = tryParse(raw);
  if (!r.ok) { showErr('解析错误：' + locateError(raw, r.error)); setOutputEmpty(); return; }
  renderResult(r.value);
});

// ===== 输入时自动格式化（防抖；输入未完成、尚未构成合法 JSON 时静默不打扰） =====
let autoFormatTimer = null;
function scheduleAutoFormat() {
  clearTimeout(autoFormatTimer);
  autoFormatTimer = setTimeout(function () {
    const raw = input.value.trim();
    if (!raw) { clearBanner(); setOutputEmpty(); return; }
    const r = tryParse(raw);
    if (!r.ok) { clearBanner(); return; } // 仍在输入中，不弹错误
    renderResult(r.value);
  }, 300);
}

// ===== 压缩 =====
document.getElementById('btnMinify').addEventListener('click', function () {
  const raw = input.value.trim();
  if (!raw) { showErr('输入为空'); setOutputEmpty(); return; }
  const r = tryParse(raw);
  if (!r.ok) { showErr('解析错误：' + locateError(raw, r.error)); setOutputEmpty(); return; }
  setOutputText(JSON.stringify(r.value));
  showOk('✓ 已压缩');
});

// ===== 校验 =====
document.getElementById('btnValidate').addEventListener('click', function () {
  const raw = input.value.trim();
  if (!raw) { showErr('输入为空'); return; }
  const r = tryParse(raw);
  if (!r.ok) { showErr('✗ 解析错误：' + locateError(raw, r.error)); return; }
  showOk('✓ 合法 JSON');
});

// ===== 转义 / 反转义（对输入框内的字符串进行处理） =====
document.getElementById('btnEscape').addEventListener('click', function () {
  input.value = input.value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
  MX.toast('已转义', 'success');
});
document.getElementById('btnUnescape').addEventListener('click', function () {
  input.value = input.value.replace(/\\t/g, '\t').replace(/\\r/g, '\r').replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  MX.toast('已反转义', 'success');
});

// ===== 视图切换 =====
document.querySelectorAll('.view-switch [data-view]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.view-switch [data-view]').forEach(function (b) { b.classList.toggle('active', b === btn); });
    currentView = btn.dataset.view;
    if (currentView === 'tree') {
      const raw = input.value.trim();
      const r = raw ? tryParse(raw) : { ok: false };
      if (r.ok) renderTree(r.value);
      else { setOutputText(''); output.innerHTML = '<span class="empty-out">先输入合法 JSON 再切换树形视图</span>'; }
    } else {
      const raw = output.textContent;
      if (raw && raw !== '点击「格式化」查看结果') {
        // 用已有合法数据重新格式化输出文本
        const rr = tryParse(input.value.trim());
        if (rr.ok) setOutputText(JSON.stringify(rr.value, null, getIndent()));
      }
    }
  });
});

function renderTree(data) {
  output.style.display = 'none';
  treeView.style.display = 'block';
  const res = MX.jsonTree(treeView, data);
  if (res.overLimit) {
    MX.toast('节点数 ' + res.count + ' 超过 5000，建议用文本视图', 'warn');
  }
}

// ===== 复制 / 下载 / 上传 =====
document.getElementById('btnCopy').addEventListener('click', function () {
  if (currentView === 'tree') { MX.toast('树形视图下请点击节点复制路径', 'warn'); return; }
  const txt = output.textContent;
  if (txt) MX.copy(txt); else MX.toast('暂无内容', 'warn');
});
document.getElementById('btnDownload').addEventListener('click', function () {
  const txt = currentView === 'tree' ? JSON.stringify(tryParse(input.value).value, null, 2) : output.textContent;
  if (txt) { MX.download('beautified.json', txt, 'application/json'); MX.toast('已下载', 'success'); }
  else MX.toast('暂无内容', 'warn');
});
const fileInput = document.getElementById('fileInput');
document.getElementById('btnUpload').addEventListener('click', function () { fileInput.click(); });
fileInput.addEventListener('change', function () {
  if (!fileInput.files[0]) return;
  const f = fileInput.files[0];
  if (f.size > 10 * 1024 * 1024) { MX.toast('文件超过 10MB', 'error'); return; }
  MX.readFile(f, 'text').then(function (txt) { input.value = txt; updateInputInfo(); scheduleAutoFormat(); MX.toast('已加载文件', 'success'); });
  fileInput.value = '';
});

function updateInputInfo() {
  const len = input.value.length;
  inputInfo.textContent = len ? len + ' 字符' : '';
}
input.addEventListener('input', function () { clearBanner(); updateInputInfo(); scheduleAutoFormat(); });
document.getElementById('indent').addEventListener('change', function () {
  // 重新格式化已有输出
  const r = tryParse(input.value.trim());
  if (r.ok && currentView === 'text') setOutputText(JSON.stringify(r.value, null, getIndent()));
});

setOutputEmpty();
updateInputInfo();
