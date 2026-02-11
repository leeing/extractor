/**
 * Model configuration for multimodal LLM providers.
 * Stored in localStorage, passed to Route Handler per request.
 */
export interface ModelConfig {
  /** Unique identifier */
  id: string;
  /** User-friendly display name, e.g. "Qwen-VL Production" */
  name: string;
  /** OpenAI-compatible API base URL */
  baseUrl: string;
  /** Model identifier, e.g. "qwen-vl-plus" */
  modelId: string;
  /** API key (base64 encoded in localStorage) */
  apiKey: string;
  /** Custom system prompt for document parsing */
  customPrompt: string;
  /** Whether this config is currently active */
  isActive: boolean;
}

/** Default prompt template for document extraction */
export const DEFAULT_EXTRACT_PROMPT = `你是一个专业的文档解析助手。请将图片中的文档内容转换为结构化的 Markdown 格式。

要求：
1. 保持原文档的标题层级（使用 # ## ### 等）
2. 正确识别并转换表格为 Markdown 表格
3. 保持列表格式（有序/无序）
4. 使用原始 Unicode 符号（如 ≤ ≥ ± × ÷ ≈ ≠），不要转成 LaTeX 数学公式；仅对复杂数学公式使用 LaTeX
5. 忽略页眉、页脚、页码、水印等非正文内容
6. 保持原文语言，不要翻译
7. 只输出 Markdown 内容，不要添加额外的解释或说明
8. 直接输出 Markdown 原文，禁止用 \`\`\`markdown 代码块包裹`;

/** Preset model configurations for quick setup */
export const MODEL_PRESETS: Omit<ModelConfig, "id" | "apiKey" | "isActive">[] =
  [
    {
      name: "Qwen-VL-Plus (阿里云)",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      modelId: "qwen-vl-plus",
      customPrompt: DEFAULT_EXTRACT_PROMPT,
    },
    {
      name: "Qwen-VL-Max (阿里云)",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      modelId: "qwen-vl-max",
      customPrompt: DEFAULT_EXTRACT_PROMPT,
    },
    {
      name: "GPT-4o (OpenAI)",
      baseUrl: "https://api.openai.com/v1",
      modelId: "gpt-4o",
      customPrompt: DEFAULT_EXTRACT_PROMPT,
    },
    {
      name: "Gemini 2.0 Flash",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      modelId: "gemini-2.0-flash",
      customPrompt: DEFAULT_EXTRACT_PROMPT,
    },
  ];
