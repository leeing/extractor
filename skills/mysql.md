---
name: 数据库操作 (Drizzle + MySQL / TDSQL)
trigger: 当需要修改数据库 Schema、编写查询或配置 Testcontainers 测试时
prerequisites: 先读取相关 Feature 的 SPEC.md
---

# Skill: 数据库操作 (Drizzle + MySQL / TDSQL)

## Schema 定义

```typescript
// src/lib/db/schema.ts
import { mysqlTable, varchar, int, text, boolean, timestamp, serial } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// ⚠️ 禁止使用 .references()（数据库无 REFERENCES 权限）
// 关联关系通过下方 relations() 在应用层维护
export const posts = mysqlTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  published: boolean('published').default(false).notNull(),
  authorId: varchar('author_id', { length: 36 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 关系定义
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));
```

**MySQL vs PostgreSQL 差异：**
- **UUID 主键**：MySQL 无原生 `uuid()` 默认值，使用 `varchar(36)` + `$defaultFn(() => randomUUID())`
- **varchar 必须指定 length**：不能像 PostgreSQL 的 `text()` 那样无限长度
- **自增主键**：`serial('id')` 映射为 `BIGINT UNSIGNED AUTO_INCREMENT`
- **时间戳更新**：MySQL 支持 `onUpdateNow()`，自动更新 `updated_at`
- **排序规则**：建议表/库级别设置 `utf8mb4_unicode_ci`

## 客户端初始化

```typescript
// src/lib/db/index.ts
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import { env } from '@/lib/env';

const poolConnection = mysql.createPool({
  uri: env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const db = drizzle(poolConnection, { schema, mode: 'default' });
```

> MySQL/TDSQL 必须显式创建连接池（与 PostgreSQL 驱动行为不同）。
> `connectionLimit` 根据部署实例数和数据库最大连接数调整。

## 类型推导

```typescript
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

type User = InferSelectModel<typeof users>;
type NewUser = InferInsertModel<typeof users>;
```

## 查询模式

```typescript
import { eq, and, like, desc, count, sql } from 'drizzle-orm';

// 基础 CRUD
const [user] = await db.select().from(users).where(eq(users.id, id));
await db.insert(users).values({ email, name });
await db.update(users).set({ name: newName }).where(eq(users.id, id));
await db.delete(users).where(eq(users.id, id));

// 关联查询（Relational Query API）
const usersWithPosts = await db.query.users.findMany({
  with: { posts: true },
  where: eq(users.email, email),
});

// 复杂聚合
const stats = await db
  .select({ authorId: posts.authorId, postCount: count(posts.id) })
  .from(posts)
  .groupBy(posts.authorId)
  .having(gt(count(posts.id), 5))
  .orderBy(desc(count(posts.id)));
```

## 迁移流程

```bash
# 修改 schema.ts 后
pnpm db:generate     # 生成 Migration 文件
pnpm db:migrate      # 应用 Migration
pnpm db:studio       # 可视化查看

# 开发阶段快速同步（跳过迁移文件）
pnpm db:push
```

## Drizzle 配置

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';
import { env } from '@/lib/env';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dialect: 'mysql',
  dbCredentials: { url: env.DATABASE_URL },
});
```

## TDSQL 特有注意事项

| 项目 | 说明 |
|------|------|
| **字符集** | 建库时使用 `CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci` |
| **索引长度** | `varchar` 列做联合索引时注意 767 字节限制（`innodb_large_prefix=ON` 可支持 3072） |
| **事务隔离** | TDSQL 默认 `REPEATABLE READ`，注意幻读场景 |
| **JSON 类型** | Drizzle 使用 `json('column_name')` |
| **全文索引** | 中文全文搜索需使用 `ngram` parser |
| **外键** | TDSQL 分布式模式下可能不支持外键，建议应用层保证一致性 |
| **BOOLEAN** | 底层为 `TINYINT(1)`，Drizzle 自动处理映射 |
| **语法兼容** | 避免 `LATERAL`、窗口函数等 MySQL 8.0 特有语法（需确认 TDSQL 版本支持） |
| **分布式事务** | 需与 DBA 确认分片键设计 |

## 测试（Testcontainers）

```typescript
// tests/global-setup.ts
import { MySqlContainer } from '@testcontainers/mysql';

export default async function setup() {
  const container = await new MySqlContainer('mysql:8.0')
    .withDatabase('testdb')
    .withUsername('test')
    .withPassword('test')
    .start();

  const port = container.getMappedPort(3306);
  process.env.DATABASE_URL =
    `mysql://test:test@${container.getHost()}:${port}/testdb`;

  return async () => { await container.stop(); };
}
```

```typescript
// tests/setup.ts
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import * as schema from '@/lib/db/schema';

let db: ReturnType<typeof drizzle>;

beforeAll(async () => {
  const pool = mysql.createPool({ uri: process.env.DATABASE_URL! });
  db = drizzle(pool, { schema, mode: 'default' });
  await migrate(db, { migrationsFolder: './src/lib/db/migrations' });
});

beforeEach(async () => {
  // 无外键约束，直接按依赖顺序删除即可
  await db.delete(schema.posts);
  await db.delete(schema.users);
});

export { db };
```

> 测试使用标准 MySQL 8.0 镜像即可覆盖绝大部分 TDSQL 场景。
> 如需测试 TDSQL 特有行为（分片、分布式事务），应使用专门的集成测试环境。
