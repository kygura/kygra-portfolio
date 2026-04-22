import Header from "../components/Header";
import ProjectTile from "@/components/projects/ProjectTile";
import { projects } from "@/lib/projects";

const Home = () => {
  return (
    <div className="bebop-theme-root">
      <Header />

      <div className="home-projects">
        <section className="home-projects__grid" aria-label="Featured projects">
          {projects.map((project) => (
            <ProjectTile key={project.slug} project={project} />
          ))}
        </section>
      </div>
    </div>
  );
};

export default Home;
