---
name: JWT Authentication Implementation
description: 实现基于 JWT 的用户认证系统
tags: [auth, jwt, security, typescript]
models: [claude-sonnet-4, gpt-4]
tokens_avg: 2500
difficulty: medium
last_updated: 2026-02-09
---

## Context

实现一个安全的 JWT 认证系统，包括 token 生成、验证和刷新机制。

## Prerequisites

- Node.js >= 18 或 Bun
- jsonwebtoken 库
- 环境变量: JWT_SECRET, JWT_EXPIRES_IN

## Implementation

### 1. 安装依赖

```bash
bun add jsonwebtoken
bun add -d @types/jsonwebtoken
```

### 2. Token 生成工具

```typescript
// src/auth/jwt.ts
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  email?: string;
  role?: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function decodeToken(token: string): TokenPayload | null {
  const decoded = jwt.decode(token);
  return decoded as TokenPayload | null;
}
```

### 3. 认证中间件

```typescript
// src/auth/middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from './jwt';

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}
```

### 4. 登录接口示例

```typescript
// src/routes/auth.ts
import { Router } from 'express';
import { generateToken } from '../auth/jwt';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // 验证用户 (示例)
  const user = await validateUser(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // 生成 token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  res.json({ token, expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
});

export default router;
```

## Tests

```typescript
// tests/auth/jwt.test.ts
import { describe, test, expect, beforeAll } from 'bun:test';
import { generateToken, verifyToken, decodeToken } from '../../src/auth/jwt';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key';
});

describe('JWT Authentication', () => {
  test('generates valid token', () => {
    const payload = { userId: 'user123', email: 'test@example.com' };
    const token = generateToken(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  test('verifies valid token', () => {
    const payload = { userId: 'user123' };
    const token = generateToken(payload);
    const decoded = verifyToken(token);

    expect(decoded.userId).toBe('user123');
  });

  test('rejects invalid token', () => {
    expect(() => {
      verifyToken('invalid-token');
    }).toThrow();
  });

  test('decodes token without verification', () => {
    const payload = { userId: 'user123' };
    const token = generateToken(payload);
    const decoded = decodeToken(token);

    expect(decoded?.userId).toBe('user123');
  });
});
```

## Security Considerations

1. **使用强随机 SECRET** - 至少 256 位随机字符串
2. **设置合理的过期时间** - 建议 15 分钟到 7 天
3. **使用 HTTPS** - 防止 token 被截获
4. **Token 刷新机制** - 实现 refresh token 延长会话
5. **黑名单机制** - 支持主动撤销 token

## Environment Variables

```bash
# .env
JWT_SECRET=your-256-bit-secret-key-here
JWT_EXPIRES_IN=7d
```

## Related Skills

- auth/refresh-token.md
- auth/oauth-integration.md
- security/input-validation.md
