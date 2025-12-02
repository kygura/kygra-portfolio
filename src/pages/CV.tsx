import { Download } from "lucide-react";

const CV = () => {

  const education = [
    {
      degree: "Bachelor of Science in Computer Engineering",
      institution: "Universidad de Málaga",
      period: "2020 - 2025",
      description: "Foundational knowledge in computer engineering.",
    },
    {
      degree: "High School Diploma",
      institution: "Deutsche Schule Las Palmas",
      period: "2006 - 2018",
      description: "Bilingual highschool education in German and Spanish.",
    }
  ];

  const languages = [
    { name: "Spanish", proficiency: "Native" },
    { name: "German", proficiency: "Fluent (C1)" },
    { name: "English", proficiency: "Fluent (C2)" },
  ];

  const skills = {
    "Programming Languages": ["Python", "Go", "C", "JS/TS"],
    "Frontend": ["React/Next.js", "Tailwind CSS"],
    "Backend": ["Express/Hono", "SQL", "Solidity"],
    "Tools & DevOps": ["Git", "Docker"],
    "Soft Skills": ["Creative Writing", "Asset Manager", "Quantitative", "Project Lead", "Agile/Scrum"],
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
    <div className="px-6 md:px-12 lg:px-16 py-16 md:py-24 max-w-4xl animate-fade-in">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-5xl md:text-6xl font-display font-light mb-4">
            Curriculum Vitae
          </h1>
          <p className="text-lg text-muted-foreground">
            My professional experience and qualifications.
          </p>
        </div>
        <button
          onClick={downloadPDF}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-300 rounded-sm"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </div>

      <section className="mb-16">
        <h2 className="text-3xl font-display font-light mb-8 mt-16">Education</h2>
        <div className="space-y-8">
          {education.map((edu, index) => (
            <div key={index} className="border-l-2 border-border pl-6">
              <h3 className="text-xl font-display mb-2">{edu.degree}</h3>
              <p className="text-muted-foreground mb-2">
                {edu.institution} • {edu.period}
              </p>
              <p className="text-muted-foreground">{edu.description}</p>
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

      <section className="mb-16">
        <h2 className="text-3xl font-display font-light mb-8">Technical Skills</h2>
        <div className="space-y-8">
          {Object.entries(skills).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xl font-display mb-4">{category}</h3>
              <div className="flex flex-wrap gap-2">
                {items.map((skill) => (
                  <span
                    key={skill}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-sm text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CV;
