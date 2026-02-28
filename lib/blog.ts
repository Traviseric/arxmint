// ============================================================
// ArxMint — Blog utilities
// Reads markdown posts from docs/blog/, parses the **Key:** Value
// frontmatter format, and returns structured post data.
// ============================================================

import fs from "fs/promises";
import path from "path";

export interface BlogPost {
  slug: string;
  title: string;
  publishDate: string;
  status: string;
  keywords: string[];
  description: string;
  content: string;
}

export type BlogPostMeta = Omit<BlogPost, "content">;

const BLOG_DIR = path.join(process.cwd(), "docs", "blog");

/**
 * Derive slug from filename:
 * "01-bitcoin-circular-economy.md" → "bitcoin-circular-economy"
 */
function filenameToSlug(filename: string): string {
  return filename
    .replace(/\.md$/, "")
    .replace(/^\d+-/, "");
}

/**
 * Parse the custom frontmatter format:
 *   # Title
 *   **Target publish date:** March 4, 2026
 *   **Status:** DRAFT
 *   **SEO keywords:** word1, word2
 *   ---
 *   Body...
 */
function parsePost(raw: string, filename: string): BlogPost {
  const slug = filenameToSlug(filename);

  // Split at the first "---" line to separate header from body
  const separatorIdx = raw.indexOf("\n---");
  const header = separatorIdx !== -1 ? raw.slice(0, separatorIdx) : raw;
  const content = separatorIdx !== -1 ? raw.slice(separatorIdx + 4).trim() : "";

  // Title: first H1
  const titleMatch = header.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : slug;

  // **Target publish date:** value
  const dateMatch = header.match(/\*\*Target publish date:\*\*\s*(.+)/i);
  const publishDate = dateMatch ? dateMatch[1].trim() : "";

  // **Status:** value
  const statusMatch = header.match(/\*\*Status:\*\*\s*(.+)/i);
  const status = statusMatch ? statusMatch[1].trim() : "";

  // **SEO keywords:** value
  const keywordsMatch = header.match(/\*\*SEO keywords:\*\*\s*(.+)/i);
  const keywords = keywordsMatch
    ? keywordsMatch[1].split(",").map((k) => k.trim())
    : [];

  // Description: first non-empty paragraph of the body
  const paragraphs = content.split(/\n\n+/);
  const firstPara = paragraphs.find(
    (p) => p.trim() && !p.trim().startsWith("#") && !p.trim().startsWith("!")
  );
  const description = firstPara ? firstPara.trim() : "";

  return { slug, title, publishDate, status, keywords, description, content };
}

/** Get all posts sorted by filename (numeric prefix order). */
export async function getAllPosts(): Promise<BlogPostMeta[]> {
  const files = await fs.readdir(BLOG_DIR);
  const mdFiles = files.filter((f) => f.endsWith(".md")).sort();

  const posts: BlogPostMeta[] = [];

  for (const file of mdFiles) {
    const raw = await fs.readFile(path.join(BLOG_DIR, file), "utf-8");
    const { content: _, ...meta } = parsePost(raw, file);
    posts.push(meta);
  }

  return posts;
}

/** Get a single post by slug, including full body content. */
export async function getPost(slug: string): Promise<BlogPost | null> {
  const files = await fs.readdir(BLOG_DIR);
  const file = files.find(
    (f) => f.endsWith(".md") && filenameToSlug(f) === slug
  );
  if (!file) return null;

  const raw = await fs.readFile(path.join(BLOG_DIR, file), "utf-8");
  return parsePost(raw, file);
}

/** All slugs for generateStaticParams(). */
export async function getAllSlugs(): Promise<string[]> {
  const files = await fs.readdir(BLOG_DIR);
  return files
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map(filenameToSlug);
}
