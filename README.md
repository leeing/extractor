# Document Extractor

使用多模态大模型将 PDF / 图片 / Word 文档智能转换为 Markdown 格式。

## 功能

- **PDF 提取**：客户端渲染 PDF 页面为图片，逐页调用 LLM 识别并转换为 Markdown
- **图片提取**：支持 PNG、JPG、JPEG、WEBP 格式直接上传提取
- **Word 转换**：DOCX 文件在服务端直接转换为 Markdown（无需 LLM）
- **流式输出**：实时展示 LLM 提取进度
- **多模型管理**：支持配置多个 LLM（Qwen-VL、GPT-4o、Gemini 等），一键切换
- **访问控制**：可选 Bearer Token 鉴权，保护 API 端点

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript 5.9 (strict mode)
- **样式**: Tailwind CSS 4
- **PDF**: pdfjs-dist (客户端渲染)
- **DOCX**: mammoth + turndown (服务端转换)
- **LLM SDK**: OpenAI SDK (兼容任何 OpenAI API 格式的模型)
- **校验**: Zod 4
- **Lint/Format**: Biome
- **测试**: Vitest

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入 LLM API 配置：

```env
EXTRACT_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
EXTRACT_MODEL_ID=qwen-vl-plus
EXTRACT_API_KEY=sk-your-api-key-here
```

> 也可以不配置环境变量，在页面的「模型设置」中手动添加模型配置。

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 环境变量

| 变量 | 必填 | 说明 |
|------|:----:|------|
| `EXTRACT_BASE_URL` | 是* | LLM API Base URL (OpenAI-compatible) |
| `EXTRACT_MODEL_ID` | 是* | 模型 ID |
| `EXTRACT_API_KEY` | 是* | API Key |
| `ACCESS_TOKEN` | 否 | 访问密钥，设置后所有 API 请求需携带 `Authorization: Bearer <token>` |
| `EXTRACT_RATE_LIMIT_MAX_REQUESTS` | 否 | 时间窗口内最大请求数 |
| `EXTRACT_RATE_LIMIT_REQUEST_WINDOW_SECONDS` | 否 | 请求窗口大小（秒） |
| `EXTRACT_RATE_LIMIT_MAX_INPUT_TPM` | 否 | 每分钟最大输入 Token 数 |
| `EXTRACT_RATE_LIMIT_MAX_OUTPUT_TPM` | 否 | 每分钟最大输出 Token 数 |

> *环境变量非必须配置 — 用户也可在页面「模型设置」中直接输入。

## 访问控制

设置 `ACCESS_TOKEN` 环境变量后：

- 所有 API 端点（`/api/extract`、`/api/config`、`/api/convert-docx`）要求携带 `Authorization: Bearer <token>` 请求头
- 前端会自动在「设置」对话框中显示「访问密钥」输入框
- 用户输入的密钥保存在 localStorage，后续请求自动携带
- **不设置 `ACCESS_TOKEN` 则跳过鉴权**（本地开发无需配置）

## Docker 部署

```bash
docker build -t extractor .
docker run -p 5000:5000 \
  -e EXTRACT_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1 \
  -e EXTRACT_MODEL_ID=qwen-vl-plus \
  -e EXTRACT_API_KEY=sk-your-key \
  -e ACCESS_TOKEN=your-shared-secret \
  extractor
```

## 安全措施

- **Token 鉴权**：可选 Bearer Token 保护所有 API 端点
- **输入校验**：Zod 校验所有 API 请求体，字段有长度限制
- **错误脱敏**：API 错误响应不暴露内部错误详情，服务端日志记录完整错误
- **文件校验**：DOCX 上传校验 ZIP 魔数（PK 签名）+ 扩展名，限制 20MB
- **安全响应头**：`X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、`Referrer-Policy: strict-origin-when-cross-origin`、`X-DNS-Prefetch-Control: off`

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── config/         # 环境变量配置查询
│   │   ├── convert-docx/   # DOCX → Markdown 转换
│   │   └── extract/        # LLM 图片 → Markdown 流式提取
│   ├── layout.tsx          # Root Layout
│   └── page.tsx            # 主页面
├── features/
│   ├── extractor/
│   │   ├── components/     # FileUpload, PageRangeSelector, ResultPanel
│   │   ├── hooks/          # useExtraction
│   │   └── services/       # pdf-renderer, rate-limiter
│   ├── settings/
│   │   ├── components/     # SettingsDialog
│   │   ├── context.tsx     # ModelConfigProvider (含 accessToken 管理)
│   │   └── types.ts        # ModelConfig, presets
│   └── theme/              # 暗黑模式 (light/dark/system)
└── lib/
    ├── env.ts              # Zod 环境变量校验
    └── auth.ts             # Token 鉴权中间件
```

## 常用命令

| 命令 | 用途 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 生产构建 |
| `pnpm test` | 运行测试 |
| `pnpm check` | Biome lint + format |
| `pnpm typecheck` | TypeScript 类型检查 |
