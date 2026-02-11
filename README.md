# Document Extractor

使用多模态大模型将 PDF / 图片 / Word 文档智能转换为 Markdown 格式。

## 功能

- **PDF 提取**：客户端渲染 PDF 页面为图片，逐页调用 LLM 识别并转换为 Markdown
- **图片提取**：支持 PNG、JPG、JPEG、WEBP 格式直接上传提取
- **Word 转换**：DOCX 文件在服务端直接转换为 Markdown（无需 LLM）
- **流式输出**：实时展示 LLM 提取进度
- **多模型管理**：支持配置多个 LLM（Qwen-VL、GPT-4o、Gemini 等），一键切换

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript (strict mode)
- **样式**: Tailwind CSS 4
- **PDF**: pdfjs-dist
- **DOCX**: mammoth + turndown
- **LLM SDK**: OpenAI SDK (兼容任何 OpenAI API 格式的模型)

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
│   │   ├── components/     # FileUpload, ResultPanel
│   │   ├── hooks/          # useExtraction
│   │   └── services/       # pdf-renderer
│   └── settings/
│       ├── components/     # SettingsDialog
│       ├── context.tsx     # ModelConfigProvider
│       └── types.ts        # ModelConfig, presets
└── lib/
    └── env.ts              # 环境变量类型安全访问
```

## 常用命令

| 命令 | 用途 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 生产构建 |
| `pnpm lint` | Biome lint |
| `pnpm format` | Biome format |

## 部署 (Windows / Linux 内网)

本项目使用 Next.js **standalone 模式**，在有外网的机器上构建后，将产物复制到内网目标机器运行。

> ⚠️ **目标机器仅需 Node.js (>=18)**，无需 pnpm/npm，无需访问外网。

### 1. 在开发机 (macOS) 上构建打包

```bash
bash deploy.sh
# → 生成 dist/extractor-standalone.zip
```

### 2. 复制到目标机器并部署

```bash
# 将 zip 复制到目标机器后:
unzip extractor-standalone.zip
cd standalone

# 配置环境变量
cp .env.local.example .env.local  # 编辑填入 API 配置

# 启动
bash deploy.sh --run
# 或直接: PORT=3000 node server.js
```


