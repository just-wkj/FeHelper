# 莫一兮工具箱 Chrome 插件 设计文档

> 日期：2026-06-23
> 状态：待评审

## 1. 背景与目标

做一个类似 FEHelper 的 Chrome 插件「**莫一兮工具箱**」。点击工具栏图标弹出工具菜单，选中工具后在新标签页打开独立工具页面。

首期包含 4 个工具：

1. **二维码编码 / 解码** — 生成二维码、上传图片解码
2. **JSON 美化** — 格式化、压缩、校验、错误定位，文本视图 + 树形折叠视图
3. **信息编码转换** — Base64 / URL / HTML 实体 / Unicode / Hex / 哈希
4. **Excel → JSON** — 解析 xlsx/xls/csv，多 sheet 选择，导出 JSON

## 2. 非目标（YAGNI）

- 不做云端同步、账号、设置持久化（除 localStorage 本地偏好）
- 不做右键菜单、快捷键、Omnibox
- 不做网页截图解码二维码
- 不做 JSON ↔ CSV / XML / YAML 等格式互转（仅美化与树形）
- 不做 Excel 反向（JSON → Excel）
- 不引入构建工具链（保持原生 JS）

## 3. 架构

### 3.1 整体方案

**方案 A：工具页独立 + 共享层。** 每个工具一个独立 HTML 页面，共享一套 `shared/common.*`。工具间互不依赖，可独立开发/调试，加载快。Popup 仅作工具入口。

### 3.2 技术栈

- Chrome Extension **Manifest V3**
- 原生 JS / HTML / CSS，无框架、无构建
- 第三方库（vanilla JS，本地引用）：
  - 二维码生成：`qrcodejs`（`libs/qrcode.min.js`）
  - 二维码解码：`jsQR`（`libs/jsQR.js`）
  - Excel 解析：SheetJS（`libs/xlsx.full.min.js`）
  - 编码转换 / 哈希：原生 + Web Crypto API（无需库）
  - JSON 语法高亮 + 树形视图：自实现

### 3.3 目录结构

```
moyixi_fehelper/
├── manifest.json
├── popup/
│   ├── popup.html / popup.css / popup.js
├── tools/
│   ├── qr/        index.html  qr.css  qr.js
│   ├── json/      index.html  json.css  json.js
│   ├── encode/    index.html  encode.css  encode.js
│   └── excel/     index.html  excel.css  excel.js
├── shared/
│   ├── common.css     # reset + header + 通用按钮/Toast/拖拽区样式
│   ├── common.js      # copy/download/toast/tabs 等工具函数
│   └── json-tree.js   # JSON → 树形 DOM 渲染（JSON 工具专用，可放 tools/json）
├── libs/              # 第三方库本地副本
└── icons/             # icon16/48/128.png
```

## 4. 组件设计

### 4.1 Popup 菜单

- 固定宽 ~360px，自适应高度
- **Header**：深色蓝青渐变背景，标题「莫一兮工具箱」+ 小图标
- **工具列表**：竖向卡片，每张卡 = 图标 + 名称 + 一句话描述
- 交互：点击卡片 → `chrome.tabs.create({ url: chrome.runtime.getURL('tools/xxx/index.html') })`
- 行为：点击图标默认弹出 popup（`default_popup`）

### 4.2 共享层 `shared/common.*`

`common.js` 导出全局工具函数（挂到 `window.MX` 命名空间，避免污染）：

- `MX.copy(text)` — 写剪贴板，返回 Promise；成功/失败弹 Toast
- `MX.download(filename, blob)` — 触发下载
- `MX.toast(msg, type)` — 右上角轻提示
- `MX.tabs(container)` — 简单 Tab 切换封装（data-tab 属性驱动）
- `MX.bindDrop(zone, onFile)` — 统一拖拽上传区绑定

`common.css` 提供：CSS reset、`.mx-header`（工具页顶部栏，含返回 + 标题）、`.mx-btn`、`.mx-toast`、`.mx-dropzone`、`.mx-layout`（左右两栏）等通用类。

### 4.3 二维码工具 `tools/qr`

顶部 Tab：**生成 | 解码**

