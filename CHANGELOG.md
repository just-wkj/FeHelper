# 更新日志

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## [1.1.0] - 2026-06-23

### 新增

- **Cookie 获取工具**
  - 选择目标标签页（列出当前窗口所有 http/https 标签页）
  - 输入 Cookie Key 自动获取值（300ms 防抖查询）
  - 「列出全部」枚举目标网站所有 Cookie（表格展示 name/value/domain/path）
  - 复制单个值 / 复制全部为 JSON
- **LocalStorage 获取工具**
  - 选择目标标签页，输入 Key 自动获取值
  - 通过 `chrome.scripting.executeScript` 注入脚本读取页面 localStorage
  - 「列出全部」枚举所有键值对
  - 复制单个值 / 复制全部为 JSON
- **权限变更**：新增 `cookies`、`scripting`、`tabs` 权限 + `host_permissions: http://*/*, https://*/*`
- Popup 菜单新增两个工具卡片

## [1.0.0] - 2026-06-23

### 新增

- **二维码工具**
  - 生成二维码：实时预览、尺寸（128/200/256/384/512px）、容错级别（L/M/Q/H）
  - 下载 PNG、复制二维码图片到剪贴板
  - 解码二维码：点击选择 / 拖拽 / **Ctrl+V 粘贴**三种方式上传图片
  - 解码后原图预览，失败时展示原图 + 未识别提示
- **JSON 美化**
  - 格式化（2/4 空格 / Tab 缩进）、压缩、校验
  - 错误提示带**行号列号定位**
  - 文本视图（语法高亮）+ **树形折叠视图**
  - 点击树节点复制 JSONPath 路径
  - 转义 / 反转义 JSON 字符串
  - 上传 `.json` 文件、复制、下载结果
- **编码转换**
  - 双向：Base64、URL 编码、HTML 实体、Unicode（中文 ↔ `\uXXXX`）、Hex 十六进制
  - 单向哈希：MD5（内置 RFC1321 实现）、SHA-1、SHA-256（Web Crypto）
  - 一键交换输入输出（仅双向模式）
- **Excel 转 JSON**
  - 支持 `.xlsx` `.xls` `.csv`
  - 多 sheet 切换
  - 表格预览（前 20 行）
  - 首行作字段名，导出格式化 JSON
  - 复制、下载 `.json`
- **Popup 工具菜单**：渐变 header + 4 张彩色工具卡片
- 共享层：通用样式、Toast、复制、下载、拖拽绑定、Tab 切换

### 安全

- 所有数据处理在浏览器本地完成，无网络请求、无后台脚本、无 `host_permissions`
- 文件上传统一 10MB 上限校验
- JSON 树形视图节点数 > 5000 时降级提示

[1.0.0]: https://github.com/PLACEHOLDER/moyixi-fehelper/releases/tag/v1.0.0
