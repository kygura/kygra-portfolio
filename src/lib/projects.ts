import { projectDossiers } from "./project-dossiers";

export type { Project, ProjectDraft, ProjectLayout, ProjectLink } from "./project-schema";

export const projects = projectDossiers;

export const getProjectBySlug = (slug?: string) =>
  projects.find((project) => project.slug === slug);
