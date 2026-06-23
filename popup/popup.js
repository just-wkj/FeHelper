'use strict';
const TOOLS = [
  { id: 'qr',     icon: '⊟', cls: 'ic-qr',     name: '二维码工具',   desc: '生成二维码 / 图片识别解码' },
  { id: 'json',   icon: '{ }', cls: 'ic-json',   name: 'JSON 美化',    desc: '格式化、压缩、校验、树形折叠' },
  { id: 'encode', icon: '⇄',  cls: 'ic-encode', name: '编码转换',     desc: 'Base64 / URL / HTML / Unicode / Hex / 哈希' },
  { id: 'excel',  icon: '▦',  cls: 'ic-excel',  name: 'Excel 转 JSON', desc: 'xlsx / xls / csv 解析导出' }
];

document.addEventListener('DOMContentLoaded', function () {
  const list = document.getElementById('toolList');
  TOOLS.forEach(function (t) {
    const item = document.createElement('div');
    item.className = 'pp-item';
    item.innerHTML =
      '<div class="icon ' + t.cls + '">' + t.icon + '</div>' +
      '<div class="info"><div class="name">' + t.name + '</div><div class="desc">' + t.desc + '</div></div>' +
      '<div class="arrow">›</div>';
    item.addEventListener('click', function () { openTool(t.id); });
    list.appendChild(item);
  });
});

function openTool(id) {
  const url = chrome.runtime.getURL('tools/' + id + '/index.html');
  chrome.tabs.create({ url: url });
}
