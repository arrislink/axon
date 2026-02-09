---
name: RESTful CRUD API
description: 实现标准 RESTful CRUD 接口
tags: [api, rest, crud, typescript]
models: [claude-sonnet-4, gpt-4]
tokens_avg: 2200
difficulty: easy
last_updated: 2026-02-09
---

## Context

实现标准的 RESTful CRUD API，包括列表、详情、创建、更新和删除操作。

## Prerequisites

- Hono / Express / Fastify
- TypeScript
- 数据验证库 (Zod)

## Implementation

### 1. 路由结构

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/items | 获取列表 (分页) |
| GET | /api/items/:id | 获取详情 |
| POST | /api/items | 创建 |
| PUT | /api/items/:id | 完整更新 |
| PATCH | /api/items/:id | 部分更新 |
| DELETE | /api/items/:id | 删除 |

### 2. 使用 Hono 实现

```typescript
// src/routes/items.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono();

// 验证 Schema
const createItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  price: z.number().positive(),
  category: z.enum(['electronics', 'clothing', 'food']),
});

const updateItemSchema = createItemSchema.partial();

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.enum(['newest', 'oldest', 'price_asc', 'price_desc']).default('newest'),
  category: z.string().optional(),
});

// GET /items - 列表
app.get('/', zValidator('query', querySchema), async (c) => {
  const { page, limit, sort, category } = c.req.valid('query');
  const offset = (page - 1) * limit;

  const items = await db.query.items.findMany({
    where: category ? eq(items.category, category) : undefined,
    limit,
    offset,
    orderBy: getSortOrder(sort),
  });

  const total = await db.select({ count: count() }).from(items);

  return c.json({
    data: items,
    pagination: {
      page,
      limit,
      total: total[0].count,
      totalPages: Math.ceil(total[0].count / limit),
    },
  });
});

// GET /items/:id - 详情
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const item = await db.query.items.findFirst({
    where: eq(items.id, id),
  });

  if (!item) {
    return c.json({ error: 'Item not found' }, 404);
  }

  return c.json({ data: item });
});

// POST /items - 创建
app.post('/', zValidator('json', createItemSchema), async (c) => {
  const data = c.req.valid('json');

  const [item] = await db.insert(items).values(data).returning();

  return c.json({ data: item }, 201);
});

// PUT /items/:id - 完整更新
app.put('/:id', zValidator('json', createItemSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const [item] = await db
    .update(items)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(items.id, id))
    .returning();

  if (!item) {
    return c.json({ error: 'Item not found' }, 404);
  }

  return c.json({ data: item });
});

// PATCH /items/:id - 部分更新
app.patch('/:id', zValidator('json', updateItemSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const [item] = await db
    .update(items)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(items.id, id))
    .returning();

  if (!item) {
    return c.json({ error: 'Item not found' }, 404);
  }

  return c.json({ data: item });
});

// DELETE /items/:id - 删除
app.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [item] = await db
    .delete(items)
    .where(eq(items.id, id))
    .returning();

  if (!item) {
    return c.json({ error: 'Item not found' }, 404);
  }

  return c.json({ message: 'Deleted successfully' });
});

export default app;
```

### 3. 响应格式规范

```typescript
// 成功响应
{
  "data": { ... } | [ ... ],
  "pagination": { ... }  // 仅列表接口
}

// 错误响应
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }  // 可选
}
```

### 4. HTTP 状态码规范

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | GET, PUT, PATCH 成功 |
| 201 | Created | POST 成功 |
| 204 | No Content | DELETE 成功 (无响应体) |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证 |
| 403 | Forbidden | 无权限 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突 (如重复) |
| 422 | Unprocessable | 验证失败 |
| 500 | Internal Error | 服务器错误 |

## Tests

```typescript
// tests/routes/items.test.ts
import { describe, test, expect } from 'bun:test';
import app from '../../src/routes/items';

describe('Items API', () => {
  test('GET /items returns list', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.data).toBeArray();
    expect(data.pagination).toBeDefined();
  });

  test('POST /items creates item', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Item',
        price: 99.99,
        category: 'electronics',
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.data.name).toBe('Test Item');
  });

  test('GET /items/:id returns 404 for missing', async () => {
    const res = await app.request('/non-existent-id');
    expect(res.status).toBe(404);
  });
});
```

## Related Skills

- api/pagination.md
- api/error-handling.md
- api/rate-limiting.md
