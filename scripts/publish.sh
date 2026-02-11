#!/bin/bash

# Axon NPM 发布自动化脚本
# 作用: 自动执行环境检查、代码验证、构建、版本打标及发布流程
# 
# 使用方法:
#   ./scripts/publish.sh          # 正常发布
#   ./scripts/publish.sh --dry-run # 预演模式，只检查不发布

set -e # 遇到错误立即停止

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查是否为 dry-run 模式
DRY_RUN=false
if [ "$1" = "--dry-run" ]; then
    DRY_RUN=true
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}🧪 开始 Axon 预演模式 (Dry Run)...${NC}"
    echo -e "${BLUE}======================================${NC}"
else
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}🚀 开始 Axon 发布流程...${NC}"
    echo -e "${BLUE}======================================${NC}"
fi

# 0. 检查当前分支
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    echo -e "${YELLOW}⚠️  警告: 您当前不在 main/master 分支 (${CURRENT_BRANCH})。${NC}"
    read -p "确定要继续发布吗? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 1. 检查 Git 工作区状态
echo -e "${YELLOW}🔍 检查 Git 状态...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ 错误: Git 工作区不干净，请先提交或隐藏更改。${NC}"
    exit 1
fi

# 2. 检查 NPM 登录状态
if [ "$DRY_RUN" = false ]; then
    echo -e "${YELLOW}🔍 检查 NPM 登录状态...${NC}"
    if ! npm whoami > /dev/null 2>&1; then
        echo -e "${RED}❌ 错误: 您尚未登录 NPM，请运行 'npm login'。${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}🔍 预演模式: 跳过 NPM 登录检查${NC}"
fi

# 3. 运行前置验证 (Lint, Type-check, Test)
echo -e "${YELLOW}🧹 运行前置验证 (Lint, Type-check, Test)...${NC}"
bun run lint
bun run type-check
bun run test

# 4. 版本确认
VERSION=$(node -e "console.log(require('./package.json').version)")
echo -e "${GREEN}📦 当前待发布版本: ${VERSION}${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${BLUE}🧪 预演模式: 将模拟发布版本 ${VERSION}${NC}"
    echo -e "${YELLOW}注意: 预演模式不会实际发布或创建标签${NC}"
else
    read -p "确认发布此版本并打标签? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}已取消发布。${NC}"
        exit 1
    fi
fi

# 5. 构建项目
echo -e "${YELLOW}📦 构建项目...${NC}"
bun run clean
bun run build:js

# 6. Git 标签处理
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}🏷️  预演模式: 模拟创建 Git 标签 v${VERSION}...${NC}"
    if git rev-parse "v${VERSION}" >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  标签 v${VERSION} 已存在，预演将跳过创建。${NC}"
    else
        echo -e "${GREEN}✅ 预演: 将创建标签 v${VERSION}${NC}"
    fi
else
    echo -e "${YELLOW}🏷️  创建 Git 标签 v${VERSION}...${NC}"
    if git rev-parse "v${VERSION}" >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  标签 v${VERSION} 已存在，跳过创建。${NC}"
    else
        git tag -a "v${VERSION}" -m "Release v${VERSION}"
        echo -e "${GREEN}✅ 标签 v${VERSION} 已创建。${NC}"
    fi
fi

# 7. 执行发布
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}📤 预演模式: 模拟发布到 NPM...${NC}"
    echo -e "${GREEN}✅ 预演: 将执行 npm publish --access public${NC}"
else
    echo -e "${YELLOW}📤 正在发布到 NPM...${NC}"
    # 注意: npm publish 会触发 prepublishOnly
    # 但我们前面已经手动运行过验证以确保万无一失
    npm publish --access public
fi

# 8. 推送标签到远程
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}同步标签到远程仓库...${NC}"
    echo -e "${GREEN}✅ 预演: 将执行 git push origin v${VERSION}${NC}"
else
    echo -e "${YELLOW}同步标签到远程仓库...${NC}"
    git push origin "v${VERSION}"
fi

if [ "$DRY_RUN" = true ]; then
    echo -e "${BLUE}======================================${NC}"
    echo -e "${GREEN}🧪 预演完成! Axon v${VERSION} 发布检查通过。${NC}"
    echo -e "${YELLOW}所有验证步骤已通过，可以安全发布。${NC}"
    echo -e "${BLUE}======================================${NC}"
else
    echo -e "${BLUE}======================================${NC}"
    echo -e "${GREEN}🎉 发布成功! Axon v${VERSION} 已上线。${NC}"
    echo -e "${BLUE}======================================${NC}"
fi
