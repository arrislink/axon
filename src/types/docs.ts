/**
 * Document types - For project reference materials
 */

export type DocumentType = 'pdf' | 'docx' | 'markdown' | 'yaml' | 'url' | 'image' | 'text';

export interface Document {
  id: string;
  type: DocumentType;
  path: string;
  title: string;
  content?: string; // Extracted text content
  metadata?: Record<string, any>; // AI-enriched metadata (tags, tech stack, etc.)
  added_at: string;
  tags?: string[];
}

export interface DocumentLibrary {
  version: string;
  documents: Document[];
  indexed_at: string;
}
