import { ArrowRight, BookOpen } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/scroll-reveal";
import { getAllPosts } from "@/lib/blog";

export const metadata = {
  title: "Blog — ArxMint",
  description:
    "Building the Citadel: a blog series on Bitcoin circular economies, ecash privacy, AI agent commerce, and sovereign infrastructure.",
};

export default async function BlogPage() {
  const posts = await getAllPosts();

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
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 text-center sm:text-left">
          <ScrollReveal delay={0.1}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border-default glass-heavy mb-8">
              <BookOpen className="w-4 h-4 text-accent" />
              <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">
                Blog
              </span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] mb-8">
              Building the{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent/60">
                Citadel
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <p className="text-lg sm:text-xl text-text-secondary font-light max-w-3xl leading-relaxed">
              A series on Bitcoin circular economies, ecash privacy, AI agent
              commerce, and the infrastructure that ties them together.
            </p>
          </ScrollReveal>
        </section>

        {/* Post Grid */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
          <StaggerContainer staggerDelay={0.12}>
            <div className="grid gap-6">
              {posts.map((post, i) => (
                <StaggerItem key={post.slug}>
                  <a
                    href={`/blog/${post.slug}`}
                    className="block glass rounded-xl p-8 glow-card border-accent/10 transition-all hover:border-accent/30 group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-xs font-mono text-accent/70">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="text-xs text-text-secondary">
                            {post.publishDate}
                          </span>
                        </div>
                        <h2 className="text-xl font-semibold text-text-primary mb-3 group-hover:text-accent transition-colors">
                          {post.title}
                        </h2>
                        <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">
                          {post.description}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-text-secondary shrink-0 mt-1 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                    </div>
                  </a>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>
        </section>
      </div>
    </div>
  );
}
