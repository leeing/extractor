# Extractor 业务规范

## 业务目标
将 PDF、图片（PNG/JPG/WEBP）和 Word（.docx）文档转换为 Markdown 格式。

## 核心规则
- [x] PDF：客户端渲染为 PNG 图片，逐页调用 LLM 提取 Markdown
- [x] 图片：直接作为单页发送给 LLM 提取
- [x] DOCX：服务端使用 mammoth + turndown 直接转换，无需 LLM
- [x] 所有提取结果支持逐页预览、复制、下载
- [x] PDF 渲染最多 50 页（OOM 保护）
- [x] 文件大小限制 100MB（所有类型）
- [x] LLM 调用使用流式响应，实时展示提取进度

## 数据流

```
用户上传文件
├── PDF  → pdfjs 渲染为 PNG[] → 逐页 POST /api/extract (streaming) → Markdown[]
├── 图片 → FileReader.readAsDataURL → POST /api/extract (streaming) → Markdown
└── DOCX → POST /api/convert-docx (FormData) → mammoth→HTML→turndown→Markdown
```

## 边缘情况
| 场景 | 预期行为 |
|------|----------|
| PDF 超过 50 页 | 仅渲染前 50 页，控制台 warn |
| 文件超过 100MB | 显示错误提示，阻止上传 |
| LLM API 配置缺失 | 弹出设置对话框 |
| LLM 调用失败 | 在对应页显示 ⚠️ 错误信息，继续处理后续页 |
| 同一文件重复上传 | input 已重置，可正常触发 |
| 剪贴板 API 不可用 | 静默失败，不影响其他功能 |
| 非支持格式文件 | 显示格式限制错误提示 |

## 变更记录
| 日期 | 变更内容 | 原因 |
|------|----------|------|
| 2026-02-10 | 初始版本 | 项目审查后补充 |
