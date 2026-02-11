---
name: Pre-commit Hooks 配置
trigger: 当需要配置 Git 提交前自动检查时
prerequisites: 项目已初始化 Git
---

# Skill: Pre-commit Hooks 配置

## 方案：Claude Code Hooks（推荐）

在项目根目录 `.claude/settings.json` 中配置 hooks，Claude 每次执行 `git commit` 前自动触发检查：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo '$INPUT' | jq -r '.command' | grep -q '^git commit' && echo 'DENY: Run full checks first: pnpm check && pnpm typecheck && pnpm test && pnpm build' || true"
          }
        ]
      }
    ]
  }
}
```

> 此方式仅在 Claude Code 中生效。人工提交仍需依赖 Git hooks。

## 方案：Git pre-commit hook

### 安装

```bash
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
set -e

echo "🔍 Running pre-commit checks..."

pnpm check      # Biome lint + format
pnpm typecheck  # TypeScript type check

echo "✅ All pre-commit checks passed."
EOF

chmod +x .git/hooks/pre-commit
```

### 注意事项

- `.git/hooks/` 不会被 Git 追踪，团队成员需各自安装
- 如需团队共享，将脚本放到 `scripts/pre-commit` 并在 README 中说明安装方式
- 不要在 hook 中运行完整测试或 build（太慢），留给 CI
- 禁止使用 `--no-verify` 跳过 hook（除非用户明确要求）
