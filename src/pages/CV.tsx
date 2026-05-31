import {
  Download, MapPin, Mail, Globe,
  GitBranch, Link2, Phone
} from "lucide-react";

const CV = () => {

  const contact = {
    location: "Malaga, Spain",
    phone: "+34 658 50 37 43",
    email: "ncerratoanton@gmail.com",
    website: "kygra.xyz",
    github: "github.com/kygura",
    linkedin: "https://www.linkedin.com/in/nicolas-cerrato-anton-746bb1412/"
  };

  const summary = "Software Engineer with a strong foundation in Computer Science and an international academic background (Spain/Germany). Focused on agentic systems, full-stack web development, algorithmic trading, and blockchain protocols. Builds production-grade tooling across TypeScript, Python, and Solidity — from LLM-powered trading cockpits and agent orchestrators to editorial AI and on-chain monetary systems. Trilingual professional (English, German, Spanish).";

  const education = [
    {
      degree: "Bachelor of Science in Computer Engineering",
      institution: "Universidad de Málaga",
      period: "Oct 2022 – Oct 2024",
      description: "",
    },
    {
      degree: "Bachelor of Science in Computer Engineering (First Cycle)",
      institution: "Albert-Ludwigs-Universität Freiburg",
      period: "Sep 2020 – Jul 2022",
      description: "Relevant Coursework: Machine Learning, Smart Contracts, System Programming.",
    },
    {
      degree: "High School Diploma (Abitur Equivalent - Bilingual Education)",
      institution: "Deutsche Schule Las Palmas",
      period: "2006 – 2018",
      description: "",
    }
  ];

  const projects = [
    {
      title: "Agentic Systems",
      tech: "TypeScript, Bun, WebSocket, SQLite",
      points: [
        "Designed multi-agent architectures with DAG-based scheduling, dependency resolution, cancellation propagation, and event-sourced audit trails.",
        "Built deterministic execution layers that constrain LLM-generated intent — separating what the agent decides from what the system allows.",
        "Implemented real-time dashboards and terminal UIs for monitoring agent state, live output, and historical replay."
      ]
    },
    {
      title: "AI Integration & LLM Tooling",
      tech: "OpenAI API, Anthropic API, FastAPI, Python",
      points: [
        "Integrated streaming LLM responses with structured output parsing across OpenAI and Anthropic models.",
        "Built embedding pipelines for semantic search and automatic relationship inference over user-generated content.",
        "Developed editorial and rewriting workflows with inline diff rendering and interactive acceptance flows."
      ]
    },
    {
      title: "Full-Stack Web Applications",
      tech: "React, Hono, Next.js, Tailwind CSS",
      points: [
        "Built production-grade SPAs and full-stack applications with real-time data, complex state management, and rich interactive UIs.",
        "Designed and implemented REST and WebSocket APIs with typed contracts shared across monorepo packages."
      ]
    },
    {
      title: "Blockchain & Protocol Design",
      tech: "Solidity, Smart Contracts",
      points: [
        "Designed on-chain monetary mechanisms with supply-sensitive stability and tranche-based risk exposure.",
        "Approached protocol design as a systems engineering problem: incentive alignment, edge-case resilience, and deterministic behavior under adversarial conditions."
      ]
    }
  ];

  const languages = [
    { name: "Spanish", proficiency: "Native" },
    { name: "German", proficiency: "Native / Bilingual" },
    { name: "English", proficiency: "C2 / Proficient (Cambridge Certificate)" },
  ];

  const skills = {
    "Languages": ["TypeScript", "Python", "Go", "C", "JavaScript", "Solidity"],
    "Backend": ["Hono", "FastAPI", "Node.js", "Express", "SQLite", "WebSocket"],
    "Frontend": ["React", "Next.js", "Tailwind CSS", "React Flow", "MapLibre GL JS"],
    "AI / Agents": ["OpenAI API", "Anthropic API", "LLM Agents", "ReAct", "Embeddings"],
    "Blockchain": ["Solidity", "Smart Contracts", "Algorithmic Stablecoins"],
    "Tools": ["Bun", "Git", "Docker", "Linux", "Bash", "Vercel"],
  };

  const downloadPDF = () => {
    // Create a link element and trigger download
    const link = document.createElement('a');
    link.href = '/CV.pdf';
    link.download = 'CV_NCA.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="px-6 md:px-12 lg:px-16 py-16 md:py-24 max-w-4xl animate-fade-in mx-auto">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8">
        <div>
          <h1 className="text-5xl md:text-6xl font-display font-light mb-4">
            Curriculum Vitae
          </h1>
          <div className="text-lg text-muted-foreground space-y-2">
            <p className="flex items-center gap-2">
              <MapPin className="w-4 h-4" /> {contact.location}
            </p>
            <div className="flex flex-wrap gap-4 text-sm md:text-base">
              <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                <Mail className="w-4 h-4" /> {contact.email}
              </a>
              <a href={`https://${contact.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Globe className="w-4 h-4" /> {contact.website}
              </a>
              <a href={`https://${contact.github}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                <GitBranch className="w-4 h-4" /> github.com/kygura
              </a>
              {/* <a href={`https://${contact.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Link2 className="w-4 h-4" /> ${contact.linkedin.replace('https://', '')}
              </a> */}
            </div>
          </div>
        </div>
        <button
          onClick={downloadPDF}
          className="cv-download-btn mt-4 md:mt-0 self-start shrink-0"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-display font-light mb-4 text-foreground/90">Professional Summary</h2>
        <p className="text-muted-foreground leading-relaxed">
          {summary}
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-display font-light mb-8">Technical Projects</h2>
        <div className="space-y-8">
          {projects.map((project, index) => (
            <div key={index} className="border-l-2 border-border pl-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                <h3 className="text-xl font-display">{project.title}</h3>
                <span className="text-sm px-2 py-0.5 border border-foreground/40 text-foreground bg-foreground/5 w-fit">
                  {project.tech}
                </span>
              </div>
              <ul className="list-disc list-outside ml-4 text-muted-foreground space-y-1">
                {project.points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-display font-light mb-8">Education</h2>
        <div className="space-y-8">
          {education.map((edu, index) => (
            <div key={index} className="border-l-2 border-border pl-6">
              <h3 className="text-xl font-display mb-2">{edu.degree}</h3>
              <p className="text-muted-foreground mb-2">
                {edu.institution} • {edu.period}
              </p>
              {edu.description && <p className="text-muted-foreground italic text-sm">{edu.description}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-display font-light mb-8">Technical Skills</h2>
        <div className="space-y-8">
          {Object.entries(skills).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xl font-display mb-4">{category}</h3>
              <div className="flex flex-wrap gap-2">
                {items.map((skill) => (
                  <span
                    key={skill}
                    className="px-4 py-2 text-sm border border-foreground/40 text-foreground bg-foreground/5"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-3xl font-display font-light mb-8">Languages</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {languages.map((lang, index) => (
            <div key={index} className="border-l-2 border-border pl-6">
              <h3 className="text-xl font-display mb-1">{lang.name}</h3>
              <p className="text-muted-foreground">{lang.proficiency}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CV;
