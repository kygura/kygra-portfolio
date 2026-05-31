export interface ProjectLink {
  label: string;
  href: string;
}

export type ProjectLayout = "wide" | "standard" | "full";

export interface ProjectDraft {
  slug?: string;
  accent?: string;
  title: string;
  subtitle: string;
  summary: string;
  description: string;
  overview: string[];
  repo?: string;
  live?: string;
  links?: ProjectLink[];
  techStack?: string[];
  layout?: ProjectLayout;
  status: string;
  year: string;
}

export interface Project {
  slug: string;
  accent?: string;
  title: string;
  subtitle: string;
  summary: string;
  description: string;
  overview: string[];
  links: ProjectLink[];
  techStack?: string[];
  layout: ProjectLayout;
  status: string;
  year: string;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

function uniqueLinks(links: ProjectLink[]): ProjectLink[] {
  const seen = new Set<string>();

  return links.filter((link) => {
    const key = `${link.label}:${link.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function defineProject(project: ProjectDraft): Project {
  const slug = project.slug ?? slugify(project.title);
  const generatedLinks: ProjectLink[] = [{ label: "Open dossier", href: `/projects/${slug}` }];

  if (project.live) {
    generatedLinks.push({ label: "Live demo", href: project.live });
  }

  if (project.repo) {
    generatedLinks.push({ label: "GitHub", href: project.repo.replace(/\.git$/, "") });
  }

  return {
    slug,
    accent: project.accent,
    title: project.title,
    subtitle: project.subtitle,
    summary: project.summary,
    description: project.description,
    overview: project.overview,
    links: uniqueLinks([...generatedLinks, ...(project.links ?? [])]),
    techStack: project.techStack,
    layout: project.layout ?? "standard",
    status: project.status,
    year: project.year,
  };
}

export const defineProjects = (projects: ProjectDraft[]) => projects.map(defineProject);
