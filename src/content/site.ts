/**
 * Site content as typed data. Moved verbatim from the old pages before they were
 * deleted (T1): CV (src/pages/CV.tsx), manifesto (src/components/Manifesto.tsx),
 * quotes (src/lib/consts.ts) and the small bits of page copy that had no other home.
 * T2 completes the console slots (handle, role, bio, links, now).
 */

// ---------------------------------------------------------------- identity

export const identity = {
  /** Old nav brand mark. */
  brand: "N.CA",
  fullName: "Nicolas Cerrato Anton",
  github: "kygura",
  email: "ncerratoanton@gmail.com",
  website: "kygra.xyz",
  location: "Malaga, Spain",
} as const;

// ---------------------------------------------------------------- manifesto (/about)

export interface Manifesto {
  title: string;
  paragraphs: string[];
  blockquote: string;
  follow: string;
  closer: string;
  cta: { label: string; to: string };
}

export const manifesto: Manifesto = {
  title: "On Software Craft",
  paragraphs: [
    "I spend most of my waking hours talking to machines. These notes are about how I try to do that without becoming one: why the software I build looks the way it does, and what I refuse to automate away.",

    "I build software the way a cabinetmaker builds a chair: material first, ornament last. Most of what I know came from unmaking things, pulling a system apart until its assumptions sit on the bench, then rebuilding it with fewer parts and better joints. A good tool disappears into the hand. The craft is in what you leave out.",

    "My work sits at the intersection of financial apparatus and software craft. I hold that software can be beautiful as well as functional: interfaces that reduce the friction of modern information systems and do it with elegance, making the experience of using computers a strategic advantage rather than a modern hassle. Each project is an attempt to build something true within the machinery. I just wanna touch grass while the computer does stuff.",
  ],
  blockquote:
    "These are not products. They are tools, interfaces to view and understand reality, never to replace it. This work, is an ongoing effort for simplicity, for clarity, for beauty. To build tools that serve us, not tools that withdraw our attention to control us. It is an effort to live and work deliberately, to find the things worth doing.",
  follow:
    "History is not something that happens to us. It is something we do. Every moment collapses infinite possibilities into a single path. The work we do now reverberates into the future.",
  closer: "The ghost in the machine must remain human.",
  cta: { label: "Explore the work", to: "/projects" },
};

// ---------------------------------------------------------------- CV (/cv)

export interface CvEducation {
  degree: string;
  institution: string;
  period: string;
  description: string;
}

export interface CvProjectArea {
  title: string;
  tech: string;
  points: string[];
}

export interface CvLanguage {
  name: string;
  proficiency: string;
}

export interface Cv {
  title: string;
  pdf: { href: string; filename: string; label: string };
  contact: {
    location: string;
    email: string;
    website: string;
    github: string;
    /** Hidden on the old page (commented out); kept here, not rendered. */
    linkedin: string;
  };
  summary: string;
  projects: CvProjectArea[];
  education: CvEducation[];
  skills: Record<string, string[]>;
  languages: CvLanguage[];
}

