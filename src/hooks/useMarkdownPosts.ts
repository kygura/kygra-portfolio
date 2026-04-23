import { useMemo } from "react";

export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  tags: string[];
  content: string;
  readTime: number;
}

// Simple frontmatter parser (browser-compatible)
type FrontmatterValue = string | string[];

function parseFrontmatter(text: string) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = text.match(frontmatterRegex);
  
  if (!match) {
    return { data: {}, content: text };
  }

  const frontmatter = match[1];
  const content = match[2];
  
  const data: Record<string, FrontmatterValue> = {};
  
  // Parse YAML-like frontmatter
  frontmatter.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value: FrontmatterValue = line.substring(colonIndex + 1).trim();
      
      // Remove quotes
      value = value.replace(/^["']|["']$/g, '');
      
      // Parse arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value
          .slice(1, -1)
          .split(',')
          .map((v) => v.trim().replace(/^["']|["']$/g, ''));
      }
      
      data[key] = value;
    }
  });
  
  return { data, content };
}

export const useMarkdownPosts = () => {
  const posts = useMemo(() => {
    // Import all markdown files from the posts directory
    const markdownFiles = import.meta.glob<string>("../posts/*.md", {
      eager: true,
      query: "?raw",
      import: "default",
    });

    const parsedPosts: Post[] = [];

    for (const [path, content] of Object.entries(markdownFiles)) {
      // Extract filename without extension to use as slug
      const filename = path.split("/").pop()?.replace(".md", "") || "";
      
      // Parse frontmatter and content
      const { data, content: markdownContent } = parseFrontmatter(content);

      parsedPosts.push({
        slug: filename,
        title: data.title || "",
        excerpt: data.description || data.excerpt || "", // Fallback to description if excerpt missing
        date: data.date || "2023-01-01",
        category: data.category || "General",
        tags: Array.isArray(data.tags) ? data.tags : [],
        content: markdownContent,
        readTime: Number(data.readTime) || 10,
      });
    }

    // Sort posts by date (newest first)
    return parsedPosts.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, []);

  return posts;
};

export const useMarkdownPost = (slug: string | undefined) => {
  const posts = useMarkdownPosts();
  return posts.find((post) => post.slug === slug);
};
