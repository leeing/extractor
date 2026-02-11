# Next.js + Drizzle + MySQL 项目规范 (CLAUDE.md)

> **技术栈专属规范。** 通用规范见全局 `CLAUDE.md`。
> 过程式操作手册（新建 Feature、数据库迁移、测试配置等）见 `.claude/skills/`。
> ⚠️ 本模板适用于公司生产环境（MySQL / TDSQL），个人项目请使用 `nextjs-drizzle-postgresql` 模板。

---

## 0. 项目概述

<!-- 请根据实际项目填写 -->

| 字段 | 值 |
|------|-----|
| **项目名称** | [YOUR_PROJECT_NAME] |
| **一句话描述** | [例：面向开发者的 AI 代码审查平台] |
| **核心业务域** | [例：代码分析、团队协作、计费订阅] |
| **部署环境** | [例：Docker + TDSQL (MySQL 兼容)] |

---

## 1. 工具链

| 工具 | 用途 | 替代 |
|------|------|------|
| **pnpm 9+** | 包管理（严禁 npm/yarn） | npm, yarn |
| **Biome** | Lint + Format | ESLint, Prettier |
| **TypeScript 5.9+** | strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes + noImplicitOverride | - |
| **Drizzle Kit** | 数据库迁移 | - |

核心依赖：Next.js ^16.1, React ^19.0, Drizzle ORM ^0.40, mysql2 ^3.12, Zod ^4.0, Tailwind CSS ^4.0, Vercel AI SDK ^6.0

运行时：Node.js 24 LTS, MySQL 8.0+ / TDSQL (MySQL 兼容模式)

---

## 2. 架构约定

```
src/
├── app/              # Next.js App Router
├── features/         # 业务模块 (Feature-First)
│   └── [feature]/
│       ├── SPEC.md / actions.ts / services.ts / queries.ts
│       ├── schemas.ts / types.ts / components/ / __tests__/
├── components/       # 共享 UI (ui/ + shared/)
├── lib/              # 基础设施 (db/ + env.ts + ai.ts)
├── ai/               # agents/ + tools/ + prompts/
└── config/
```

| 文件 | 职责 | 禁止 |
|------|------|------|
| `actions.ts` | 验证输入、权限检查、调用 Service、返回结果 | 业务逻辑 |
| `services.ts` | 纯业务逻辑 | 依赖 Next.js API |
| `queries.ts` | Drizzle 数据库查询封装 | 业务判断 |
| `components/` | UI 渲染 | 直接调用数据库 |

---

## 3. 禁止清单

- **`useEffect` 数据获取**：使用 Server Component 直接查询
- **手动 `useMemo`/`useCallback`**：React 19 Compiler 自动优化
- **`process.env` 直接访问**：使用 t3-env (`@/lib/env`)
- **字符串拼接 SQL**：使用 Drizzle ORM 或 `sql` 模板
- **`transition: all`**：明确列出属性
- **`outline-none` 无替代**：使用 `focus-visible`
- **`<div onClick>` 导航**：使用 `<Link>`
- **硬编码颜色 `bg-[#xxx]`**：使用 Tailwind v4 主题变量
- **Barrel File 导入** (如 `from 'lucide-react'`)：使用深层导入或 `optimizePackageImports`
- **SQLite 替代测试**：Drizzle Schema 是方言绑定的（`mysql-core`），测试必须使用 Testcontainers + MySQL
- **Server Action 不返回统一结构**：必须返回 `{ success: true, data } | { success: false, error, code? }`
- **`@ts-ignore` / `@ts-expect-error` 累积**：单文件超过 3 处必须重构
- **`as any` 类型断言**：使用 `satisfies` 或收窄类型
- **泛型 `catch (e)` 吞错误**：只捕获具体预期异常，其余向上抛出
- **Biome 规则不足**：确保 `suspicious` + `correctness` + `style` 规则组全部启用
- **`.references()` 声明外键**：数据库无 REFERENCES 权限，禁止在 Schema 列定义中使用 `.references()`；关联关系通过 Drizzle `relations()` API 在应用层维护
- **`next/font/google` 外部字体**：内网部署无法访问 Google Fonts CDN，必须使用 `geist` npm 包 + `next/font/local`（从 `geist/font/sans`、`geist/font/mono` 导入）
- **任何外部 CDN/远程资源**：内网环境无法连接互联网，所有字体、脚本、样式、图片必须本地化（npm 包或 `public/` 目录）

---

## 4. Auto Gate

**AI 在完成每个功能后必须主动运行，不等用户要求：**

```bash
pnpm check                    # Biome lint + format
pnpm typecheck                # TypeScript 类型检查
pnpm test                     # 运行测试
pnpm build                    # 确认构建通过
```

> 任一步骤失败时自动修复后重新运行全部步骤。

---

## 5. 常用命令

| 命令 | 用途 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 生产构建 |
| `pnpm test` | 运行测试 |
| `pnpm db:push` | 推送 Schema (`drizzle-kit push`) |
| `pnpm db:generate` | 生成 Migration (`drizzle-kit generate`) |
| `pnpm db:migrate` | 执行 Migration (`drizzle-kit migrate`) |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm check` | Biome lint + format |
| `pnpm typecheck` | TypeScript 类型检查 |

---

## 6. 数据库注意事项 (MySQL / TDSQL)

- Drizzle 使用 `mysql-core`：`mysqlTable`, `varchar` 必须指定 `length`, UUID 用 `varchar(36)` + `$defaultFn(() => randomUUID())`
- 客户端初始化：需显式创建 `mysql2/promise` 连接池，再传入 `drizzle(pool, { schema, mode: 'default' })`
- Drizzle 配置 dialect：`mysql`
- `serial('id')` 映射为 `BIGINT UNSIGNED AUTO_INCREMENT`
- `onUpdateNow()` 可自动更新 `updated_at`

**TDSQL 特别注意：**

| 项目 | 说明 |
|------|------|
| 字符集 | 建库时使用 `utf8mb4 COLLATE utf8mb4_unicode_ci` |
| 索引长度 | `varchar` 联合索引注意 767 字节限制 |
| 外键 | **禁止使用外键**（无 REFERENCES 权限）。关联关系通过 Drizzle `relations()` 在应用层维护，Schema 列不使用 `.references()` |
| 事务隔离 | 默认 `REPEATABLE READ`，注意幻读 |

---

## 7. 项目特有陷阱

- **Google Fonts 导致内网部署失败**：`next/font/google` 在构建/运行时请求 `fonts.googleapis.com`，内网无法访问。已改用 `geist` npm 包（`geist/font/sans`、`geist/font/mono`），字体文件随 `node_modules` 安装，完全离线可用。
- **Next.js `maxDuration` 必须是静态常量**：`export const maxDuration` 是 segment config，Next.js 在编译时静态分析，不能从环境变量或运行时函数赋值。

---

## 变更日志

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-02-11 | 2.3.0 | §3 新增内网部署禁止项（Google Fonts、外部 CDN）+ §7 新增两条陷阱记录 |
| 2026-02-09 | 2.2.0 | §3 新增外键禁止项 + §6 外键从"建议"改为"禁止"（无 REFERENCES 权限） |
| 2026-02-08 | 2.1.0 | §3 新增 4 条禁止项 + §4 Commit Gate → Auto Gate |
| 2026-02-08 | 2.0.0 | 大幅精简：代码示例迁移到 skills，删除教程内容 |
| 2026-02-07 | 1.0.0 | 初始版本 |
