# Settings 业务规范

## 业务目标
管理多个 LLM 模型配置，支持前端 localStorage 存储和 .env 环境变量两种模式。

## 核心规则
- [x] 用户可添加、编辑、删除多个模型配置
- [x] 每次只有一个配置处于"激活"状态
- [x] API Key 使用 base64 混淆存储到 localStorage（非加密）
- [x] 支持从 .env 环境变量读取默认配置（服务端不暴露 API Key）
- [x] 环境变量配置和用户配置可共存，用户配置优先
- [x] 删除激活配置时自动激活剩余第一个
- [x] 首次添加配置时自动设为激活
- [x] 内置预设（Qwen-VL-Plus/Max）快速配置

## 数据流

```
页面加载
├── localStorage → configs[]（客户端）
└── GET /api/config → envConfig（服务端，不含 API Key）

提取时
├── 有 activeConfig → 使用 decoded 客户端配置
└── 无 activeConfig + envConfig.isConfigured → fallback 到环境变量
```

## 边缘情况
| 场景 | 预期行为 |
|------|----------|
| localStorage 数据损坏 | catch 并返回空数组 |
| base64 解码失败 | 返回原始字符串 |
| /api/config 请求失败 | 静默忽略，envConfig 保持 null |
| 删除唯一配置 | 配置列表为空，fallback 到 env |
| 必填字段为空 | 保存按钮禁用 |

## 变更记录
| 日期 | 变更内容 | 原因 |
|------|----------|------|
| 2026-02-10 | 初始版本 | 项目审查后补充 |
