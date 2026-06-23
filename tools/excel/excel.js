'use strict';
document.getElementById('backBtn').addEventListener('click', function () {
  location.href = chrome.runtime.getURL('popup/popup.html');
});

const uploadStage = document.getElementById('uploadStage');
const resultStage = document.getElementById('resultStage');
const sheetTabs = document.getElementById('sheetTabs');
const previewBody = document.getElementById('previewBody');
const jsonOut = document.getElementById('jsonOut');
const meta = document.getElementById('meta');
const trimHeader = document.getElementById('trimHeader');

let workbook = null;
let currentSheet = null;

// ===== 上传 =====
MX.bindDrop(document.getElementById('dropZone'), function (file) {
  parseFile(file);
}, { accept: '.xlsx,.xls,.csv', maxSize: 10 * 1024 * 1024 });

document.getElementById('btnReupload').addEventListener('click', function () {
  uploadStage.style.display = 'block';
  resultStage.style.display = 'none';
  workbook = null; currentSheet = null;
});

function parseFile(file) {
  const isCsv = /\.csv$/i.test(file.name);
  // CSV 是文本文件，必须用 readAsText 读取再以 string 类型解析，否则 UTF-8 中文会乱码；
  // xlsx/xls 是二进制格式，用 ArrayBuffer。
  const readType = isCsv ? 'text' : 'arraybuffer';
  MX.readFile(file, readType).then(function (data) {
    try {
      const wb = isCsv ? XLSX.read(data, { type: 'string' }) : XLSX.read(data, { type: 'array' });
      workbook = wb;
      // 渲染 sheet tab
      sheetTabs.innerHTML = '';
      wb.SheetNames.forEach(function (name, idx) {
        const b = document.createElement('button');
        b.textContent = name;
        b.addEventListener('click', function () { selectSheet(name); });
        sheetTabs.appendChild(b);
      });
      const first = wb.SheetNames[0];
      selectSheet(first);
      uploadStage.style.display = 'none';
      resultStage.style.display = 'block';
      MX.toast('解析成功：' + wb.SheetNames.length + ' 个 sheet', 'success');
    } catch (e) {
      MX.toast('解析失败：' + e.message, 'error');
    }
  }, function () { MX.toast('文件读取失败', 'error'); });
}

function selectSheet(name) {
  currentSheet = name;
  sheetTabs.querySelectorAll('button').forEach(function (b) { b.classList.toggle('active', b.textContent === name); });
  refresh();
}

trimHeader.addEventListener('change', refresh);

function refresh() {
  if (!workbook || !currentSheet) return;
  const ws = workbook.Sheets[currentSheet];
  // sheet_to_json: 第一行作为表头
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const headers = (aoa[0] || []).map(function (h, i) {
    return trimHeader.checked ? String(h).trim() : String(h);
  });

  // 预览表格
  renderPreview(headers, aoa);
  // JSON 输出：用处理后的 headers 重建对象
  const json = buildJson(headers, aoa);
  jsonOut.value = JSON.stringify(json, null, 2);
  meta.textContent = (aoa.length - 1) + ' 行 · ' + headers.length + ' 列';
}

function buildJson(headers, aoa) {
  const arr = [];
  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (row.length === 0 || row.every(function (c) { return c === '' || c == null; })) continue;
    const obj = {};
    headers.forEach(function (h, i) {
      obj[h] = row[i] !== undefined ? row[i] : '';
    });
    arr.push(obj);
  }
  return arr;
}

function renderPreview(headers, aoa) {
  const maxRows = 20;
  let html = '<table class="tbl-preview"><thead><tr>';
  html += '<th>#</th>';
  headers.forEach(function (h) { html += '<th>' + esc(h) + '</th>'; });
  html += '</tr></thead><tbody>';
  for (let r = 1; r < Math.min(maxRows + 1, aoa.length); r++) {
    html += '<tr><td>' + r + '</td>';
    headers.forEach(function (_, i) { html += '<td>' + esc(aoa[r][i] !== undefined ? aoa[r][i] : '') + '</td>'; });
    html += '</tr>';
  }
  html += '</tbody></table>';
  if (aoa.length - 1 > maxRows) html += '<div class="mx-muted" style="padding:8px 12px;">仅显示前 ' + maxRows + ' 行，共 ' + (aoa.length - 1) + ' 行</div>';
  previewBody.innerHTML = html;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

document.getElementById('btnCopy').addEventListener('click', function () { MX.copy(jsonOut.value); });
document.getElementById('btnDownload').addEventListener('click', function () {
  if (jsonOut.value) { MX.download(currentSheet + '.json', jsonOut.value, 'application/json'); MX.toast('已下载', 'success'); }
});
