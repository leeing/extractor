# Theme Feature — SPEC.md

## 业务目标

暗黑模式切换：支持 light / dark / system 三种主题模式，class-based 实现，localStorage 持久化，无 FOUC（闪白）。

## 核心规则

- [x] 支持 light（浅色）、dark（深色）、system（跟随系统）三种模式
- [x] 切换循环：light → dark → system → light
- [x] localStorage 持久化（key: `theme`），默认值 `system`
- [x] Class-based dark mode：通过 `<html class="dark">` 控制
- [x] FOUC 防护：`<head>` 内联脚本在 DOM 解析前应用主题
- [x] system 模式监听 `matchMedia('prefers-color-scheme: dark')` 变化

## 实现机制

```
页面加载
├── <head> 内联脚本 → 读取 localStorage → 添加 .dark class（阻塞渲染前）
└── ThemeProvider useEffect → 读取 localStorage → 同步 React state

用户切换
├── setTheme(next) → 更新 state + localStorage + classList
└── system 模式 → 注册 matchMedia change 监听器
```

## Tailwind 配置

- `@custom-variant dark (&:where(.dark, .dark *))` 覆盖默认 media query
- CSS 变量：`:root` 浅色，`:root.dark` 深色
- `suppressHydrationWarning` on `<html>` 防止 hydration mismatch

## 边缘情况

| 场景 | 预期行为 |
|------|----------|
| localStorage 不可用 | catch 静默，使用默认 system 模式 |
| SSR/SSG 预渲染 | FOUC 脚本确保首屏不闪白 |
| system 模式下系统主题切换 | 实时响应 matchMedia change |
| 切换到非 system 模式 | 移除 matchMedia 监听器 |

## 变更记录

| 日期 | 变更内容 | 原因 |
|------|----------|------|
| 2026-02-10 | 初始版本 | 项目审查后补充 |
