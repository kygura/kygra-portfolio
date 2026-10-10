import SectionHead from "@/components/SectionHead";

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

  return (
    <>
      <div className="ptitle">
        <p className="mono mute" style={{ marginTop: 0 }}>§05 — Credentials</p>
        <h1 className="disp">Curriculum</h1>
        <p>{summary}</p>
      </div>

      <div className="dossier__meta mono">
        <div><b>Based</b>{contact.location}</div>
        <div><b>Mail</b><a href={`mailto:${contact.email}`} className="u">{contact.email}</a></div>
        <div><b>Code</b><a href={`https://${contact.github}`} target="_blank" rel="noopener noreferrer" className="u">{contact.github}</a></div>
        <div><b>Paper copy</b><a href="/CV_NCA.pdf" download="CV_NCA.pdf" className="u">Download PDF ↓</a></div>
      </div>

      <SectionHead n="01" title="Technical projects" right={`${String(projects.length).padStart(2, "0")} groups`} />
      {projects.map((project) => (
        <div key={project.title} className="cv__row">
          <div className="mono">{project.tech}</div>
          <div>
            <h3>{project.title}</h3>
            <ul>
              {project.points.map((point) => <li key={point}>{point}</li>)}
            </ul>
          </div>
        </div>
      ))}

      <SectionHead n="02" title="Education" />
      {education.map((edu) => (
        <div key={edu.degree + edu.period} className="cv__row">
          <div className="mono">{edu.period}</div>
          <div>
            <h3>{edu.degree}</h3>
            <p className="mono mute" style={{ marginTop: 6 }}>{edu.institution}</p>
            {edu.description && <p style={{ marginTop: 8, fontStyle: "italic" }}>{edu.description}</p>}
          </div>
        </div>
      ))}

      <SectionHead n="03" title="Skills" />
      {Object.entries(skills).map(([category, items]) => (
        <div key={category} className="cv__row">
          <div className="mono">{category}</div>
          <div className="cv__chips mono">
            {items.map((skill) => <span key={skill}>{skill}</span>)}
          </div>
        </div>
      ))}

      <SectionHead n="04" title="Languages" />
      {languages.map((lang) => (
        <div key={lang.name} className="cv__row">
          <div className="mono">{lang.name}</div>
          <div>{lang.proficiency}</div>
        </div>
      ))}

      <div className="colophon__end mono">
        <span className="mute">Phone on request</span>
        <a href="/CV_NCA.pdf" download="CV_NCA.pdf" className="cv__dl">Download PDF ↓</a>
      </div>
    </>
  );
};

export default CV;
