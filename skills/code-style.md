---
name: 代码风格参考 (Next.js + TypeScript)
trigger: 当需要确认编码规范、组件模式、样式写法时
prerequisites: 无
---

# Skill: 代码风格参考 (Next.js + TypeScript)

## TypeScript 严格模式

```typescript
// tsconfig.json 必须启用
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

## Discriminated Unions（必须使用）

```typescript
// ✅ 正确
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

// ❌ 错误：使用可选字段
type BadState<T> = { loading?: boolean; data?: T; error?: string };
```

## Zod Schema

```typescript
// 所有字段必须有 .describe() — AI Agent 依赖这些描述
const createProjectSchema = z.object({
  name: z.string().min(1).max(100).describe('项目名称，将显示在仪表盘'),
  visibility: z.enum(['public', 'private']).describe('public=任何人可见, private=仅团队成员'),
});
```

## Server Action 返回格式

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export async function createProject(
  _prevState: ActionResult<Project>,
  formData: FormData
): Promise<ActionResult<Project>> {
  const parsed = createProjectSchema.safeParse(/* ... */);
  if (!parsed.success) {
    return { success: false, error: '输入验证失败', code: 'VALIDATION_ERROR' };
  }
  try {
    const project = await projectService.create(parsed.data);
    revalidatePath('/projects');
    return { success: true, data: project };
  } catch (error) {
    console.error('[createProject]', error);
    return { success: false, error: '创建失败，请稍后重试' };
  }
}
```

## 客户端组件原则

```typescript
// ✅ 'use client' 尽可能下沉到叶子节点
// app/projects/page.tsx — Server Component
export default async function ProjectsPage() {
  const projects = await getProjects();
  return <ProjectList projects={projects} />;
}

// features/projects/components/project-card.tsx
'use client'; // 仅在需要交互的最小组件添加
export function ProjectCard({ project }: { project: Project }) {
  const [isHovered, setIsHovered] = useState(false);
  // ...
}
```

## 数据获取优先级

```
Server Component 直接查询 > Server Action > Route Handler
```

## 异步操作

```typescript
// ✅ 并行执行
const [user, posts, comments] = await Promise.all([
  fetchUser(), fetchPosts(), fetchComments()
]);

// ❌ 禁止瀑布式
const user = await fetchUser();
const posts = await fetchPosts();
```

## RSC 边界数据最小化

```typescript
// ❌ 序列化整个对象到客户端
return <Profile user={user} />;

// ✅ 仅传必要字段
return <Profile name={user.name} avatar={user.avatar} />;
```

## 性能优化

```typescript
// React.cache() 请求内去重
import { cache } from 'react';
export const getCurrentUser = cache(async () => {
  const session = await auth();
  return db.select().from(users).where(eq(users.id, session.user.id));
});

// after() 非阻塞操作
import { after } from 'next/server';
export async function POST(request: Request) {
  const result = await updateDatabase(request);
  after(async () => { await logUserAction(result); });
  return Response.json(result);
}

// 动态导入重型组件
import dynamic from 'next/dynamic';
const MonacoEditor = dynamic(
  () => import('./monaco-editor').then(m => m.MonacoEditor),
  { ssr: false }
);
```

## Tailwind CSS v4

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-brand: oklch(0.7 0.15 250);
  --color-surface: oklch(0.98 0 0);
  --radius-default: 0.5rem;
}
```

```typescript
// ❌ 硬编码颜色
<div className="bg-[#3b82f6]">

// ✅ 使用主题变量
<div className="bg-brand">
```

## 可访问性

```tsx
// ❌ 禁止移除焦点样式
<button className="outline-none">

// ✅ 使用 focus-visible
<button className="focus-visible:ring-2 focus-visible:ring-brand">

// ✅ 图片需要 alt
<img alt="用户头像" />

// ✅ 异步更新使用 aria-live
<div aria-live="polite">{statusMessage}</div>

// ❌ onClick 导航
<div onClick={() => router.push('/page')}>Link</div>

// ✅ 使用 Link 组件
<Link href="/page">Link</Link>
```

## Biome 配置

```jsonc
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/2.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 }
}
```

## 环境变量

```typescript
// ❌ 禁止
const apiKey = process.env.OPENAI_API_KEY;

// ✅ 使用 t3-env
import { env } from '@/lib/env';
const apiKey = env.OPENAI_API_KEY;
```

### t3-env 完整配置模板

```typescript
// src/lib/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  // 服务端变量（不会暴露给客户端）
  server: {
    DATABASE_URL: z.string().url(),
    OPENAI_API_KEY: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },

  // 客户端变量（必须以 NEXT_PUBLIC_ 开头）
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },

  // 运行时映射（Next.js 要求显式映射客户端变量）
  rpiConfig: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});
```

> **好处**：应用启动时自动校验所有环境变量，缺失或格式错误立即报错，而非运行时才崩溃。
