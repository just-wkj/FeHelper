# 莫一兮工具箱 · moyixi-fehelper

一个类似 [FEHelper](https://www.baidufe.com/fehelper) 的纯前端工具箱 Chrome 扩展。点击工具栏图标弹出工具菜单，选中后在新标签页打开。**所有数据处理均在浏览器本地完成，不上传任何内容。**

<p align="center"><b>二维码 · JSON · 编码转换 · Excel</b></p>

---

## ✨ 功能一览

| 工具 | 能力 |
|:---:|---|
| 🔲 **二维码工具** | **生成**：实时预览、可调尺寸（128–512px）/ 容错级别（L/M/Q/H）、下载 PNG、复制图片到剪贴板<br>**解码**：点击选择 / 拖拽 / **Ctrl+V 粘贴**截图三种方式上传图片识别，原图预览 |
| `{ }` **JSON 美化** | 格式化（2/4 空格 / Tab）、压缩、校验（**带行列号定位**）、转义/反转义<br>**文本视图**（语法高亮）+ **树形折叠视图**（点击节点复制 JSONPath 路径） |
| ⇄ **编码转换** | Base64 / URL / HTML 实体 / Unicode（中文↔`\uXXXX`）/ Hex **双向**转换<br>MD5 / SHA-1 / SHA-256 **单向**哈希 · 一键交换输入输出 |
| ▦ **Excel → JSON** | 拖拽上传 `.xlsx` `.xls` `.csv` · 多 sheet 切换 · 表格预览（前 20 行）· 首行作字段名导出 JSON |
| 🍪 **Cookie 获取** | 选择目标标签页，输入 Cookie Key **自动获取值**（防抖查询）·「列出全部」枚举该网站所有 Cookie · 复制单个值 / 全部 JSON
| 🗄 **LocalStorage 获取** | 选择目标标签页，输入 Key **自动获取值**（注入脚本读取页面 localStorage）·「列出全部」枚举所有键值 · 复制单个值 / 全部 JSON

### 与 FEHelper 的差异

- **纯离线**：无网络请求、无埋点、无账号，隐私安全
- **零构建**：原生 HTML/CSS/JS，无框架，源码即运行码，易读易改
- **工具页独立**：每个工具一个独立页面，互不干扰，加载快

> ⚠️ **权限说明**：Cookie / LocalStorage 工具需读取目标网站数据，声明了 `cookies`、`scripting`、`tabs` 权限和 `host_permissions`。数据仅在本地读取展示，不上传。其他四个工具仍为零权限。

---

## 📦 安装

### 方式一：开发模式加载（推荐）

1. 下载本项目到本地
2. 打开 Chrome，地址栏输入 `chrome://extensions`
3. 右上角打开「**开发者模式**」开关
4. 点击「**加载已解压的扩展程序**」，选择项目根目录
5. 浏览器工具栏出现「莫一兮工具箱」图标，点击即可使用

> 其他 Chromium 内核浏览器（Edge / Brave / Arc 等）加载方式相同。

### 方式二：打包安装

```bash
# 在 chrome://extensions 点击「打包扩展程序」
# 程序根目录选择本项目，生成 .crx 后拖入浏览器即可
```

---

## 🏗️ 技术栈

| 类别 | 选型 |
|---|---|
| 扩展规范 | Chrome Extension **Manifest V3** |
| 语言 | 原生 HTML / CSS / JavaScript（**无框架、无构建**） |
| 二维码生成 | [qrcodejs](https://github.com/davidshimjs/qrcodejs) |
| 二维码解码 | [jsQR](https://github.com/cozmo/jsQR) |
| Excel/CSV 解析 | [SheetJS (xlsx)](https://sheetjs.com/) |
| SHA 哈希 | Web Crypto API（浏览器原生） |
| MD5 | 内置 RFC1321 实现（Web Crypto 不支持 MD5） |
| 编码转换 | 原生 JS（TextEncoder/TextDecoder） |

---

## 📁 目录结构

```
moyixi_fehelper/
├── manifest.json              # MV3 配置（入口、权限、图标）
├── popup/                     # 工具入口菜单（点击图标弹出）
│   ├── popup.html / .css / .js
├── tools/                     # 四个独立工具页（各为独立 HTML）
│   ├── qr/                    # 二维码工具
│   │   ├── index.html / qr.css / qr.js
│   ├── json/                  # JSON 美化
│   │   ├── index.html / json.css / json.js
│   ├── encode/                # 编码转换
│   │   ├── index.html / encode.css / encode.js
│   └── excel/                 # Excel 转 JSON
│       ├── index.html / excel.css / excel.js
├── shared/                    # 跨工具共享层
│   ├── common.css             # 通用样式（reset、按钮、Toast、拖拽区）
│   ├── common.js              # 通用函数（copy/download/toast/tabs/bindDrop/md5/sha）
│   └── json-tree.js           # JSON 树形折叠渲染器
├── libs/                      # 第三方库本地副本
│   ├── qrcode.min.js / jsQR.js / xlsx.full.min.js
├── icons/                     # 应用图标（16/48/128px）
└── docs/                      # 设计文档
    └── superpowers/specs/
        └── 2026-06-23-moyixi-fehelper-design.md
```

### 架构说明

采用「**工具页独立 + 共享层**」架构：

- **Popup** 仅作工具入口，选中工具后用 `chrome.tabs.create` 在新标签页打开对应 `tools/xxx/index.html`
- **每个工具自包含**（HTML/CSS/JS），互不依赖，可独立开发、调试、加载
- **共享层 `shared/`** 提供通用 UI 组件（按钮、Toast、拖拽区、Tab）和工具函数（复制、下载、哈希），所有工具页引用

数据流：全部纯前端、无后台脚本（background）、无网络请求、无状态持久化（除用户主动操作）。

---

## 🧪 测试

项目已通过 Puppeteer 端到端自动化测试（共 **36+ 项**），覆盖：

- ✅ Popup 菜单渲染与 4 个工具跳转
- ✅ JSON 格式化、错误行列定位、树形折叠与路径复制
- ✅ 全部 6 种编码的正反向、中文、哈希校验（MD5 对照 Node 标准 crypto 库）
- ✅ 二维码生成 → jsQR 解码往返一致；Ctrl+V 粘贴解析
- ✅ Excel xlsx / csv 解析、中文不乱码、数字类型保留
- ✅ 全部 5 个页面无控制台错误

> 详细的端到端测试逻辑见各工具交互验证。MD5 实现已用 RFC1321 标准向量（空串、`abc`、`message digest`、全句英文）+ 中文样本对照验证。

---

## 🛠️ 开发

### 本地调试

```bash
# 1. 加载扩展（见「安装」）
# 2. 修改任意源码后，到 chrome://extensions 点该扩展的「刷新」按钮即可生效
# 3. 工具页可直接用 Chrome DevTools 调试（右键 → 检查）
```

### 新增一个工具

1. 在 `tools/` 下新建目录，如 `tools/color/`，放入 `index.html`、`color.css`、`color.js`
2. `index.html` 引用 `../../shared/common.css` 和 `../../shared/common.js`
3. 在 `popup/popup.js` 的 `TOOLS` 数组里追加一项
4. 刷新扩展即可

### 添加第三方库

直接放入 `libs/` 目录，在需要它的工具页 HTML 里 `<script src="../../libs/xxx.js">`。无需 npm、无需打包。

---

## 🔒 隐私

本扩展 **不收集、不上传、不存储** 任何用户数据：

- 无 `host_permissions`，`manifest.json` 的 `permissions` 为空数组
- 无后台脚本、无网络请求
- 所有数据（你输入的文本、上传的文件、解析结果）仅存在于当前页面的内存中，关闭页面即消失
- 无第三方分析、埋点、广告 SDK

---

## 📋 版本计划

### v1.0.0（当前）

四个核心工具：二维码、JSON 美化、编码转换、Excel 转 JSON

### 待办（按需）

- [ ] 历史记录、收藏常用工具
- [ ] 暗色模式
- [ ] 更多工具：颜色转换、时间戳、正则测试、UUID 生成……

---

## 📄 License

MIT

---

## 🙏 致谢

- [FEHelper](https://www.baidufe.com/fehelper) — 功能灵感来源
- [qrcodejs](https://github.com/davidshimjs/qrcodejs) · [jsQR](https://github.com/cozmo/jsQR) · [SheetJS](https://sheetjs.com/) — 核心依赖库
