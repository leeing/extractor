#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# Document Extractor — 部署脚本
#
# 用法:
#   bash deploy.sh         # 构建 + 打包为 zip
#   bash deploy.sh --run   # 在 standalone 目录启动服务
# ─────────────────────────────────────────────

APP_NAME="extractor"
PORT="${PORT:-3000}"
DIST_DIR="dist"

echo "═══════════════════════════════════════"
echo "  $APP_NAME — 部署脚本"
echo "═══════════════════════════════════════"

# ── 启动模式 ─────────────────────────────────
if [ "${1:-}" = "--run" ]; then
  if [ ! -f "server.js" ]; then
    echo "❌ 未找到 server.js，请在 standalone 目录下运行"
    exit 1
  fi
  echo "🚀 启动服务 (PORT=$PORT)..."
  PORT="$PORT" HOSTNAME="0.0.0.0" node server.js
  exit 0
fi

# ── 构建模式 ─────────────────────────────────

# 环境检测
if ! command -v node &> /dev/null; then
  echo "❌ 未检测到 Node.js，请先安装 (>=18)"
  exit 1
fi
echo "✅ Node.js: $(node -v)"

if command -v pnpm &> /dev/null; then
  PKG_MGR="pnpm"
else
  PKG_MGR="npm"
fi
echo "✅ 包管理器: $PKG_MGR"

# 安装依赖
echo ""
echo "📦 安装依赖..."
$PKG_MGR install

# 构建
echo ""
echo "🔨 构建生产版本 (standalone)..."
$PKG_MGR run build

STANDALONE_DIR=".next/standalone"
if [ ! -d "$STANDALONE_DIR" ]; then
  echo "❌ standalone 目录不存在，构建可能失败"
  exit 1
fi

# 复制静态资源
if [ -d "public" ]; then
  cp -r public "$STANDALONE_DIR/public"
  echo "✅ 已复制 public/"
fi

if [ -d ".next/static" ]; then
  mkdir -p "$STANDALONE_DIR/.next/static"
  cp -r .next/static "$STANDALONE_DIR/.next/static"
  echo "✅ 已复制 .next/static/"
fi

# 复制 .env.local（如果存在）
if [ -f ".env.local" ]; then
  cp .env.local "$STANDALONE_DIR/.env.local"
  echo "✅ 已复制 .env.local"
fi

# 复制 deploy.sh 自身（用于 --run 模式）
cp deploy.sh "$STANDALONE_DIR/deploy.sh"

# 打包为 zip
echo ""
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"
ARCHIVE_NAME="${APP_NAME}-standalone.zip"

(cd .next && zip -qr "../$DIST_DIR/$ARCHIVE_NAME" standalone/)
echo "📦 已打包: $DIST_DIR/$ARCHIVE_NAME"

ARCHIVE_SIZE=$(du -sh "$DIST_DIR/$ARCHIVE_NAME" | cut -f1)

echo ""
echo "═══════════════════════════════════════"
echo "  ✅ 构建完成! ($ARCHIVE_SIZE)"
echo "═══════════════════════════════════════"
echo ""
echo "部署步骤:"
echo "  1. 将 $DIST_DIR/$ARCHIVE_NAME 复制到目标机器"
echo "  2. 解压: unzip $ARCHIVE_NAME"
echo "  3. 进入目录: cd standalone"
echo "  4. 配置 .env.local (如需修改)"
echo "  5. 启动: bash deploy.sh --run"
echo "     或: PORT=$PORT node server.js"
echo ""
echo "目标机器仅需安装 Node.js (>=18)，无需 pnpm/npm。"
echo ""
