'use strict';
// 返回菜单
document.getElementById('backBtn').addEventListener('click', function () {
  location.href = chrome.runtime.getURL('popup/popup.html');
});

MX.tabs(document.getElementById('qrTabs'));

/* ===== 生成 ===== */
const genText = document.getElementById('genText');
const genSize = document.getElementById('genSize');
const genLevel = document.getElementById('genLevel');
const preview = document.getElementById('qrPreview');
let qrcode = null;
let lastDataURL = '';

function renderQR() {
  const text = genText.value.trim();
  preview.innerHTML = '';
  if (!text) {
    preview.innerHTML = '<div class="qr-empty">输入内容后会在此预览二维码</div>';
    lastDataURL = '';
    return;
  }
  const size = parseInt(genSize.value, 10);
  preview.innerHTML = '';
  // QRCode 构造会自动 append 到容器
  try {
    qrcode = new QRCode(preview, {
      text: text,
      width: size,
      height: size,
      correctLevel: levelMap[genLevel.value]
    });
    // QRCode 库异步生成 img，等一下取 dataURL
    setTimeout(function () {
      const img = preview.querySelector('img') || preview.querySelector('canvas');
      if (img && img.tagName === 'IMG') lastDataURL = img.src;
      else if (img && img.tagName === 'CANVAS') lastDataURL = img.toDataURL('image/png');
    }, 60);
  } catch (err) {
    preview.innerHTML = '<div class="qr-empty">生成失败：内容过长</div>';
    MX.toast('生成失败，内容可能过长', 'error');
  }
}
const levelMap = { L: QRCode.CorrectLevel.L, M: QRCode.CorrectLevel.M, Q: QRCode.CorrectLevel.Q, H: QRCode.CorrectLevel.H };

let timer = null;
genText.addEventListener('input', function () {
  clearTimeout(timer);
  timer = setTimeout(renderQR, 250);
});
genSize.addEventListener('change', renderQR);
genLevel.addEventListener('change', renderQR);

// 通过 canvas 生成高清 PNG
function getCanvas(text) {
  const size = parseInt(genSize.value, 10);
  // 复用库内部 _oDrawing._bIsPainted 不可靠，这里用 dataURL 转 canvas
  return new Promise(function (resolve, reject) {
    const img = new Image();
    img.onload = function () {
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      resolve(c);
    };
    img.onerror = reject;
    img.src = lastDataURL || preview.querySelector('img') && preview.querySelector('img').src;
  });
}

document.getElementById('dlPng').addEventListener('click', function () {
  if (!genText.value.trim()) { MX.toast('请先输入内容', 'warn'); return; }
  getCanvas().then(function (c) {
    c.toBlob(function (blob) { MX.download('qrcode.png', blob); MX.toast('已下载', 'success'); }, 'image/png');
  });
});

document.getElementById('copyImg').addEventListener('click', function () {
  if (!genText.value.trim()) { MX.toast('请先输入内容', 'warn'); return; }
  getCanvas().then(function (c) {
    c.toBlob(function (blob) {
      if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
        const item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]).then(function () { MX.toast('图片已复制', 'success'); }, function () { MX.toast('复制失败，请用下载', 'error'); });
      } else {
        MX.toast('当前环境不支持复制图片，请用下载', 'warn');
      }
    }, 'image/png');
  });
});

/* ===== 解码 ===== */
const dropZone = document.getElementById('dropZone');
const decodeResult = document.getElementById('decodeResult');
const decodeText = document.getElementById('decodeText');
const decodeImg = document.getElementById('decodeImg');
let activeTab = 'gen';

// 记录当前激活的 tab，粘贴只在「解码」tab 生效
document.getElementById('qrTabs')._onTabChange = function (group) { activeTab = group; };

MX.bindDrop(dropZone, function (file) {
  doDecode(file);
}, { accept: 'image/*', maxSize: 10 * 1024 * 1024 });

// 粘贴图片：监听全局 paste，仅在「解码」tab 且剪贴板含图片时触发
document.addEventListener('paste', function (e) {
  if (activeTab !== 'decode') return;
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image/') === 0) {
      const file = items[i].getAsFile();
      if (file) {
        e.preventDefault();
        doDecode(file);
        return;
      }
    }
  }
});

document.getElementById('reDecode').addEventListener('click', function () {
  dropZone.style.display = 'block';
  decodeResult.style.display = 'none';
  decodeImg.removeAttribute('src');
});
document.getElementById('copyDecode').addEventListener('click', function () { MX.copy(decodeText.textContent); });

function doDecode(file) {
  MX.readFile(file, 'dataurl').then(function (dataURL) {
    // 显示原图预览
    decodeImg.src = dataURL;
    const img = new Image();
    img.onload = function () {
      // 缩放到合理尺寸提升解析速度
      const maxEdge = 1000;
      let w = img.width, h = img.height;
      const scale = Math.min(1, maxEdge / Math.max(w, h));
      w = Math.max(1, Math.round(w * scale)); h = Math.max(1, Math.round(h * scale));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const code = jsQR(imgData.data, imgData.width, imgData.height);
      if (code && code.data) {
        // 去除部分二维码编码可能携带的 BOM / 首尾空白
        const text = code.data.replace(/^\uFEFF/, '').replace(/\uFEFF$/, '');
        decodeText.textContent = text;
        dropZone.style.display = 'none';
        decodeResult.style.display = 'block';
        MX.toast('识别成功', 'success');
      } else {
        // 识别失败也展示图片，方便用户确认
        dropZone.style.display = 'none';
        decodeResult.style.display = 'block';
        decodeText.textContent = '（未识别到二维码）';
        MX.toast('未识别到二维码', 'error');
      }
    };
    img.onerror = function () { MX.toast('图片加载失败', 'error'); };
    img.src = dataURL;
  }, function () { MX.toast('文件读取失败', 'error'); });
}

// 初始化
renderQR();