export const cv: Cv = {
  title: "Curriculum Vitae",
  pdf: { href: "/CV_NCA.pdf", filename: "CV_NCA.pdf", label: "Download PDF" },
  // The old page also held a phone number that it never rendered. It stays out of
  // the client bundle on purpose (SPEC 3: "Phone number stays unpublished").
  contact: {
    location: "Malaga, Spain",
    email: "ncerratoanton@gmail.com",
    website: "kygra.xyz",
    github: "github.com/kygura",
    linkedin: "https://www.linkedin.com/in/nicolas-cerrato-anton-746bb1412/",
  },
  summary:
    "Software Engineer with a strong foundation in Computer Science and an international academic background (Spain/Germany). Focused on agentic systems, full-stack web development, algorithmic trading, and blockchain protocols. Builds production-grade tooling across TypeScript, Python, and Solidity — from LLM-powered trading cockpits and agent orchestrators to editorial AI and on-chain monetary systems. Trilingual professional (English, German, Spanish).",
  projects: [
    {
      title: "Agentic Systems",
      tech: "TypeScript, Bun, WebSocket, SQLite",
      points: [
        "Designed multi-agent architectures with DAG-based scheduling, dependency resolution, cancellation propagation, and event-sourced audit trails.",
        "Built deterministic execution layers that constrain LLM-generated intent — separating what the agent decides from what the system allows.",
        "Implemented real-time dashboards and terminal UIs for monitoring agent state, live output, and historical replay.",
      ],
    },
    {
      title: "AI Integration & LLM Tooling",
      tech: "OpenAI API, Anthropic API, FastAPI, Python",
      points: [
        "Integrated streaming LLM responses with structured output parsing across OpenAI and Anthropic models.",
        "Built embedding pipelines for semantic search and automatic relationship inference over user-generated content.",
        "Developed editorial and rewriting workflows with inline diff rendering and interactive acceptance flows.",
      ],
    },
    {
      title: "Full-Stack Web Applications",
      tech: "React, Hono, Next.js, Tailwind CSS",
      points: [
        "Built production-grade SPAs and full-stack applications with real-time data, complex state management, and rich interactive UIs.",
        "Designed and implemented REST and WebSocket APIs with typed contracts shared across monorepo packages.",
      ],
    },
    {
      title: "Blockchain & Protocol Design",
      tech: "Solidity, Smart Contracts",
      points: [
        "Designed on-chain monetary mechanisms with supply-sensitive stability and tranche-based risk exposure.",
        "Approached protocol design as a systems engineering problem: incentive alignment, edge-case resilience, and deterministic behavior under adversarial conditions.",
      ],
    },
  ],
  education: [
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
    },
  ],
  skills: {
    Languages: ["TypeScript", "Python", "Go", "C", "JavaScript", "Solidity"],
    Backend: ["Hono", "FastAPI", "Node.js", "Express", "SQLite", "WebSocket"],
    Frontend: ["React", "Next.js", "Tailwind CSS", "React Flow", "MapLibre GL JS"],
    "AI / Agents": ["OpenAI API", "Anthropic API", "LLM Agents", "ReAct", "Embeddings"],
    Blockchain: ["Solidity", "Smart Contracts", "Algorithmic Stablecoins"],
    Tools: ["Bun", "Git", "Docker", "Linux", "Bash", "Vercel"],
  },
  languages: [
    { name: "Spanish", proficiency: "Native" },
    { name: "German", proficiency: "Native / Bilingual" },
    { name: "English", proficiency: "C2 / Proficient (Cambridge Certificate)" },
  ],
};

// ---------------------------------------------------------------- old page copy

/** One-line blurbs from the old pages; kept so T2-T5 can reuse the owner's wording. */
export const legacyCopy = {
  heroTagline: "Software ventures & craft — agentic systems, markets and the open web.",
  writings: "Thoughts on the arts, engineering, the esoteric and the existential.",
  projects: "The current software index. Open any dossier for a more detailed breakdown.",
  guestbook: "Leave a mark here.",
  guestbookOffline:
    "The guestbook is temporarily unavailable because Supabase credentials are not configured for this environment.",
  artifacts: "A collection of digital objects and experiments.",
  whoami: "Only you can ever truly know yourself.",
} as const;

// ---------------------------------------------------------------- fortune quotes

/**
 * From the old footer. `<br>` separates the original line from its translation.
 * Verbatim, including the one duplicate entry.
 */
