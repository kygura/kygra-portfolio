import projectData from "./projects.json";

export interface ProjectLink {
  label: string;
  href: string;
}

export type ProjectParticleMode = "dust" | "neon";

export interface Project {
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  description: string;
  overview: string[];
  highlights: string[];
  techStack: string[];
  links: ProjectLink[];
  palette: "meridian" | "zknull" | "equilibria" | "lexis" | "hyperagent" | "airmy" | "colony" | "gaia";
  layout: "wide" | "standard" | "full";
  status: string;
  year: string;
}

export const projects: Project[] = projectData as Project[];

export const getProjectBySlug = (slug?: string) =>
  projects.find((project) => project.slug === slug);
