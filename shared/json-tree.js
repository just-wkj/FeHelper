/* ===== JSON 树形视图渲染器 ===== */
// 用法: MX.jsonTree(container, data)  data 为已解析的 JS 对象
(function () {
  'use strict';
  const MX = window.MX = window.MX || {};

  MX.jsonTree = function (container, data, opts) {
    opts = opts || {};
    container.innerHTML = '';
    container.className = 'jtree';
    let count = 0;
    const COUNT_LIMIT = 5000;

    function build(value, key, path) {
      // 路径计算
      const type = typeOf(value);
      const row = document.createElement('div');
      row.className = 'jtree-row jtree-type-' + type;

      // 折叠箭头（容器类型才有）
      if (type === 'object' || type === 'array') {
        const arrow = document.createElement('span');
        arrow.className = 'jtree-arrow';
        arrow.textContent = '▸';
        row.appendChild(arrow);
        arrow.addEventListener('click', function (e) { e.stopPropagation(); toggle(row); });
      } else {
        const pad = document.createElement('span');
        pad.className = 'jtree-arrow-pad';
        row.appendChild(pad);
      }

      // key
      if (key != null) {
        const keyEl = document.createElement('span');
        keyEl.className = 'jtree-key';
        keyEl.textContent = type === 'array' ? key : '"' + key + '"';
        row.appendChild(keyEl);
        const colon = document.createElement('span'); colon.textContent = ': ';
        row.appendChild(colon);
      }

      // value / 预览
      const valEl = document.createElement('span');
      valEl.className = 'jtree-value jtree-v-' + type;
      if (type === 'object' || type === 'array') {
        const keys = type === 'array' ? value : Object.keys(value);
        valEl.textContent = (type === 'array' ? '[' + keys.length + ']' : '{' + keys.length + '}');
        row.appendChild(valEl);
        // 子节点
        const children = document.createElement('div');
        children.className = 'jtree-children';
        if (type === 'array') {
          value.forEach(function (v, i) { children.appendChild(build(v, i, path + '[' + i + ']')); });
        } else {
          Object.keys(value).forEach(function (k) { children.appendChild(build(value[k], k, path + (path ? '.' : '') + safeKey(k))); });
        }
        row.appendChild(children);
      } else {
        valEl.textContent = formatLeaf(value, type);
        row.appendChild(valEl);
      }

      // 路径复制（hover 显示）
      row.dataset.path = path || '$';
      row.addEventListener('mouseenter', function () { showPath(row); });
      row.addEventListener('click', function (e) {
        if (e.target.classList.contains('jtree-arrow')) return;
        const p = row.dataset.path;
        MX.copy(p);
      });
      count++;
      return row;
    }

    function typeOf(v) {
      if (v === null) return 'null';
      if (Array.isArray(v)) return 'array';
      return typeof v;
    }
    function formatLeaf(v, t) {
      if (t === 'string') return '"' + v + '"';
      if (t === 'null') return 'null';
      if (t === 'undefined') return 'undefined';
      return String(v);
    }
    function safeKey(k) { return /^[A-Za-z_$][\w$]*$/.test(k) ? k : '["' + k + '"]'; }
    function toggle(row) {
      const closed = row.classList.toggle('jtree-closed');
      const arrow = row.querySelector('.jtree-arrow');
      if (arrow) arrow.textContent = closed ? '▸' : '▾';
    }
    function showPath(row) {
      // 用 title 做轻量提示，避免浮动元素复杂管理
      row.title = '点击复制路径: ' + row.dataset.path;
    }

    container.appendChild(build(data, null, '$'));

    if (count > COUNT_LIMIT) return { overLimit: true, count: count };
    return { overLimit: false, count: count };
  };
})();