export const quotes: string[] = [
    "Man is condemned to be free; because once thrown into the world, he is responsible for everything he does.",
    "Livet kan kun forstås baglæns; men det må leves forlæns. <br>Life can only be understood backwards; but it must be lived forwards.",
    "La liberté, c'est ce que vous faites de ce qui a été fait de vous.<br>Freedom is what you do with what's been done to you.",
    "The only way to deal with an unfree world is to become so absolutely free that your very existence is an act of rebellion.",
    "You will never be happy if you continue to search for what happiness consists of. You will never live if you are looking for the meaning of life.",
    "賢者の足跡をたどるな。賢者が目指したものを目指せ。<br>Do not seek to follow in the footsteps of the wise; seek what they sought.",
    "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.",
    "L'homme n'est rien d'autre que ce qu'il se fait. <br>Man is nothing else but what he makes of himself.",
    "Every man must decide whether he will walk in the light of creative altruism or in the darkness of destructive selfishness.",
    "Die Welt ist meine Vorstellung. <br>The world is my representation.",
    "Allein zu leben ist das Schicksal aller großen Seelen. <br>To live alone is the fate of all great souls.",
    "Ohne Musik wäre das Leben ein Irrtum. <br>Without music, life would be a mistake.",
    "Wer ein Warum zum Leben hat, erträgt fast jedes Wie. <br>He who has a why to live can bear almost any how.",
    "Zu leben ist Leiden, zu überleben ist, in dem Leiden einen Sinn zu finden. <br>To live is to suffer, to survive is to find meaning in the suffering.",
    "The mystery of human existence lies not in just staying alive, but in finding something to live for.",
    "Идти своим путем ошибаясь, лучше, чем идти по чужому пути правильно. <br>To go wrong in one's own way is better than to go right in someone else's.",
    "Человек считает только свои беды; он не считает своего счастья. <br>Man only counts his troubles; he does not calculate his happiness.",
    "Der Mensch kann zwar tun, was er will, aber er kann nicht wollen, was er will. <br>Man can do what he wants, but he cannot choose what he wants.",
    "La liberté de l'homme ne consiste pas à faire ce qu'il veut, mais à ne pas faire ce qu'il ne veut pas. <br>Man's freedom does not consist in doing what he wants, but in not doing what he does not want.",
    "L'homme est la seule créature qui refuse d'être ce qu'elle est. <br>Man is the only creature who refuses to be what he is.",
    "Toutes les actions humaines sont équivalentes et toutes sont sur le principe vouées à l'échec. <br>All human actions are equivalent and all are on principle doomed to failure.",
    "Das Glück ist nicht ein Ideal der Vernunft, sondern der Phantasie. <br>Happiness is not an ideal of reason but of imagination.",
    "In the end, we will remember not the words of our enemies, but the silence of our friends.",
    "武士は常に死に備えなければならない——自分の死か、他人の死か。<br>A samurai should always be prepared for death - whether his own or someone else's.",
    "真の美しさとは、攻撃し、圧倒し、奪い、そして最終的に破壊するものである。<br>True beauty is something that attacks, overpowers, robs, and finally destroys.",
    "Find what you love and let it kill you.",
    "What matters most is how well you walk through the fire.",
    "痛みは避けられないが、苦しみは選択である。<br>Pain is inevitable. Suffering is optional.",
    "Die größten und wichtigsten Probleme des Lebens sind grundsätzlich unlösbar. Sie können niemals gelöst, sondern nur überwunden werden.",
    "The loneliest moment in someone’s life is when they are watching their whole world fall apart, and all they can do is stare blankly.",
    "It is not society that is to guide and save the creative hero, but precisely the reverse.",
    "If you're going through hell, you must keep going.",
    "Zu leben ist Leiden, zu überleben ist, in dem Leiden einen Sinn zu finden. <br>To live is to suffer, to survive is to find meaning in the suffering.",
    "Angst ist der Schwindel der Freiheit. <br>Anxiety is the dizziness of freedom.",
    "ألم أن تكون إنسانًا هو الصراع الأبدي بين الروح وما يحيط بها.<br>The pain of being human is the eternal struggle between one's soul and one's surroundings.",
    "Life is a journey that must be traveled no matter how bad the roads and accommodations.",
    "狂った世界では、狂った人々だけが正気である。<br>In a mad world, only the mad are sane.",

    // Added below
    "Existence precedes essence.",
    "Hell is other people.",
    "He who climbs upon the highest mountains laughs at all tragedies, real or imaginary.",
    "The wound is the place where the light enters you.",
    "No tree can grow to heaven unless its roots reach down to hell.",
    "One must imagine Sisyphus happy.",
    "What we fear doing most is usually what we most need to do.",
    "If you gaze long into an abyss, the abyss also gazes into you.",
    "The greatest burden a man can bear is the unfulfilled potential of his own soul.",
    "To have become what one is, one must not have the faintest notion what one is.",
    "When we are no longer able to change a situation, we are challenged to change ourselves.",
    "The privilege of a lifetime is to become who you truly are.",
    "Out of suffering have emerged the strongest souls; the most massive characters are seared with scars.",
    "Loneliness does not come from having no one around, but from being unable to communicate the things that matter.",
    "He who fears he will suffer, already suffers from his fear.",
    "All the world's a stage, and all the men and women merely players.",
    "You become responsible, forever, for what you have tamed.",
    "Do what you can, with what you have, where you are."
];
