#!/bin/bash

# Axon NPM 发布自动化脚本
# 作用: 自动执行代码检查、测试、构建和发布流程

set -e # 遇到错误立即停止

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 开始 Axon 发布流程...${NC}"

# 1. 检查 Git 工作区状态
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ 错误: Git 工作区不干净，请先提交或隐藏更改。${NC}"
    exit 1
fi

# 2. 检查 NPM 登录状态
echo -e "${YELLOW}🔍 检查 NPM 登录状态...${NC}"
if ! npm whoami > /dev/null 2>&1; then
    echo -e "${RED}❌ 错误: 您尚未登录 NPM，请运行 'npm login'。${NC}"
    exit 1
fi

# 3. 运行代码检查和格式化
echo -e "${YELLOW}🧹 运行 Lint 和格式化...${NC}"
bun run lint
bun run format

# 4. 运行类型检查
echo -e "${YELLOW}🔍 运行类型检查...${NC}"
bun run type-check

# 5. 运行测试
echo -e "${YELLOW}🧪 运行单元测试...${NC}"
bun run test

# 6. 清理并构建
echo -e "${YELLOW}📦 清理并构建项目...${NC}"
bun run clean
bun run build:js

# 7. 执行发布
echo -e "${YELLOW}📤 正在发布到 NPM...${NC}"
npm publish --access public

echo -e "${GREEN}✅ 发布成功! Axon 已上线。${NC}"
