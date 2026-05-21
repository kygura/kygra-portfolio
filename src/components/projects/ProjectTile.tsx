import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { Project } from "@/lib/projects";
import ProjectVisual from "./ProjectVisual";

interface ProjectTileProps {
  project: Project;
}

const ProjectTile = ({ project }: ProjectTileProps) => {
  const externalLinks = useMemo(
    () => project.links.filter((link) => !link.href.startsWith("/")),
    [project.links],
  );

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [8, -8]), { stiffness: 300, damping: 28 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-8, 8]), { stiffness: 300, damping: 28 });
  const glareX = useTransform(mouseX, [0, 1], [0, 100]);
  const glareY = useTransform(mouseY, [0, 1], [0, 100]);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  return (
    <motion.article
      className={`project-tile project-tile--${project.palette} project-tile--${project.layout}`}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.012 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <Link
        to={`/projects/${project.slug}`}
        className="project-tile__overlay"
        aria-label={`Open ${project.title} project details`}
      />

      {/* Glare overlay */}
      <motion.div
        className="project-tile__tilt-inner"
        style={{
          background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(242,237,228,0.06) 0%, transparent 55%)`,
        }}
        aria-hidden
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
    </motion.article>
  );
};

export default ProjectTile;
