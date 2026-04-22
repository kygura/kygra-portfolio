import type { ProjectParticleMode } from "@/lib/projects";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  scale: number;
  color: string;
}

interface ProjectParticleFieldProps {
  mode: ProjectParticleMode;
  particles: Particle[];
}

const ProjectParticleField = ({ mode, particles }: ProjectParticleFieldProps) => {
  return (
    <div className={`project-particles project-particles--${mode}`} aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="project-particle"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
            transform: `translate(-50%, -50%) scale(${particle.scale})`,
            background: particle.color,
            boxShadow:
              mode === "neon"
                ? `0 0 18px ${particle.color}, 0 0 34px ${particle.color}`
                : `0 0 10px color-mix(in srgb, ${particle.color} 40%, transparent)`,
          }}
        />
      ))}
    </div>
  );
};

export default ProjectParticleField;
