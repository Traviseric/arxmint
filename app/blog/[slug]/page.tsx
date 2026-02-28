import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollReveal } from "@/components/scroll-reveal";
import { getAllPosts, getAllSlugs, getPost } from "@/lib/blog";
import type { Metadata } from "next";
import type { Components } from "react-markdown";

// ---------- Static generation ----------

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} — ArxMint Blog`,
    description: post.description,
    keywords: post.keywords,
  };
}

// ---------- Helpers ----------

function estimateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 230));
}

// ---------- Markdown component overrides ----------

const mdComponents: Components = {
  h2: ({ children, ...props }) => (
    <h2
      className="text-2xl font-semibold text-text-primary mt-12 mb-4 tracking-tight"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="text-xl font-semibold text-text-primary mt-8 mb-3"
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4
      className="text-lg font-semibold text-text-primary mt-6 mb-2"
      {...props}
    >
      {children}
    </h4>
  ),
  p: ({ children, ...props }) => (
    <p className="text-text-secondary leading-relaxed mb-4" {...props}>
      {children}
    </p>
  ),
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      className="text-accent hover:text-accent/80 underline underline-offset-2 transition-colors"
      {...props}
    >
      {children}
    </a>
  ),
  ul: ({ children, ...props }) => (
    <ul className="list-disc pl-6 space-y-2 mb-4 text-text-secondary" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal pl-6 space-y-2 mb-4 text-text-secondary" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-2 border-accent pl-4 my-6 text-text-secondary italic"
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ children, className, ...props }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className={`${className} text-sm`} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="bg-bg-elevated px-1.5 py-0.5 rounded text-sm text-accent font-mono"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => (
    <pre
      className="bg-bg-elevated border border-border-default rounded-lg p-4 my-6 overflow-x-auto text-sm"
      {...props}
    >
      {children}
    </pre>
  ),
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto my-6">
      <table
        className="w-full text-sm border-collapse border border-border-subtle"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-bg-elevated" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th
      className="border border-border-subtle px-4 py-2 text-left text-text-primary font-semibold"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      className="border border-border-subtle px-4 py-2 text-text-secondary"
      {...props}
    >
      {children}
    </td>
  ),
  hr: (props) => (
    <hr className="border-border-subtle my-8" {...props} />
  ),
  strong: ({ children, ...props }) => (
    <strong className="text-text-primary font-semibold" {...props}>
      {children}
    </strong>
  ),
};

// ---------- Page ----------

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const allPosts = await getAllPosts();
  const currentIdx = allPosts.findIndex((p) => p.slug === slug);
  const prev = currentIdx > 0 ? allPosts[currentIdx - 1] : null;
  const next = currentIdx < allPosts.length - 1 ? allPosts[currentIdx + 1] : null;
  const readingTime = estimateReadingTime(post.content);

  return (
    <div className="relative bg-bg-base text-text-primary overflow-x-hidden selection:bg-accent/30">

      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-[100vh] z-0 pointer-events-none origin-top overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] rounded-full bg-accent/5 blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:32px_32px] opacity-[0.03]" />
        <div className="absolute inset-0 bg-gradient-to-b from-bg-base/50 via-bg-base/80 to-bg-base" />
      </div>

      <div className="relative z-10 w-full">
        {/* Hero */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
          <ScrollReveal delay={0.1}>
            <a
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              All posts
            </a>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border-default glass-heavy mb-6">
              <BookOpen className="w-4 h-4 text-accent" />
              <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">
                Post {String(currentIdx + 1).padStart(2, "0")}
              </span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1] mb-6">
              {post.title}
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.25}>
            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <span>{post.publishDate}</span>
              <span className="text-border-default">|</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {readingTime} min read
              </span>
            </div>
          </ScrollReveal>
        </section>

        {/* Body */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <ScrollReveal delay={0.3}>
            <article>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={mdComponents}
              >
                {post.content}
              </ReactMarkdown>
            </article>
          </ScrollReveal>
        </section>

        {/* Prev / Next navigation */}
        {(prev || next) && (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
            <ScrollReveal delay={0.1}>
              <div className="border-t border-border-subtle pt-8 grid grid-cols-2 gap-4">
                {prev ? (
                  <a
                    href={`/blog/${prev.slug}`}
                    className="group glass rounded-xl p-6 glow-card border-accent/10 hover:border-accent/30 transition-all"
                  >
                    <span className="text-xs text-text-secondary flex items-center gap-1 mb-2">
                      <ArrowLeft className="w-3 h-3" /> Previous
                    </span>
                    <span className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-2">
                      {prev.title}
                    </span>
                  </a>
                ) : (
                  <div />
                )}
                {next ? (
                  <a
                    href={`/blog/${next.slug}`}
                    className="group glass rounded-xl p-6 glow-card border-accent/10 hover:border-accent/30 transition-all text-right"
                  >
                    <span className="text-xs text-text-secondary flex items-center justify-end gap-1 mb-2">
                      Next <ArrowRight className="w-3 h-3" />
                    </span>
                    <span className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-2">
                      {next.title}
                    </span>
                  </a>
                ) : (
                  <div />
                )}
              </div>
            </ScrollReveal>
          </section>
        )}
      </div>
    </div>
  );
}
