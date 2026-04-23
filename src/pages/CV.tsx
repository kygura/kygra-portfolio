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
    linkedin: "linkedin.com/in/nca"
  };

  const summary = "Software Engineer with a strong foundation in Computer Science and international academic background (Spain/Germany). Specialized in Web Development, Backend development, Blockchain technologies (Solidity), and AI integration. Proven track record of building autonomous trading systems and fine-tuning LLMs. Trilingual professional (English, German, Spanish).";

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
      title: "Algorithmic Trading System",
      tech: "Python, Pandas, APIs",
      points: [
        "Designed and deployed a systemic trading model incorporating heuristic algorithms and macro-economic data analysis.",
        "Engineered automated execution strategies based on discretionary inputs and risk management protocols.",
        "Optimized data processing pipelines to handle real-time market inputs efficiently."
      ]
    },
    {
      title: "LLM Fine-Tuning & AI Integration",
      tech: "Python, PyTorch",
      points: [
        "Trained and fine-tuned Large Language Models (LLMs) using PyTorch for specialized reasoning tasks.",
        "Integrated emergent AI technologies to enhance backend logic and data processing capabilities."
      ]
    },
    {
      title: "Multiple Web Applications",
      tech: "Varying across projects",
      points: [
        "Developed multiple web & applications tackling friction in the software and finance world.",
        "Implemented modern UI/UX principles and optimized frontend performance."
      ]
    }
  ];

  const languages = [
    { name: "Spanish", proficiency: "Native" },
    { name: "German", proficiency: "Native / Bilingual" },
    { name: "English", proficiency: "C2 / Proficient (Cambridge Certificate)" },
  ];

  const skills = {
    "Languages": ["Python", "Go", "C", "JavaScript", "TypeScript", "Solidity"],
    "Backend": ["Node.js", "Express", "Hono", "SQL"],
    "Frontend": ["React", "Next.js", "Tailwind CSS", "HTML/CSS"],
    "AI/Data": ["PyTorch", "LLM Fine-tuning", "Pandas", "NumPy"],
    "Tools": ["Git", "Docker", "Linux", "Bash"],
  };

  const downloadPDF = () => {
    // Create a link element and trigger download
    const link = document.createElement('a');
    link.href = '/CV.pdf';
    link.download = 'NCA_CV.pdf';
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
              <a href={`https://${contact.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Link2 className="w-4 h-4" /> linkedin.com/in/nca
              </a>
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
