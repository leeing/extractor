---
name: 新建 Feature 模块
trigger: 当用户要求添加新的业务功能模块时
prerequisites: 无
---

# Skill: 新建 Feature 模块

## 步骤

### 1. 创建目录结构

```bash
mkdir -p src/features/<feature_name>/{components,__tests__}
```

### 2. 编写 SPEC.md

在 `src/features/<feature_name>/SPEC.md` 中记录：

```markdown
# [Feature Name] 业务规范

## 业务目标
[一句话描述]

## 核心规则
- [ ] 规则1
- [ ] 规则2

## 数据流
[描述数据如何流转]

## 边缘情况
| 场景 | 预期行为 |
|------|----------|
| ... | ... |
```

### 3. 按层创建文件

按依赖顺序创建：

1. **`schemas.ts`** — Zod Schema（所有字段必须有 `.describe()`）
2. **`types.ts`** — TypeScript 类型定义
3. **`queries.ts`** — Drizzle 数据库查询封装（仅数据操作，无业务判断）
4. **`services.ts`** — 纯业务逻辑（不依赖 Next.js API）
5. **`actions.ts`** — Server Actions（验证输入 → 调用 Service → 返回统一结构）
6. **`components/`** — Feature 专属 UI 组件

### 4. Server Action 返回格式（强制）

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };
```

### 5. 如涉及数据库

```bash
# 更新 src/lib/db/schema.ts
# 生成迁移
pnpm db:generate
# 应用迁移
pnpm db:migrate
```

### 6. 注册路由

在 `src/app/` 下创建对应的 page.tsx / route.ts。

### 7. 编写测试

在 `src/features/<feature_name>/__tests__/` 下编写：
- `services.test.ts` — 单元测试
- 集成测试使用 Testcontainers

### 8. 验证

```bash
pnpm check        # Biome lint + format
pnpm typecheck    # TypeScript
pnpm test         # 测试
pnpm build        # 构建
```

## 检查清单

- [ ] SPEC.md 已编写
- [ ] 文件职责边界正确（actions.ts 不含业务逻辑）
- [ ] Zod Schema 所有字段有 `.describe()`
- [ ] Server Action 返回统一 ActionResult 结构
- [ ] `'use client'` 仅在需要交互的最小叶子组件添加
- [ ] 测试已编写且通过
