# File Tools（文件工具）

一个本地运行的 Web 应用，用于图片压缩、PDF 压缩和 PDF 合并——所有处理均在本地完成。

## 功能

- **图片压缩** — 拖放图片，调节质量滑块（1–100），下载结果。JPEG 按选定质量重新编码。PNG 质量 ≥ 50 时保留透明通道，低于 50 时转为 JPEG 以大幅减小体积。WebP 保持原始格式。
- **PDF 压缩** — 质量滑块（1–100）加目标 DPI 滑块（72–300）。超过目标 DPI 的图片会降采样；低于目标 DPI 的图片已经受像素限制，会以更激进的质量压缩。重复引用的图片只处理一次。
- **PDF 合并** — 上传多个 PDF，通过拖放调整顺序，可删除单个文件，然后合并为一个 PDF。
- **多语言** — 支持 7 种语言：English、Français、中文 (简体)、中文 (繁體)、한국어、日本語、हिन्दी。自动检测浏览器语言，也可手动切换。
- **实时上传进度** — 所有操作均有进度条显示上传状态。
- **压缩前后对比** — 显示原始大小、压缩后大小和缩减百分比（合并操作显示文件数和结果大小）。

所有处理均在本地完成，不会上传到云端。

## 环境要求

- Python 3.10+
- [Pillow](https://python-pillow.org/) — 图片处理
- [PyMuPDF](https://pymupdf.readthedocs.io/) — PDF 处理

## 安装

```bash
pip install -r requirements.txt
```

## 使用

```bash
python3 main.py
```

浏览器打开 [http://localhost:8000](http://localhost:8000)。

## API 接口

| 方法 | 路径 | 参数 | 说明 |
|--------|------|------------|-------------|
| POST | `/api/compress-image` | `file`（multipart）、`quality`（1–100） | 压缩图片 |
| POST | `/api/compress-pdf` | `file`（multipart）、`quality`（1–100）、`dpi`（72–300） | 压缩 PDF |
| POST | `/api/merge-pdf` | `files`（multipart，多个文件） | 合并多个 PDF |

所有接口均以流式下载方式返回处理后的文件。

## 项目结构

```
file_tools/
├── main.py              # FastAPI 后端
├── requirements.txt     # Python 依赖
├── static/
│   ├── index.html       # 单页前端
│   ├── app.js           # 原生 JS（标签页、上传、拖放）
│   ├── i18n.js          # 多语言引擎（自动检测）
│   ├── styles.css       # 样式表
│   └── lang/            # 各语言 JSON 翻译文件
└── README.md
```

## 开源协议

MIT
