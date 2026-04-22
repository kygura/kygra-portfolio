import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Project } from "@/lib/projects";
import ProjectVisual from "./ProjectVisual";

interface ProjectTileProps {
  project: Project;
}

interface Trail {
  id: number;
  x: number;
  y: number;
  life: number;
  size: number;
}

const ProjectTile = ({ project }: ProjectTileProps) => {
  const articleRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | null>(null);
  const lastEmitRef = useRef(0);
  const [trails, setTrails] = useState<Trail[]>([]);

  const externalLinks = useMemo(
    () => project.links.filter((link) => !link.href.startsWith("/")),
    [project.links],
  );

  useEffect(() => {
    if (!trails.length || frameRef.current) return;

    const tick = () => {
      setTrails((current) => {
        const next = current
          .map((t) => ({ ...t, life: t.life - 0.028 }))
          .filter((t) => t.life > 0);

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
  }, [trails.length]);

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const el = articleRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const now = performance.now();
    if (now - lastEmitRef.current < 28) return;
    lastEmitRef.current = now;

    setTrails((current) => [
      ...current.slice(-22),
      {
        id: now + Math.random(),
        x,
        y,
        life: 1,
        size: 10 + Math.random() * 6,
      },
    ]);
  };

  const handlePointerLeave = () => {
    lastEmitRef.current = 0;
  };

  return (
    <article
      ref={articleRef}
      className={`project-tile project-tile--${project.palette} project-tile--${project.layout}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <Link
        to={`/projects/${project.slug}`}
        className="project-tile__overlay"
        aria-label={`Open ${project.title} project details`}
      />

      <div className="project-tile__trail" aria-hidden="true">
        {trails.map((t) => {
          const life = Math.max(t.life, 0);
          const scale = 0.5 + life * 0.9;
          return (
            <span
              key={t.id}
              className="project-tile__trail-dot"
              style={{
                left: t.x,
                top: t.y,
                width: t.size,
                height: t.size,
                opacity: life * 0.7,
                transform: `translate(-50%, -50%) scale(${scale})`,
              }}
            />
          );
        })}
      </div>

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
