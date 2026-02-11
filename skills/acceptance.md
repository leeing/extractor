---
name: 验收报告
trigger: 当功能开发完成、准备向用户报告时
prerequisites: 功能代码已编写完成
---

# Skill: 验收报告

## 核心原则

**AI 不得在未经自动化验证的情况下声称"功能已完成"。**

## 验收流程

```
CODE → TEST_PLAN → RUN_TESTS → REPORT → (FIX?) → NOTIFY
                      ↑                    │
                      └────────────────────┘
                        (if failed, loop max 3)
```

### 1. 编写测试方案

基于 SPEC.md 生成测试用例清单，覆盖：
- 正常流程
- 异常/错误流程
- 边界情况

### 2. 执行全量检查

```bash
pnpm check --fix              # Biome lint + format (自动修复)
pnpm check                    # 确认 Biome 全部通过（无残留）
pnpm typecheck                # TypeScript 类型检查
pnpm test                     # 运行测试（Testcontainers 自动管理 DB）
pnpm build                    # 确认构建通过
```

### 3. 生成验收报告

```markdown
## ✅ 验收报告: [Feature Name]

**测试时间**: YYYY-MM-DD HH:MM:SS
**测试环境**: Testcontainers + PostgreSQL/MySQL

### 测试结果

| 用例 | 状态 | 耗时 |
|------|------|------|
| 正常流程 | ✅ Pass | 1.2s |
| 异常流程 | ✅ Pass | 0.8s |
| 边界情况 | ✅ Pass | 0.5s |

### 覆盖率

- 总覆盖率: XX%
- 新增代码覆盖率: XX%

### 覆盖范围

- [x] 页面 A
- [x] 页面 B
- [x] Server Action
- [x] 错误处理
```

### 4. 失败自愈

若测试失败：

1. 分析失败原因（读取日志/trace）
2. 定位到具体文件和行号
3. 修复代码
4. 重新运行失败的用例
5. **最多 3 轮**，超过则向用户报告并请求协助

**禁止：测试失败后直接报告"完成"**

### 5. PRD 完整性自检

对于复杂 PRD，维护页面清单：

```markdown
| 页面 | 路由 | 状态 | 测试覆盖 |
|------|------|------|----------|
| 登录 | /login | ✅ 已实现 | ✅ E2E |
| 首页 | /dashboard | ✅ 已实现 | ✅ E2E |
| 设置 | /settings | ⏳ 进行中 | ❌ |
```

**禁止：清单中存在"未实现"项时声称"PRD 开发完成"。**
