"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function WhitepaperContent({ content }: { content: string }) {
  // Strip the H1 title and version/author lines — already in the hero
  const lines = content.split("\n");
  const startIdx = lines.findIndex(
    (line) => line.startsWith("## Abstract") || line.startsWith("## Table of")
  );
  const body = startIdx > 0 ? lines.slice(startIdx).join("\n") : content;

  return (
    <article
      className="
        prose prose-invert prose-lg max-w-none
        prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-text-primary
        prose-h2:text-2xl prose-h2:mt-16 prose-h2:mb-6 prose-h2:pt-8 prose-h2:border-t prose-h2:border-border-subtle
        prose-h3:text-xl prose-h3:mt-10 prose-h3:mb-4 prose-h3:text-text-primary
        prose-p:text-text-secondary prose-p:leading-relaxed prose-p:font-light
        prose-strong:text-text-primary prose-strong:font-semibold
        prose-em:text-text-secondary
        prose-a:text-accent prose-a:no-underline hover:prose-a:underline
        prose-code:text-accent prose-code:bg-bg-base prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
        prose-pre:bg-bg-base prose-pre:border prose-pre:border-border-default prose-pre:rounded-xl prose-pre:text-sm
        prose-table:border-collapse
        prose-th:border prose-th:border-border-default prose-th:bg-bg-surface prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:text-text-primary prose-th:font-semibold prose-th:text-sm
        prose-td:border prose-td:border-border-default prose-td:px-4 prose-td:py-2 prose-td:text-text-secondary prose-td:text-sm
        prose-li:text-text-secondary prose-li:font-light
        prose-hr:border-border-subtle prose-hr:my-12
        prose-blockquote:border-accent prose-blockquote:text-text-secondary prose-blockquote:font-light
        prose-img:rounded-xl
      "
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </article>
  );
}
