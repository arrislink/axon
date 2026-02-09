---
name: PostgreSQL Schema Design
description: PostgreSQL 数据库表结构设计最佳实践
tags: [database, postgresql, schema, sql]
models: [claude-sonnet-4, gpt-4]
tokens_avg: 2000
difficulty: medium
last_updated: 2026-02-09
---

## Context

设计 PostgreSQL 数据库表结构，遵循最佳实践和规范。

## Prerequisites

- PostgreSQL >= 14
- 数据库迁移工具 (如 Drizzle, Prisma, Knex)

## Implementation

### 1. 基础表结构模板

```sql
-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
    email_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2. 索引策略

```sql
-- 常用查询索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status) WHERE status != 'active';
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- 复合索引 (按查询模式设计)
CREATE INDEX idx_users_role_status ON users(role, status);
```

### 3. 关联表设计

```sql
-- 会话表 (一对多)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address INET,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- 标签表 (多对多)
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE post_tags (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);
```

### 4. JSONB 字段使用

```sql
-- 灵活的元数据存储
ALTER TABLE users ADD COLUMN metadata JSONB DEFAULT '{}';

-- JSONB 索引 (GIN)
CREATE INDEX idx_users_metadata ON users USING GIN (metadata);

-- 查询 JSONB
SELECT * FROM users WHERE metadata->>'theme' = 'dark';
SELECT * FROM users WHERE metadata @> '{"preferences": {"newsletter": true}}';
```

### 5. Drizzle ORM 示例

```typescript
// src/db/schema.ts
import { pgTable, uuid, varchar, timestamp, text, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }),
  avatarUrl: text('avatar_url'),
  role: varchar('role', { length: 20 }).default('user'),
  status: varchar('status', { length: 20 }).default('active'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

## Best Practices

1. **使用 UUID 作为主键** - 分布式友好，无法猜测
2. **始终添加 created_at/updated_at** - 审计和调试必需
3. **使用 CHECK 约束** - 确保数据完整性
4. **索引策略** - 根据查询模式设计，避免过度索引
5. **使用 ON DELETE CASCADE** - 简化级联删除
6. **分区大表** - 超过 1000 万行考虑分区

## Related Skills

- database/migrations.md
- database/query-optimization.md
- database/backup-strategy.md