**生成**
- 输入框（多行），输入即实时生成预览
- 控制：尺寸（128/256/512 px）、容错级别（L/M/Q/H）
- 操作：下载 PNG、复制二维码图片到剪贴板

**解码**
- 拖拽区 / 点击选择图片
- 用 `jsQR` 解析，输出识别出的文本
- 操作：复制文本；失败时提示「未识别到二维码」

### 4.4 JSON 美化工具 `tools/json`

左右两栏：左输入，右输出。顶部工具栏：

- **格式化**（2/4 空格 / Tab 缩进可选）
- **压缩**（单行）
- **校验**（语法正确显示对勾 + 解析耗时；错误显示信息 + 行号列号）
- 视图切换：**文本视图**（语法高亮）/ **树形视图**（折叠展开）
- 操作：上传 .json 文件、复制结果、下载结果、转义/反转义 JSON 字符串（对输入框内容）

**树形视图**（`json-tree.js`，递归渲染）：
- 对象 / 数组可折叠，显示键名、类型徽标、子项数量
- 叶子节点显示值，字符串带引号高亮、数字/布尔/null 区分颜色
- 路径显示：hover 节点显示其 JSONPath（如 `$.users[0].name`），点击复制路径
- 大对象保护：节点数 > 5000 时提示并降级为文本视图

### 4.5 信息编码转换 `tools/encode`

左输入 / 右输出，顶部模式选择（单选）：

| 模式 | 方向 | 实现 |
|---|---|---|
| Base64 | 双向 | `btoa`/`atob`（含 UTF-8 处理） |
| URL 编码 | 双向 | `encodeURIComponent`/`decodeURIComponent` |
| HTML 实体 | 双向 | 自实现转义/反转义表 |
| Unicode（中文 ↔ \uXXXX） | 双向 | `charCodeAt` 拼接 / 正则还原 |
| Hex（十六进制） | 双向 | 字节 ↔ hex 串 |
| MD5 / SHA-1 / SHA-256 | 单向（输出） | Web Crypto API（SHA）；MD5 用轻量实现 |

- 实时转换（输入即输出）
- 一键复制输出
- 「交换」按钮：把输出填回输入（仅双向模式）

### 4.6 Excel → JSON `tools/excel`

- 拖拽 / 点击上传 `.xlsx` `.xls` `.csv`
- SheetJS 解析；多 sheet 时顶部出现 sheet 选择 Tab
- 预览：表格形式显示前 20 行
- 转换规则：**首行作为字段名（key）**，其余行转对象，整体为数组
- 输出：格式化 JSON 文本，可复制、下载 `.json`

## 5. 数据流

所有工具均为**纯前端、无网络请求、无后台脚本**。Popup → 新标签页工具是单向跳转，无状态传递。用户输入的数据仅在当前页面内存中处理，不持久化、不上传。

## 6. 错误处理

- JSON：解析失败 → 显示错误信息 + 行号列号，不破坏已有输出
- 二维码解码：未识别 → Toast 提示，不抛异常
- Excel：格式不支持 / 解析失败 → 提示具体原因
- 编码转换：解码输入非法（如 Base64 字符不合法）→ 输出区显示错误，不闪退
- 文件大小：统一加 10MB 上限校验，超限提示

## 7. 测试策略

手动测试为主（Chrome 开发者模式加载未打包插件）。每个工具的验收清单：

- QR：生成多种内容（URL/中文/长文本）、解码带二维码的 png/jpg
- JSON：合法/非法输入、嵌套、数组、超大文件、树形折叠展开、路径复制
- Encode：每种模式正反向、中文、空输入、非法输入
- Excel：单/多 sheet、csv、空表、含合并单元格提示

## 8. 风险与注意

- **MV3 CSP**：popup 与页面 CSP 限制 inline script，所有 JS 用外部文件 + `addEventListener`，不写内联事件
- **库体积**：SheetJS 较大（~900KB），仅 Excel 工具页引用，不影响其他页面加载
- **图标资源**：需自备 icon16/48/128.png（可先用占位图）

## 9. 待办（不在本期）

- 历史记录、收藏常用工具
- 暗色模式
- 更多工具（颜色转换、时间戳、正则测试等）
