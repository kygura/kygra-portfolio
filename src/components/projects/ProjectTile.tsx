import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Project, ProjectParticleMode } from "@/lib/projects";
import ProjectParticleField from "./ProjectParticleField";
import ProjectVisual from "./ProjectVisual";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
}

const particlePalettes: Record<Project["palette"], string[]> = {
  meridian: ["#0a0a0a", "#2ab4b4", "#3d6ee8"],
  zknull: ["#f0ede6", "#3d6ee8", "#e8553d"],
  equilibria: ["#0a0a0a", "#e8553d", "#3d6ee8"],
  lexis: ["#0a0a0a", "#e8553d", "#f0ede6"],
};

interface ProjectTileProps {
  project: Project;
  particleMode: ProjectParticleMode;
}

const ProjectTile = ({ project, particleMode }: ProjectTileProps) => {
  const frameRef = useRef<number | null>(null);
  const lastEmitRef = useRef(0);
  const [particles, setParticles] = useState<Particle[]>([]);

  const externalLinks = useMemo(
    () => project.links.filter((link) => !link.href.startsWith("/")),
    [project.links],
  );

  useEffect(() => {
    if (!particles.length || frameRef.current) {
      return;
    }

    const tick = () => {
      setParticles((current) => {
        const next = current
          .map((particle) => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            vy: particle.vy + 0.08,
            life: particle.life - 0.045,
          }))
          .filter((particle) => particle.life > 0);

        if (next.length) {
          frameRef.current = window.requestAnimationFrame(tick);
        } else {
          frameRef.current = null;
        }

        return next;
      });
    };

    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [particles.length]);

  const emitParticles = (x: number, y: number) => {
    const colors = particlePalettes[project.palette];
    const config =
      particleMode === "neon"
        ? {
            count: 4,
            limit: 40,
            sizeMin: 4,
            sizeSpread: 7,
            speed: 2.1,
            lift: 2.2,
          }
        : {
            count: 2,
            limit: 28,
            sizeMin: 6,
            sizeSpread: 8,
            speed: 0.9,
            lift: 0.9,
          };

    setParticles((current) => [
      ...current.slice(-config.limit),
      ...Array.from({ length: config.count }, (_, index) => ({
        id: Date.now() + index + Math.random(),
        x,
        y,
        vx: (Math.random() - 0.5) * config.speed,
        vy: -config.lift - Math.random() * config.speed,
        life: 1,
        size: config.sizeMin + Math.random() * config.sizeSpread,
        color: colors[Math.floor(Math.random() * colors.length)],
      })),
    ]);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const now = performance.now();
    if (now - lastEmitRef.current < 38) {
      return;
    }

    lastEmitRef.current = now;

    const rect = event.currentTarget.getBoundingClientRect();
    emitParticles(event.clientX - rect.left, event.clientY - rect.top);
  };

  return (
    <article
      className={`project-tile project-tile--${project.palette} project-tile--${project.layout}`}
      onPointerMove={handlePointerMove}
    >
      <Link
        to={`/projects/${project.slug}`}
        className="project-tile__overlay"
        aria-label={`Open ${project.title} project details`}
      />

      <ProjectParticleField
        mode={particleMode}
        particles={particles.map((particle) => ({
          id: particle.id,
          x: particle.x,
          y: particle.y,
          size: particle.size,
          opacity: Math.max(particle.life, 0),
          scale: 0.7 + particle.life * 0.6,
          color: particle.color,
        }))}
      />

      <div className="project-tile__visual">
        <ProjectVisual palette={project.palette} />
      </div>

      <div className="project-tile__content">
        <div className="project-tile__meta">
          <span>{project.status}</span>
          <span>{project.year}</span>
        </div>

        <div className="project-tile__body">
          <p className="project-tile__eyebrow">{project.subtitle}</p>
          <h2 className="project-tile__title">
            {project.title}
            <ArrowUpRight className="project-tile__arrow" />
          </h2>
          <p className="project-tile__summary">{project.summary}</p>

          <div className="project-tile__stack">
            {project.techStack.map((tech) => (
              <span key={tech}>{tech}</span>
            ))}
          </div>
        </div>

        <div className="project-tile__links">
          {externalLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="project-tile__link"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </article>
  );
};

export default ProjectTile;
