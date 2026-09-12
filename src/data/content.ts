export type Category = {
  name: string;
  icon: string;
  courses: number;
  description: string;
};

export const categories: Category[] = [
  {
    name: "Programming",
    icon: "Code2",
    courses: 2140,
    description: "Languages, algorithms, clean architecture.",
  },
  {
    name: "Artificial Intelligence",
    icon: "BrainCircuit",
    courses: 980,
    description: "LLMs, ML pipelines, applied research.",
  },
  {
    name: "Cyber Security",
    icon: "ShieldCheck",
    courses: 640,
    description: "Threat modelling, pentesting, defence.",
  },
  {
    name: "Graphic Design",
    icon: "Palette",
    courses: 1120,
    description: "Brand systems, layout, visual craft.",
  },
  {
    name: "UI UX",
    icon: "Figma",
    courses: 1340,
    description: "Product thinking, prototypes, research.",
  },
  {
    name: "Digital Marketing",
    icon: "Megaphone",
    courses: 870,
    description: "Growth loops, SEO, paid acquisition.",
  },
  {
    name: "Language Learning",
    icon: "Languages",
    courses: 1560,
    description: "Conversation-first fluency practice.",
  },
  {
    name: "Business",
    icon: "Briefcase",
    courses: 1010,
    description: "Strategy, finance, operations.",
  },
  {
    name: "Photography",
    icon: "Camera",
    courses: 520,
    description: "Light, composition, post-processing.",
  },
  { name: "Music", icon: "Music4", courses: 480, description: "Theory, production, performance." },
  {
    name: "Mathematics",
    icon: "Sigma",
    courses: 760,
    description: "From foundations to advanced proofs.",
  },
  {
    name: "Public Speaking",
    icon: "Mic",
    courses: 390,
    description: "Storytelling, stage craft, presence.",
  },
  {
    name: "Mobile Development",
    icon: "Smartphone",
    courses: 930,
    description: "iOS, Android, cross-platform.",
  },
  {
    name: "Web Development",
    icon: "Globe2",
    courses: 2480,
    description: "Frontend, backend, full stack.",
  },
  {
    name: "Data Science",
    icon: "LineChart",
    courses: 1180,
    description: "Analytics, statistics, storytelling.",
  },
  {
    name: "DevOps",
    icon: "Workflow",
    courses: 610,
    description: "CI/CD, observability, reliability.",
  },
  {
    name: "Cloud Computing",
    icon: "CloudCog",
    courses: 720,
    description: "Architecture on AWS, GCP, Azure.",
  },
];

export const mentors = [
  {
    name: "Ayesha Rahman",
    role: "Principal Product Designer",
    initials: "AR",
    rating: 4.9,
    reviews: 412,
    experience: "9 yrs experience",
    skills: ["UI UX", "Design Systems", "Research"],
  },
  {
    name: "Tanvir Hasan",
    role: "Staff Engineer, Distributed Systems",
    initials: "TH",
    rating: 5.0,
    reviews: 328,
    experience: "12 yrs experience",
    skills: ["Go", "Kubernetes", "Cloud"],
  },
  {
    name: "Meherun Nesa",
    role: "AI Research Lead",
    initials: "MN",
    rating: 4.8,
    reviews: 274,
    experience: "7 yrs experience",
    skills: ["LLMs", "PyTorch", "MLOps"],
  },
  {
    name: "Rafi Chowdhury",
    role: "Growth Marketing Director",
    initials: "RC",
    rating: 4.9,
    reviews: 195,
    experience: "10 yrs experience",
    skills: ["SEO", "Analytics", "Brand"],
  },
];

export const courses = [
  {
    title: "Design Systems that Scale",
    instructor: "Nahian Rahman Chayon",
    level: "Intermediate",
    duration: "8h 40m",
    rating: 4.9,
    students: 12480,
    tint: "from-primary/85 to-primary-glow/70",
    tag: "UI UX",
  },
  {
    title: "Production LLM Applications",
    instructor: "Tanvir Samura",
    level: "Advanced",
    duration: "11h 15m",
    rating: 4.8,
    students: 8320,
    tint: "from-chart-5/80 to-primary/70",
    tag: "AI",
  },
  {
    title: "Cloud Architecture Foundations",
    instructor: "Yousuf Uddin",
    level: "Beginner",
    duration: "6h 05m",
    rating: 4.9,
    students: 15960,
    tint: "from-chart-2/80 to-chart-3/70",
    tag: "Cloud",
  },
  {
    title: "Growth Marketing Playbook",
    instructor: "Rafi Chowdhury",
    level: "Intermediate",
    duration: "5h 30m",
    rating: 4.7,
    students: 7410,
    tint: "from-warning/80 to-chart-1/70",
    tag: "Marketing",
  },
];

export const testimonials = [
  {
    name: "Mahbubur Rahman",
    role: "Frontend Engineer, Dhaka",
    initials: "NJ",
    rating: 5,
    quote:
      "I taught JavaScript basics and learned product design in exchange. Within four months I moved into a senior role — the exchange model genuinely works.",
  },
  {
    name: "Shakil Raihan",
    role: "Founder, Loop Studio",
    initials: "IK",
    rating: 5,
    quote:
      "The mentor quality is outstanding. Every session was structured, practical, and followed up with real feedback on my work.",
  },
  {
    name: "Sadia Anwar",
    role: "Data Analyst, Singapore",
    initials: "SA",
    rating: 5,
    quote:
      "Skill Binimoy is the only platform where my teaching reputation opened doors to paid opportunities. It feels like a professional network built on proof.",
  },
];
