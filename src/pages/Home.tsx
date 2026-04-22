import { useCallback, useMemo, useState } from "react";
import Header from "../components/Header";
import ProjectTile from "@/components/projects/ProjectTile";
import { projects, type ProjectParticleMode } from "@/lib/projects";

const Home = () => {
  const modes = useMemo<ProjectParticleMode[]>(() => ["dust", "neon"], []);
  const [particleMode, setParticleMode] = useState<ProjectParticleMode>("dust");

  const cycleMode = useCallback(
    (direction: number) => {
      setParticleMode((current) => {
        const currentIndex = modes.indexOf(current);
        const nextIndex = (currentIndex + direction + modes.length) % modes.length;

        return modes[nextIndex];
      });
    },
    [modes],
  );

  return (
    <div className="bebop-theme-root">
      <Header />

      <div className="home-projects">
        
        <section className="home-projects__grid" aria-label="Featured projects">
          {projects.map((project) => (
            <ProjectTile
              key={project.slug}
              project={project}
              particleMode={particleMode}
            />
          ))}
        </section>
      </div>
    </div>
  );
};

export default Home;
