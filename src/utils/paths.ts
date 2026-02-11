/**
 * Path Utilities - Handles file and directory path resolution
 */

import { relative, resolve } from 'node:path';

/**
 * Ensure a path is within the project root to prevent path traversal
 */
export function ensurePathInProject(projectRoot: string, relPath: string): string {
  const absPath = resolve(projectRoot, relPath);
  const relativePath = relative(projectRoot, absPath);

  if (relativePath.startsWith('..') || relativePath === '..') {
    throw new Error(`Security Error: Path is outside of project root: ${relPath}`);
  }

  return absPath;
}
