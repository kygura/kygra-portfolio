import { Github, Mail } from "lucide-react";
import Footer from "../components/Footer";

const Home = () => {
  return <div className="px-6 md:px-12 lg:px-16 py-16 md:py-24 max-w-4xl">
      <div className="prose-minimal animate-fade-in">
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-display font-light mb-8">
          ​Nicolas C.A  
        </h1>
        
        <p className="text-xl md:text-2xl font-light italic mb-12 text-muted-foreground">
          Software Engineer
        </p>

        <div className="space-y-6 text-lg leading-relaxed">
          <p>
          Welcome. I'm a software developer by trade with a passion for distilling the complexity of the world into elegant solutions. My work has been mostly aimed at the intersection of finance and tech, building programmable wealth in post-AGI world.
          </p>

          <p className="text-muted-foreground">
          Currently focused on zkNull, a zero-knowledge private stablecoin on Ethereum. I'm also working on the first drafts of on-chain agentic AI, capable of performing financial transactions on behalf of users.
          </p>
        </div>

        <div className="flex gap-6 mt-12">
          <a href="https://github.com/kygura" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors duration-300 hover:scale-110 hover:rotate-3" aria-label="GitHub">
            <Github className="w-6 h-6" />
          </a>

          <a href="mailto:ncerratoanton@gmail.com" className="text-muted-foreground hover:text-foreground transition-colors duration-300 hover:scale-110 hover:rotate-3" aria-label="Email">
            <Mail className="w-6 h-6" />
          </a>
        </div>

        <p className="text-sm text-muted-foreground mt-16 italic">
          <Footer />
        </p>
        
      </div>
    </div>;
};
export default Home;
