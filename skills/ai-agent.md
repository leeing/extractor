---
name: AI / Agent 开发规范
trigger: 当项目涉及 AI Agent、Tool 定义或 Prompt 管理时
prerequisites: 已安装 Vercel AI SDK
---

# Skill: AI / Agent 开发规范

## Tool 定义规范

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const searchDocsTool = tool({
  description: `
    搜索项目文档库。
    使用场景：当用户询问项目相关问题时。
    限制：仅返回前 10 条结果。
  `.trim(),

  parameters: z.object({
    query: z.string()
      .min(2)
      .describe('搜索关键词，支持自然语言'),
  }),

  // 关键：永远不要抛出异常（这是全局"泛型 catch 禁止"规则的合理例外，
  // 因为 Tool 抛异常会导致 Agent 运行中断，必须返回结构化错误）
  execute: async ({ query }) => {
    try {
      const results = await documentSearch.search(query);
      return { status: 'success', results };
    } catch (error) {
      return {
        status: 'error',
        message: `搜索失败：${error instanceof Error ? error.message : '未知错误'}`,
        retryable: true,
      };
    }
  },
});
```

**要点：**
- `description` 要详细说明使用场景和限制
- `parameters` 每个字段必须有 `.describe()`
- `execute` 内部用 try-catch，返回结构化错误，**不抛异常**

## Prompt 管理

```typescript
// ai/prompts/code-review.ts
export const codeReviewSystemPrompt = `
你是一位高级代码审查助手。

## 审查维度
1. 正确性：逻辑是否正确
2. 安全性：是否存在漏洞
3. 可维护性：代码是否清晰
4. 性能：是否有明显瓶颈

## 限制
- 不要建议完全重写
- 专注于可操作的改进
`.trim();
```

**目录组织：**

```
src/ai/
├── agents/           # Agent 定义
├── tools/            # Tool 定义
└── prompts/          # Prompt 模板
```

## 测试建议

```typescript
// ✅ 测试 Tool 输入校验 — 不需要 LLM
it('should return error for empty query', async () => {
  const result = searchDocsTool.parameters.safeParse({ query: '' });
  expect(result.success).toBe(false);
});

// ✅ 测试 Tool 执行逻辑 — mock 外部依赖
it('should handle search errors gracefully', async () => {
  vi.spyOn(documentSearch, 'search').mockRejectedValue(new Error('timeout'));
  const result = await searchDocsTool.execute({ query: 'test' });
  expect(result.status).toBe('error');
  expect(result.retryable).toBe(true);
});

// ✅ LLM 交互测试 — 使用 MockLanguageModelV1
import { MockLanguageModelV1 } from 'ai/test';
```
