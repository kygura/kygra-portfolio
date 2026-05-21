export interface ProjectLink {
  label: string;
  href: string;
}

export type ProjectParticleMode = "dust" | "neon";

export interface Project {
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  description: string;
  overview: string[];
  highlights: string[];
  techStack: string[];
  links: ProjectLink[];
  palette: "meridian" | "zknull" | "equilibria" | "lexis" | "hyperagent" | "airmy" | "colony" | "gaia";
  layout: "wide" | "standard" | "full";
  status: string;
  year: string;
}

export const projects: Project[] = [
  {
    slug: "meridian",
    title: "Meridian",
    subtitle: "Cartography Interface",
    summary:
      "A cartographic interface for indexing meaningful places, memories, and signals across the globe.",
    description:
      "Meridian is a mapping product focused on turning movement, memory, and context into something explorable. The interface treats geography as a living archive rather than a static layer.",
    overview: [
      "The product combines map interactions with AI-assisted context so locations can become annotated experiences instead of anonymous coordinates.",
      "It is designed to feel investigative and directional: a system for discovery, not just storage. Every interaction is aimed at making the map feel inhabited by meaning.",
    ],
    highlights: [
      "Interactive map-based exploration flow",
      "Contextual AI support for interpreting locations",
      "Designed for narrative discovery rather than generic pin dropping",
    ],
    techStack: ["React", "Google Maps", "Deepseek", "Claude"],
    links: [
      { label: "Open dossier", href: "/projects/meridian" },
      { label: "Live demo", href: "https://meridian-map.vercel.app/" },
      { label: "GitHub", href: "https://github.com/kygura/meridian" },
    ],
    palette: "meridian",
    layout: "wide",
    status: "Active build",
    year: "2026",
  },
  {
    slug: "zknull",
    title: "zkNull",
    subtitle: "Privacy Layer",
    summary:
      "A privacy-preserving coin system with a dedicated privacy layer built over zkEVM infrastructure.",
    description:
      "zkNull explores how privacy can be embedded into transaction flows without sacrificing composability. The project is framed as a protocol system first and a product second.",
    overview: [
      "The architecture leans on zero-knowledge primitives to minimize exposure while preserving a coherent user-facing system.",
      "The design language reflects that intent: secure, sparse, and mechanical. It is meant to read like infrastructure with conviction.",
    ],
    highlights: [
      "Privacy-oriented protocol design",
      "Zero-knowledge circuit and contract workflow",
      "Focused on operational clarity across the stack",
    ],
    techStack: ["Solidity", "zkSNARKs", "Circom", "Foundry"],
    links: [
      { label: "Open dossier", href: "/projects/zknull" },
      { label: "Live demo", href: "https://zknull.xyz" },
      { label: "GitHub", href: "https://github.com/kygura/zknull" },
    ],
    palette: "zknull",
    layout: "standard",
    status: "Protocol R&D",
    year: "2026",
  },
  {
    slug: "equilibria",
    title: "Equilibria",
    subtitle: "Algorithmic Flatcoin",
    summary:
      "An algorithmic flatcoin system with built-in tranching and supply-sensitive stability mechanics.",
    description:
      "Equilibria is a monetary systems project centered on balance, incentives, and structural resilience. It treats stability as a designed mechanism instead of a branding claim.",
    overview: [
      "The system pairs market-aware behavior with tranche design so exposure can be shaped rather than flattened into a single risk profile.",
      "Its presentation emphasizes symmetry, measured movement, and engineered equilibrium without losing the sharpness of the site’s existing visual language.",
    ],
    highlights: [
      "Flatcoin design informed by supply dynamics",
      "Built-in tranching model for differentiated exposure",
      "Protocol and interface thinking developed together",
    ],
    techStack: ["Solidity", "Next.js", "Hardhat"],
    links: [
      { label: "Open dossier", href: "/projects/equilibria" },
      { label: "Live demo", href: "https://equilibria.cash" },
      { label: "GitHub", href: "https://github.com/kygura/equilibria-protocol" },
    ],
    palette: "equilibria",
    layout: "standard",
    status: "In development",
    year: "2026",
  },
  {
    slug: "lexis-editorial-companion",
    title: "Lexis Editorial Companion",
    subtitle: "Editorial Intelligence",
    summary:
      "An editorial companion for shaping, refining, and structuring long-form written work with a sharper literary sensibility.",
    description:
      "Lexis Editorial Companion is imagined as a writing partner for the serious drafting process: less autocomplete, more editorial pressure. It is aimed at helping language land with precision, rhythm, and coherence.",
    overview: [
      "The project is framed as an editorial system rather than a generic assistant. It is meant to support rewrites, tonal calibration, structural decisions, and sharper sentence-level judgment.",
      "Its personality should feel companionable but exacting: something closer to a discerning editor in the room than a soft productivity layer wrapped around text.",
    ],
    highlights: [
      "Editorial feedback focused on voice, structure, and cadence",
      'Designed for revision quality over speed-first generation',
      "Built to support serious long-form drafting workflows",
    ],
    techStack: ["React", "TypeScript", "LLM Orchestration", "Editorial UX"],
    links: [
      { label: "Open dossier", href: "/projects/lexis-editorial-companion" },
      { label: "Live demo", href: "https://lexis-main.vercel.app/" },
    ],
    palette: "lexis",
    layout: "wide",
    status: "Concept study",
    year: "2026",
  },
  {
    slug: "hyperagent",
    title: "Hyperagent",
    subtitle: "Autonomous Systems",
    summary:
      "An autonomous agent framework for composing, orchestrating, and deploying intelligent system workflows at scale.",
    description:
      "Hyperagent is a systems project building toward fully autonomous multi-agent orchestration. It treats agents as composable primitives rather than monolithic endpoints.",
    overview: [
      "The architecture models agent behavior as a directed graph of capabilities, enabling dynamic reconfiguration and real-time adaptation.",
      "Its visual language draws on hexagonal network topology — nodes of agency connected by pathways of intent.",
    ],
    highlights: [
      "Multi-agent orchestration framework",
      "Dynamic capability graph composition",
      "Designed for real-time system adaptation",
    ],
    techStack: ["TypeScript", "LangGraph", "WebSockets"],
    links: [
      { label: "Open dossier", href: "/projects/hyperagent" },
    ],
    palette: "hyperagent",
    layout: "standard",
    status: "Research",
    year: "2026",
  },
  {
    slug: "airmy",
    title: "Airmy",
    subtitle: "Defense Intelligence",
    summary:
      "A defense intelligence platform for aggregating, filtering, and acting on multi-source threat signals in real time.",
    description:
      "Airmy processes heterogeneous intelligence streams into actionable situational awareness. The interface is designed for clarity under pressure.",
    overview: [
      "The system ingests and correlates signals across domains, surfacing patterns that demand attention without overwhelming the operator.",
      "Its visual identity uses concentric radar-like sweeps to convey persistent scanning and decisive detection.",
    ],
    highlights: [
      "Multi-source signal aggregation",
      "Real-time threat pattern detection",
      "Operator-first interface design",
    ],
    techStack: ["React", "Python", "Kafka"],
    links: [
      { label: "Open dossier", href: "/projects/airmy" },
    ],
    palette: "airmy",
    layout: "standard",
    status: "Prototype",
    year: "2026",
  },
  {
    slug: "colony",
    title: "Colony",
    subtitle: "Collective Infrastructure",
    summary:
      "A decentralized infrastructure coordination layer for collective resource allocation and governance.",
    description:
      "Colony explores how decentralized collectives can coordinate shared infrastructure without central authority. It treats governance as an engineering problem.",
    overview: [
      "The protocol models collective action as a mesh of interconnected nodes, each contributing and consuming resources based on locally optimal decisions.",
      "Its visual motif — a grid of connected dots — represents the distributed lattice of participants in a self-organizing system.",
    ],
    highlights: [
      "Decentralized resource coordination",
      "Local-first governance primitives",
      "Mesh-based consensus model",
    ],
    techStack: ["Solidity", "Rust", "libp2p"],
    links: [
      { label: "Open dossier", href: "/projects/colony" },
    ],
    palette: "colony",
    layout: "standard",
    status: "Research",
    year: "2026",
  },
  {
    slug: "gaia",
    title: "Gaia",
    subtitle: "Earth Systems",
    summary:
      "An earth systems observatory for modeling, visualizing, and predicting planetary-scale environmental dynamics.",
    description:
      "Gaia synthesizes environmental data streams into a coherent planetary model. The interface treats the earth as a living system rather than a collection of datasets.",
    overview: [
      "The platform integrates atmospheric, oceanic, and terrestrial data into unified simulation views, enabling both retrospective analysis and forward projection.",
      "Its identity uses latitude and longitude arcs across a sphere — the fundamental coordinate system of planetary observation.",
    ],
    highlights: [
      "Planetary-scale data integration",
      "Unified environmental simulation",
      "Predictive earth systems modeling",
    ],
    techStack: ["Python", "WebGL", "TensorFlow"],
    links: [
      { label: "Open dossier", href: "/projects/gaia" },
    ],
    palette: "gaia",
    layout: "standard",
    status: "Concept",
    year: "2026",
  },
];

export const getProjectBySlug = (slug?: string) =>
  projects.find((project) => project.slug === slug);
