---
name: 系统化调试
trigger: 当遇到 Bug、测试失败或异常行为时
prerequisites: 问题已可复现
---

# Skill: 系统化调试 (Systematic Debugging)

## 核心原则

**先诊断，后修复。** 禁止在未理解根因的情况下尝试修复。

## 调试流程

```
REPRODUCE → ISOLATE → DIAGNOSE → FIX → VERIFY → DOCUMENT
```

### 1. 复现问题

在动手修复之前，必须先稳定复现：

```bash
# 运行失败的测试
pnpm test -- --testPathPattern=path/to/test

# 如果是构建错误
pnpm build

# 如果是类型错误
pnpm typecheck
```

**记录复现条件：**
- 触发命令 / 请求 / 页面路由
- 错误信息（完整 stack trace）
- 环境差异（本地 vs CI、Node 版本、依赖版本）

### 2. 缩小范围

**禁止：** 一次修改多个文件来"试试看"

- 如果是运行时错误，在最小组件/函数中复现
- 如果是类型错误，检查具体的类型推导链
- 如果是构建错误，检查导入路径和模块解析

### 3. 诊断根因

**按优先级检查：**

| 顺序 | 检查项 | 命令 |
|------|--------|------|
| 1 | 类型错误 | `pnpm typecheck` |
| 2 | Lint 问题 | `pnpm check` |
| 3 | 导入/依赖 | 检查 `import` 路径和 `package.json` |
| 4 | 数据库连接 | 检查 `DATABASE_URL`、容器状态 |
| 5 | 客户端/服务端边界 | 检查 `'use client'` 位置 |
| 6 | 数据问题 | 检查测试 fixture 和 mock data |

**常见陷阱：**

- **Server/Client 边界**：在 Server Component 中使用 `useState`/`useEffect`
- **序列化错误**：向 Client Component 传递不可序列化的 props（函数、Date 对象）
- **ORM 误用**：用 raw SQL 而非 Drizzle 查询 API
- **异步瀑布**：串行 `await` 应改为 `Promise.all`
- **barrel import**：从 `index.ts` re-export 导致 bundle 膨胀

### 4. 修复

- 一次只改一个地方
- 改完立即运行相关测试确认修复
- 如果修复引入新问题，回退并重新诊断

### 5. 验证

```bash
# 运行失败的测试
pnpm test -- --testPathPattern=path/to/test

# 全量验证
pnpm check        # Biome lint + format
pnpm typecheck    # TypeScript 类型检查
pnpm test         # 运行全部测试
pnpm build        # 确认构建通过
```

### 6. 记录

修复后在 commit message 中说明根因：

```
fix(auth): resolve redirect loop on login page

Root cause: middleware matched the login page itself,
causing infinite redirects. Added explicit exclusion
for /login in the matcher config.
```

## AI 自诊断清单

**在向用户求助前，必须先完成以下所有步骤：**

- [ ] 运行 `git diff` 查看最近变更，确认是否由近期修改引入
- [ ] 运行失败命令并保存完整 stack trace
- [ ] 检查 `node_modules` 是否与 `package.json` / `pnpm-lock.yaml` 同步（`pnpm install`）
- [ ] 检查 `.env` 配置是否完整（对比 `.env.example`）
- [ ] 检查 `tsconfig.json` 配置是否影响类型解析
- [ ] 运行 `pnpm check` + `pnpm typecheck` 确认是否有其它未发现的错误
- [ ] 以上全部完成后仍无法解决 → 向用户报告，附带已尝试的方案和失败原因
