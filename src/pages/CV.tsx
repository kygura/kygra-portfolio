import { Fragment } from "react";

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
    link.href = '/CV_NCA.pdf';
    link.download = 'CV_NCA.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="sheet page">
      <div className="session">
        <span className="session__num">Sheet <em>05</em></span>
        <h1>Curriculum</h1>
        <span className="session__hint">
          <button type="button" onClick={downloadPDF} className="btn">
            Download PDF
          </button>
        </span>
      </div>

      <div className="titleblock">
        <div><b>Location</b>{contact.location}</div>
        <div><b>Email</b><a href={`mailto:${contact.email}`}>{contact.email}</a></div>
        <div>
          <b>Web</b>
          <a href={`https://${contact.website}`} target="_blank" rel="noopener noreferrer">{contact.website}</a>
        </div>
        <div>
          <b>GitHub</b>
          <a href={`https://${contact.github}`} target="_blank" rel="noopener noreferrer">github.com/kygura</a>
        </div>
      </div>

      <div className="session">
        <span className="session__num">Sec. <em>1</em></span>
        <h2>Professional Summary</h2>
      </div>
      <section className="plate cv-summary">
        <div className="prose">
          <p>{summary}</p>
        </div>
      </section>

      <div className="session">
        <span className="session__num">Sec. <em>2</em></span>
        <h2>Technical Projects</h2>
      </div>
      <section className="plate">
        <dl className="deflist">
          {projects.map((project) => (
            <Fragment key={project.title}>
              <dt>{project.title}<small>{project.tech}</small></dt>
              <dd>
                <ul>
                  {project.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </dd>
            </Fragment>
          ))}
        </dl>
      </section>

      <div className="session">
        <span className="session__num">Sec. <em>3</em></span>
        <h2>Education</h2>
      </div>
      <section className="plate">
        <dl className="deflist">
          {education.map((edu) => (
            <Fragment key={edu.degree}>
              <dt>{edu.period}</dt>
              <dd>
                <p>{edu.degree}</p>
                <p className="muted">{edu.institution}</p>
                {edu.description && <p className="muted">{edu.description}</p>}
              </dd>
            </Fragment>
          ))}
        </dl>
      </section>

      <div className="session">
        <span className="session__num">Sec. <em>4</em></span>
        <h2>Technical Skills</h2>
      </div>
      <section className="plate">
        <dl className="deflist">
          {Object.entries(skills).map(([category, items]) => (
            <Fragment key={category}>
              <dt>{category}</dt>
              <dd>{items.join(" · ")}</dd>
            </Fragment>
          ))}
        </dl>
      </section>

      <div className="session">
        <span className="session__num">Sec. <em>5</em></span>
        <h2>Languages</h2>
      </div>
      <section className="plate">
        <dl className="deflist">
          {languages.map((lang) => (
            <Fragment key={lang.name}>
              <dt>{lang.name}</dt>
              <dd>{lang.proficiency}</dd>
            </Fragment>
          ))}
        </dl>
      </section>
    </div>
  );
};

export default CV;
