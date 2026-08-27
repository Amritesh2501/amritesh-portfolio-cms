/**
 * Seed. Idempotent: safe to re-run, it upserts by natural key.
 *
 * Everything here is editable in /admin afterwards. Nothing in this file is
 * referenced by the application at runtime.
 *
 * Appendix C items (unconfirmed facts) are seeded as DRAFT and are therefore
 * invisible on the public site until Amritesh confirms them and flips the
 * publish state in admin. Those rows are marked  // APPENDIX C  below.
 */

import { PrismaClient, type ContentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PUBLISHED: ContentStatus = "PUBLISHED";
const DRAFT: ContentStatus = "DRAFT";

const now = new Date();
const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-now";
  const name = process.env.SEED_ADMIN_NAME ?? "Amritesh Tiwari";

  if (process.env.NODE_ENV === "production" && password === "change-me-now") {
    throw new Error(
      "Refusing to seed a production admin with the default password. Set SEED_ADMIN_PASSWORD.",
    );
  }
  if (password.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name, passwordHash, role: "ADMIN" },
    update: { name, passwordHash },
  });

  console.log(`  admin        ${user.email}`);
  return user;
}

async function seedProfile() {
  const existing = await prisma.profile.findFirst();
  const data = {
    name: "Amritesh Tiwari",
    headline: "Full Stack Developer / Cloud & AI Engineer",
    shortHeadline: "Full Stack / Cloud & AI",
    heroTagline: "I build systems that run in production, not demos that run once.",
    heroDescription:
      "Full stack engineer working across React, TypeScript, Node and AWS. Currently shipping a fleet platform that real logistics crews depend on daily.",
    bio: `I write software that has to survive contact with real users. Most of what I have built is running right now: a fleet management platform coordinating drivers and trips for a logistics operation, an ordering system a gaming community actually orders food through, and a set of AI tools that do a job rather than demonstrate a model.

My work sits between three areas: production web applications with React and TypeScript, backend and cloud infrastructure on Node, Postgres, Docker and AWS, and applied AI where an LLM is a component in a system rather than the whole product.`,
    longBio: `I started building because I wanted the thing to exist, and that has not changed. The difference now is that I care about what happens on day 90: whether the schema still fits the business, whether the deploy is boring, whether the person on support can find the answer without calling me.

That bias shows up in what I reach for. Provider adapters instead of hardcoded integrations, so swapping a GPS vendor is a config change. Role-based access at the API layer rather than hidden buttons in the UI. Postgres constraints doing the work an application-level check would do worse.

I work across the whole path from schema to interface, and I would rather own a small system end to end than a slice of a large one.`,
    philosophy: `**Boring where it counts, sharp where it shows.** Infrastructure should be predictable. Interfaces can be opinionated.

**The database is the contract.** If the schema is wrong, no amount of application code makes the product right. I design the relational model first.

**Adapters over integrations.** Anything that talks to a third party gets an interface. GPS, FASTag and fuel providers all plug into FleetZeno the same way, so replacing one is a config change instead of a rewrite.

**Ship, then measure.** A feature nobody uses is a feature that should not have been built. I would rather cut scope and learn than build for six weeks on an assumption.`,
    technicalInterests: `- Real-time systems: live tracking, geofencing, event streams that stay correct under load
- Applied LLM engineering: agentic workflows, evaluation frameworks, structured output over free text
- Cloud-native architecture: containerised services, serverless where it fits, infrastructure that a single engineer can reason about
- Creative coding on the web: interactive interfaces that reward attention without costing performance`,
    currentFocus: `Building product at Inspie Leap across the full SDLC, and continuing to extend FleetZeno for Delhi Orissa Bengal Roadways.

On the side: Praxium.ai, an adaptive learning platform where the assessment generation and knowledge-gap detection are the hard parts, not the chat interface.`,
    location: "India",
    // APPENDIX C item 4: placeholders. Set the real values in /admin > Profile.
    email: "hello@example.com",
    phone: "",
    resumeUrl: "",
    profileImage: null,
    availabilityStatus: "OPEN",
    availabilityText: "Open to full stack and cloud engineering roles",
    currentlyWorkingAt: "Inspie Leap Pvt. Ltd.",
    currentlyWorkingRole: "Product Development Intern",
    yearsOfExperience: 2,
    status: PUBLISHED,
    publishedAt: now,
  };

  const profile = existing
    ? await prisma.profile.update({ where: { id: existing.id }, data })
    : await prisma.profile.create({ data });

  console.log(`  profile      ${profile.name}`);
}

async function seedSocialLinks() {
  // APPENDIX C item 4: URLs are placeholders until confirmed, so these are
  // DRAFT and stay off the public site until edited in admin.
  const links = [
    {
      platform: "GitHub",
      label: "GitHub",
      url: "https://github.com/",
      icon: "github",
      displayOrder: 0,
      status: DRAFT,
    },
    {
      platform: "LinkedIn",
      label: "LinkedIn",
      url: "https://www.linkedin.com/",
      icon: "linkedin",
      displayOrder: 1,
      status: DRAFT,
    },
    {
      platform: "Email",
      label: "Email",
      url: "mailto:hello@example.com",
      icon: "maildotru",
      displayOrder: 2,
      status: DRAFT,
    },
  ];

  for (const link of links) {
    const existing = await prisma.socialLink.findFirst({
      where: { platform: link.platform },
    });
    if (existing) {
      await prisma.socialLink.update({ where: { id: existing.id }, data: link });
    } else {
      await prisma.socialLink.create({ data: link });
    }
  }
  console.log(`  social       ${links.length} links (draft: URLs need confirming)`);
}

async function seedProjectCategories() {
  const categories = [
    { name: "Production Platform", slug: "production-platform", displayOrder: 0 },
    { name: "Real-Time Systems", slug: "real-time-systems", displayOrder: 1 },
    { name: "AI & LLM", slug: "ai-llm", displayOrder: 2 },
    { name: "Agentic Workflows", slug: "agentic-workflows", displayOrder: 3 },
  ];

  const map = new Map<string, string>();
  for (const category of categories) {
    const row = await prisma.projectCategory.upsert({
      where: { slug: category.slug },
      create: { ...category, status: PUBLISHED, publishedAt: now },
      update: { name: category.name, displayOrder: category.displayOrder },
    });
    map.set(category.slug, row.id);
  }
  console.log(`  categories   ${categories.length} project categories`);
  return map;
}

type ProjectSeed = {
  slug: string;
  title: string;
  categorySlug: string;
  shortDescription: string;
  fullDescription: string;
  lifecycle: "LIVE" | "IN_DEVELOPMENT" | "ARCHIVED" | "PRIVATE" | "COMING_SOON";
  featured: boolean;
  year: number;
  role: string;
  duration: string;
  challenges?: string;
  solution?: string;
  results?: string;
  architecture?: string;
  lessonsLearned?: string;
  technologies: string[];
  metrics?: Array<{ value: string; label: string }>;
  displayOrder: number;
};

const PROJECTS: ProjectSeed[] = [
  {
    slug: "fleetzeno",
    title: "FleetZeno",
    categorySlug: "production-platform",
    shortDescription:
      "A fleet management platform built solo for a working logistics operation. Live GPS, role-based operations, compliance paperwork and driver payments in one system.",
    fullDescription: `FleetZeno is the operational backbone for a road logistics business. It replaced a mix of paper slips, spreadsheets and phone calls with one system that the owner, the managers and the drivers all use from different views of the same data.

The scope is deliberately wide because the job is wide. A trip does not end when the truck arrives: there is a loading slip, a compliance document, a fuel entry, a toll charge and a driver payment attached to it. Splitting those across tools is what the business was already doing badly.`,
    lifecycle: "LIVE",
    featured: true,
    year: 2025,
    role: "Solo engineer. Schema, API, frontend, infrastructure and deployment.",
    duration: "May 2025 - present",
    challenges: `A logistics operation does not pause for a rewrite. The system had to be introduced alongside the paper process it was replacing, which meant every feature had to be correct on the first try for the people already depending on it.

Three specific problems shaped the build:

- **Three roles, one dataset.** An owner sees margins, a manager sees dispatch, a driver sees their own trips. Filtering in the UI would have been a data leak waiting to happen.
- **Third-party telemetry is not stable.** GPS, FASTag and fuel data come from vendors whose APIs and contracts change.
- **Paperwork is the product.** Trip records and compliance documents are what the business is actually audited on.`,
    solution: `**Authorization at the API, not the interface.** Every endpoint enforces role scope server-side with JWT-carried claims. The frontend hides what the user cannot do, but hiding is a courtesy, not the control. Passwords are hashed with Argon2.

**Provider adapters for every external feed.** GPS, FASTag and fuel integrations each sit behind an interface. Adding or swapping a vendor is an adapter plus config, not a change to the trip logic that consumes it.

**Documents as first-class records.** Loading slips, trip records and compliance documents are stored as structured data, then rendered to PDF and Excel on demand. The export is a view of the record, not a separate copy that drifts.

**Live map as the operational surface.** Real-time GPS positions, route visualisation and geofencing render on a Leaflet map that managers keep open all day.`,
    results: `The platform is in daily production use at Delhi Orissa Bengal Roadways. Trip records, loading slips and driver payment tracking now run through it end to end instead of across paper and spreadsheets.`,
    architecture: `**Frontend** React and TypeScript with Tailwind, Leaflet for mapping.

**API** Node and Express exposing a REST API. JWT authentication carrying role claims, Argon2 password hashing, role checks enforced per route.

**Data** PostgreSQL on RDS. The relational model is the source of truth for trips, documents and payments.

**Runtime** Docker containers behind Nginx on AWS.

**Integrations** A provider-adapter layer for GPS, FASTag and fuel, so vendor changes stay isolated from business logic.`,
    lessonsLearned: `Modelling the paperwork before the interface was the decision that saved the project. The first sketch had trips and documents as separate concerns, and every feature after that fought the split.

The other lesson is about single-operator systems: because I owned schema through deployment, I could fix a data problem at the layer where it belonged instead of working around it. That is a real advantage of small systems and it disappears fast as teams grow.`,
    technologies: [
      "React", "TypeScript", "Node.js", "Express", "PostgreSQL",
      "Docker", "AWS", "Nginx", "Tailwind", "Leaflet.js", "REST APIs", "JWT",
    ],
    displayOrder: 0,
  },
  {
    slug: "shawty-on-duty",
    title: "Shawty on Duty",
    categorySlug: "real-time-systems",
    shortDescription:
      "A real-time ordering platform for a FiveM roleplay server. Players order in-game, the kitchen sees it instantly, and the in-game restaurant runs on it.",
    fullDescription: `Shawty on Duty is an ordering system for an in-game restaurant on a FiveM roleplay server. Players place orders, staff running the restaurant see them arrive live, and the whole loop happens without leaving the roleplay.

It is a small product with a real user base and real revenue attached, which makes it a better test of engineering judgement than most side projects. Latency is visible: if an order takes three seconds to appear, someone is standing at a counter waiting.`,
    lifecycle: "LIVE",
    featured: true,
    year: 2024,
    role: "Solo engineer. Product, frontend and realtime data layer.",
    duration: "2024",
    challenges: `The constraint was immediacy. An order placed by a player has to reach the person running the restaurant before the roleplay moves on. Polling would have been simpler to write and wrong to use.

The second constraint was that the audience is a community, not a customer base. They notice everything, they say so immediately, and they leave if it is annoying.`,
    solution: `Firebase carries the live order state, so a new order appears on the staff view without a refresh and without a polling loop. React and TypeScript on the front, with the order lifecycle modelled explicitly so an order cannot silently get stuck between states.

The interface is built for one hand and a glance, because that is how it gets used.`,
    results: `The launch put 100+ orders through the system in the first 30 minutes. It has since handled 500+ in-game orders across 100+ customers, and the in-game restaurant saw roughly a 35% increase in revenue.`,
    architecture: `React and TypeScript client. Firebase for realtime data and persistence, with the order state machine enforced in the data layer so both the customer and staff views read the same truth.`,
    lessonsLearned: `Shipping into an active community is the fastest feedback loop I have worked in. Every rough edge got reported within minutes, which sounds unpleasant and was actually the most useful thing about the project.

Also: modelling the order lifecycle as explicit states, rather than a set of booleans, made every later feature cheaper.`,
    technologies: ["React", "TypeScript", "Firebase", "Realtime Database"],
    metrics: [
      { value: "100+", label: "Orders in first 30 minutes" },
      { value: "500+", label: "In-game orders served" },
      { value: "100+", label: "Customers" },
      { value: "~35%", label: "Increase in in-game revenue" },
    ],
    displayOrder: 1,
  },
  {
    slug: "try-on-the-go",
    title: "Try on the Go",
    categorySlug: "ai-llm",
    shortDescription:
      "An AI virtual fitting room. Preview how clothing looks without changing garments in store.",
    fullDescription: `Try on the Go answers a narrow question well: what does this garment look like on me, without the changing room queue.

It is an experimental product rather than a demo. The interesting engineering is in the pipeline between the user's image, the garment, and a result that is fast enough to feel like trying something on rather than submitting a job.`,
    lifecycle: "LIVE",
    featured: false,
    year: 2025,
    role: "Solo engineer. Product and AI pipeline.",
    duration: "2025",
    challenges: `Generative image work is slow by default and users treat any wait over a couple of seconds as a failure. The other problem is consistency: the same person and the same garment should not produce a different result each attempt.`,
    solution: `Google Gemini 2.5 Flash was chosen specifically for latency at acceptable quality, with computer vision handling the preprocessing so the model receives a well-framed input rather than a raw photograph. React 19 and TypeScript on the front with Tailwind.`,
    architecture: `React 19 and TypeScript client with Tailwind. Computer vision preprocessing feeds Google Gemini 2.5 Flash, and results are returned to the client for immediate preview.`,
    lessonsLearned: `Model choice is a product decision, not a benchmark decision. The faster model with slightly lower fidelity produced a better product than the slower, sharper one, because the interaction only works if it feels instant.`,
    technologies: [
      "React 19", "TypeScript", "Tailwind", "Google Gemini 2.5 Flash", "Computer Vision",
    ],
    displayOrder: 2,
  },
  {
    slug: "praxium-ai",
    title: "Praxium.ai",
    categorySlug: "ai-llm",
    shortDescription:
      "An adaptive learning platform where assessments are generated, knowledge gaps are detected, and the study path adjusts to what you actually got wrong.",
    fullDescription: `Praxium.ai is a personalised learning platform in active development. The premise is that the useful part of AI in education is not the chat window: it is generating assessments that find what a learner does not know, and then adjusting what comes next.

The hard problems are assessment quality and gap detection. The interface is the easy part.`,
    lifecycle: "IN_DEVELOPMENT",
    featured: false,
    year: 2026,
    role: "Solo engineer. Architecture, LLM workflows and frontend.",
    duration: "In development",
    challenges: `An AI-generated question that is ambiguous or wrong does more damage than no question at all, because the learner is told they were wrong when they were not. Generation quality has to be verified, not assumed.

Knowledge-gap detection then has to distinguish between a concept the learner has not met and one they half-know, since those need different responses.`,
    solution: `LLM workflows are structured rather than conversational: generation, validation and grading are separate steps with defined outputs, so a bad generation is caught before it reaches a learner. Resources are selected against the detected gap rather than the topic as a whole.`,
    architecture: `React and TypeScript with Tailwind on the client. A REST API fronts the LLM integration and the adaptive logic, running against cloud services.`,
    technologies: [
      "React", "TypeScript", "Tailwind", "LLM Integration", "REST APIs", "Cloud Services",
    ],
    displayOrder: 3,
  },
  {
    slug: "trip-trails",
    title: "Trip Trails",
    categorySlug: "ai-llm",
    shortDescription:
      "AI travel planning that produces a day-by-day itinerary shaped by budget, travel style and dietary needs, mapped and routed.",
    fullDescription: `Trip Trails turns a vague trip idea into a plan you could actually follow. It generates a day-wise itinerary, respects a budget, adapts to travel style and dietary preferences, plots everything on a map and works out sensible routes between stops.

The packing list is generated from the itinerary rather than from a template, so a trip with three hiking days produces a different list than one with three museum days.`,
    lifecycle: "LIVE",
    featured: false,
    year: 2025,
    role: "Solo engineer. Product, AI planning pipeline and mapping.",
    duration: "2025",
    challenges: `A generated itinerary is easy to make and hard to make usable. The failure mode is a plausible-looking day that has you crossing a city four times, or a budget-aware plan that quietly ignores the budget.`,
    solution: `Constraints are applied as inputs to generation rather than filters afterwards: budget, travel style and dietary preferences shape the itinerary as it is produced. Locations are then plotted with Leaflet and routed, which surfaces the geographically incoherent days that reading the text alone would hide.`,
    architecture: `React and TypeScript with Tailwind. Google Gemini for itinerary generation behind a REST API, Leaflet.js for interactive maps and route planning.`,
    lessonsLearned: `Putting the generated plan on a map was the cheapest quality check in the project. Bad itineraries are hard to spot in prose and obvious as a line on a map.`,
    technologies: [
      "React", "TypeScript", "Tailwind", "Google Gemini", "Leaflet.js", "REST APIs",
    ],
    displayOrder: 4,
  },
  {
    slug: "autonomous-job-application-agent",
    title: "Autonomous Job-Application Agent",
    categorySlug: "agentic-workflows",
    shortDescription:
      "An agent that finds live job listings, tailors a resume to each one's ATS criteria and writes a cover letter for that specific listing.",
    fullDescription: `The job application process is three repetitive tasks wearing a trench coat: find listings, adjust the resume to the listing, write a cover letter that proves you read it. This agent does all three.

It is an agentic workflow rather than a prompt: the steps have defined inputs and outputs, and each one can fail and be retried without redoing the rest.`,
    lifecycle: "LIVE",
    featured: false,
    year: 2025,
    role: "Solo engineer. Agent design and prompt engineering.",
    duration: "2025",
    challenges: `Generic AI cover letters are worse than none. The output has to reference the actual listing, and the resume tailoring has to satisfy ATS keyword matching without turning into keyword soup that a human then rejects.`,
    solution: `Listings are scraped live with Apify, then each one drives a separate tailoring pass. Prompts are structured per step with the listing text as grounding, so the output cannot drift into generic language. Python orchestrates the workflow.`,
    architecture: `Python orchestration over an Apify scraping layer, with LLM calls at each stage of the workflow: listing extraction, resume tailoring against ATS criteria, and per-listing cover letter generation.`,
    technologies: ["Python", "LLMs", "Apify", "Prompt Engineering", "AI Agents"],
    displayOrder: 5,
  },
];

async function seedProjects(categoryIds: Map<string, string>) {
  for (const p of PROJECTS) {
    const data = {
      title: p.title,
      slug: p.slug,
      shortDescription: p.shortDescription,
      fullDescription: p.fullDescription,
      lifecycle: p.lifecycle,
      featured: p.featured,
      year: p.year,
      role: p.role,
      duration: p.duration,
      challenges: p.challenges ?? null,
      solution: p.solution ?? null,
      results: p.results ?? null,
      architecture: p.architecture ?? null,
      lessonsLearned: p.lessonsLearned ?? null,
      displayOrder: p.displayOrder,
      categoryId: categoryIds.get(p.categorySlug) ?? null,
      status: PUBLISHED,
      publishedAt: now,
    };

    const project = await prisma.project.upsert({
      where: { slug: p.slug },
      create: data,
      update: data,
    });

    await prisma.projectTechnology.deleteMany({ where: { projectId: project.id } });
    await prisma.projectTechnology.createMany({
      data: p.technologies.map((name, i) => ({
        name,
        displayOrder: i,
        projectId: project.id,
      })),
    });

    await prisma.projectMetric.deleteMany({ where: { projectId: project.id } });
    if (p.metrics?.length) {
      await prisma.projectMetric.createMany({
        data: p.metrics.map((m, i) => ({ ...m, displayOrder: i, projectId: project.id })),
      });
    }
  }
  console.log(`  projects     ${PROJECTS.length} projects`);
}

async function seedExperience() {
  const roles = [
    {
      company: "Inspie Leap Pvt. Ltd.",
      role: "Product Development Intern",
      // APPENDIX C item 1: location listed as Hyderabad in one source, not
      // confirmed. Left blank and the whole entry is DRAFT until confirmed.
      location: "",
      employmentType: "Internship",
      startDate: d("2026-04-01"),
      endDate: null,
      currentlyWorking: true,
      description: `Product development across the full SDLC: requirements, prototyping, implementation, testing and deployment. Working in Agile alongside product managers and UX, contributing to code reviews, sprint planning and architectural reviews.`,
      achievements: [
        "Contribute across requirements, prototyping, implementation, testing and deployment",
        "Participate in code reviews, sprint planning and architectural reviews",
        "Collaborate directly with product managers and UX",
      ],
      technologies: ["Agile", "Code Review", "Prototyping"],
      displayOrder: 0,
      // APPENDIX C item 1 unresolved, so this stays off the public site.
      status: DRAFT,
    },
    {
      company: "Delhi Orissa Bengal Roadways (DOBR)",
      role: "Software Developer Intern",
      location: "",
      employmentType: "Internship",
      startDate: d("2025-05-01"),
      endDate: null,
      currentlyWorking: true,
      description: `Built FleetZeno, a fleet management platform now used in a real logistics operation. Owned the system end to end: relational schema, REST API, React frontend, and the AWS and Docker deployment it runs on.`,
      achievements: [
        "Designed and built FleetZeno end to end as the sole engineer",
        "Shipped real-time GPS tracking, geofencing and live fleet maps",
        "Implemented role-based access for Owner, Manager and Driver at the API layer",
        "Digitised loading slips, trip records and compliance documents with PDF and Excel export",
        // APPENDIX C item 2: the "100+ employees" claim is deliberately NOT
        // seeded. Add it in admin once a source confirms it.
      ],
      technologies: [
        "React", "TypeScript", "Node.js", "Express", "PostgreSQL", "Docker", "AWS", "Leaflet.js",
      ],
      displayOrder: 1,
      status: PUBLISHED,
    },
    {
      company: "Outlier",
      role: "AI Training Specialist",
      location: "Remote",
      employmentType: "Freelance",
      startDate: d("2024-10-01"),
      endDate: d("2025-02-28"),
      currentlyWorking: false,
      description: `Evaluated large language model outputs against accuracy, consistency, policy and prompt-adherence criteria, and contributed to the evaluation frameworks used to score them. Fed structured feedback back into model training.`,
      achievements: [
        "Evaluated LLM outputs for accuracy, consistency, policy adherence and prompt adherence",
        "Contributed to evaluation frameworks and scoring criteria",
        "Delivered structured model feedback at a sustained weekly volume",
      ],
      technologies: ["LLM Evaluation", "Prompt Engineering"],
      displayOrder: 2,
      status: PUBLISHED,
    },
    {
      company: "Gokboru Tech",
      role: "Application Developer Intern",
      location: "Remote",
      employmentType: "Internship",
      startDate: d("2024-06-01"),
      endDate: d("2024-07-31"),
      currentlyWorking: false,
      description: `Built serverless REST APIs on AWS using Lambda, API Gateway and S3. Worked on API optimisation, CORS configuration, IAM policy and real-time content delivery.`,
      achievements: [
        "Built serverless REST APIs with AWS Lambda, API Gateway and S3",
        "Optimised API performance and configured CORS and IAM policy",
        "Implemented real-time content delivery paths",
      ],
      technologies: [
        "AWS Lambda", "API Gateway", "S3", "IAM", "REST APIs", "Serverless",
      ],
      displayOrder: 3,
      status: PUBLISHED,
    },
  ];

  for (const r of roles) {
    const { technologies, ...rest } = r;
    const existing = await prisma.experience.findFirst({
      where: { company: r.company, role: r.role },
    });

    const record = existing
      ? await prisma.experience.update({
          where: { id: existing.id },
          data: { ...rest, publishedAt: rest.status === PUBLISHED ? now : null },
        })
      : await prisma.experience.create({
          data: { ...rest, publishedAt: rest.status === PUBLISHED ? now : null },
        });

    await prisma.experienceTechnology.deleteMany({
      where: { experienceId: record.id },
    });
    await prisma.experienceTechnology.createMany({
      data: technologies.map((name, i) => ({
        name,
        displayOrder: i,
        experienceId: record.id,
      })),
    });
  }
  console.log(`  experience   ${roles.length} roles (1 draft: location unconfirmed)`);
}

async function seedEducation() {
  const entry = {
    institution: "Lovely Professional University",
    degree: "B.Tech",
    field: "Computer Science & Engineering",
    location: "Punjab, India",
    startDate: d("2022-08-01"),
    endDate: d("2026-07-31"),
    description: null,
    displayOrder: 0,
    status: PUBLISHED,
    publishedAt: now,
  };

  const existing = await prisma.education.findFirst({
    where: { institution: entry.institution, degree: entry.degree },
  });
  if (existing) {
    await prisma.education.update({ where: { id: existing.id }, data: entry });
  } else {
    await prisma.education.create({ data: entry });
  }
  console.log("  education    1 entry");
}

const SKILL_CATEGORIES: Array<{
  name: string;
  slug: string;
  skills: Array<[string, string | null, number]>;
}> = [
  {
    name: "Frontend",
    slug: "frontend",
    skills: [
      ["React", "react", 92],
      ["TypeScript", "typescript", 90],
      ["JavaScript", "javascript", 90],
      ["Tailwind", "tailwindcss", 88],
    ],
  },
  {
    name: "Backend & APIs",
    slug: "backend-apis",
    skills: [
      ["Node.js", "nodedotjs", 88],
      ["Express", "express", 86],
      ["REST APIs", null, 90],
      ["OpenAPI", "openapiinitiative", 72],
      ["WebSockets", "socketdotio", 74],
    ],
  },
  {
    name: "Cloud & DevOps",
    slug: "cloud-devops",
    skills: [
      ["AWS", "amazonwebservices", 84],
      ["Azure", "microsoftazure", 76],
      ["Docker", "docker", 84],
      ["CI/CD", "githubactions", 78],
      ["Linux", "linux", 80],
    ],
  },
  {
    name: "Databases",
    slug: "databases",
    skills: [
      ["PostgreSQL", "postgresql", 86],
      ["MongoDB", "mongodb", 74],
      ["Firebase", "firebase", 80],
    ],
  },
  {
    name: "AI & Machine Learning",
    slug: "ai-machine-learning",
    skills: [
      ["LLM Integration", null, 86],
      ["Prompt Engineering", null, 86],
      ["AI Agents", null, 80],
      ["LLM Evaluation", null, 84],
      ["Google Gemini", "googlegemini", 82],
    ],
  },
  {
    name: "Programming Languages",
    slug: "programming-languages",
    skills: [
      ["TypeScript", "typescript", 90],
      ["Python", "python", 82],
      ["C++", "cplusplus", 72],
    ],
  },
  {
    name: "Developer Tools",
    slug: "developer-tools",
    skills: [["Git", "git", 88]],
  },
  {
    name: "Libraries",
    slug: "libraries",
    skills: [
      ["Three.js", "threedotjs", 68],
      ["Leaflet.js", "leaflet", 80],
    ],
  },
  {
    name: "CS Fundamentals",
    slug: "cs-fundamentals",
    skills: [
      ["Data Structures", null, 82],
      ["Algorithms", null, 80],
      ["System Design", null, 76],
    ],
  },
];

async function seedSkills() {
  let count = 0;
  for (const [index, category] of SKILL_CATEGORIES.entries()) {
    const cat = await prisma.skillCategory.upsert({
      where: { slug: category.slug },
      create: {
        name: category.name,
        slug: category.slug,
        displayOrder: index,
        status: PUBLISHED,
        publishedAt: now,
      },
      update: { name: category.name, displayOrder: index },
    });

    for (const [order, [name, icon, proficiency]] of category.skills.entries()) {
      const existing = await prisma.skill.findFirst({
        where: { name, categoryId: cat.id },
      });
      const data = {
        name,
        icon,
        proficiency,
        featured: proficiency >= 86,
        displayOrder: order,
        categoryId: cat.id,
        status: PUBLISHED,
        publishedAt: now,
      };
      if (existing) {
        await prisma.skill.update({ where: { id: existing.id }, data });
      } else {
        await prisma.skill.create({ data });
      }
      count += 1;
    }
  }
  console.log(`  skills       ${count} skills in ${SKILL_CATEGORIES.length} categories`);
}

async function seedCertifications() {
  const certs = [
    {
      name: "Azure Administrator Associate (AZ-104)",
      issuer: "Microsoft",
      featured: true,
      displayOrder: 0,
    },
    { name: "AWS Cloud Computing Training", issuer: "AWS", featured: true, displayOrder: 1 },
    {
      name: "Software Engineering Job Simulation",
      issuer: "JPMorgan Chase & Co. / Forage",
      featured: false,
      displayOrder: 2,
    },
    { name: "Cyber Security and Privacy", issuer: "NPTEL", featured: false, displayOrder: 3 },
    {
      name: "ChatGPT Advanced Data Analysis",
      issuer: "DeepLearning.AI",
      featured: false,
      displayOrder: 4,
    },
    {
      name: "Omniverse Extensions Training",
      issuer: "NVIDIA",
      featured: false,
      displayOrder: 5,
    },
  ];

  for (const c of certs) {
    const existing = await prisma.certification.findFirst({
      where: { name: c.name, issuer: c.issuer },
    });
    const data = { ...c, status: PUBLISHED, publishedAt: now };
    if (existing) {
      await prisma.certification.update({ where: { id: existing.id }, data });
    } else {
      await prisma.certification.create({ data });
    }
  }
  console.log(`  certs        ${certs.length} certifications`);
}

async function seedAchievements() {
  // Sourced metrics are PUBLISHED. Unsourced ones are DRAFT, per Appendix C.
  const items = [
    { value: "100+", label: "Orders in first 30 minutes", displayOrder: 0, status: PUBLISHED },
    { value: "~35%", label: "In-game restaurant revenue increase", displayOrder: 1, status: PUBLISHED },
    // APPENDIX C item 2: needs a confirmed source before publishing.
    { value: "100+", label: "Employees using FleetZeno", displayOrder: 2, status: DRAFT },
    { value: "40%", label: "API latency reduction", displayOrder: 3, status: DRAFT },
    { value: "70%", label: "Trip-planning time reduction", displayOrder: 4, status: DRAFT },
    { value: "100+", label: "LLM evaluations per week", displayOrder: 5, status: PUBLISHED },
  ];

  for (const item of items) {
    const existing = await prisma.achievement.findFirst({ where: { label: item.label } });
    const data = {
      ...item,
      publishedAt: item.status === PUBLISHED ? now : null,
    };
    if (existing) {
      await prisma.achievement.update({ where: { id: existing.id }, data });
    } else {
      await prisma.achievement.create({ data });
    }
  }
  console.log(`  achievements ${items.length} (3 draft: metrics need sources)`);
}

async function seedNavigation() {
  const items = [
    { label: "Work", href: "/#work", location: "HEADER" as const, displayOrder: 0 },
    { label: "About", href: "/#about", location: "BOTH" as const, displayOrder: 1 },
    { label: "Experience", href: "/#experience", location: "BOTH" as const, displayOrder: 2 },
    { label: "Stack", href: "/#stack", location: "BOTH" as const, displayOrder: 3 },
    { label: "Contact", href: "/#contact", location: "BOTH" as const, displayOrder: 4 },
    { label: "All projects", href: "/projects", location: "FOOTER" as const, displayOrder: 5 },
  ];

  for (const item of items) {
    const existing = await prisma.navigationItem.findFirst({
      where: { label: item.label, location: item.location },
    });
    if (existing) {
      await prisma.navigationItem.update({ where: { id: existing.id }, data: item });
    } else {
      await prisma.navigationItem.create({ data: item });
    }
  }
  console.log(`  navigation   ${items.length} items`);
}

async function seedSettings() {
  const settings: Array<{
    key: string;
    value: string;
    group: string;
    label: string;
    type: string;
    description?: string;
    options?: string;
    displayOrder: number;
  }> = [
    // --- site ---
    { key: "site.title", value: "Amritesh Tiwari", group: "site", label: "Site title", type: "text", displayOrder: 0 },
    { key: "site.tagline", value: "Full Stack Developer / Cloud & AI Engineer", group: "site", label: "Tagline", type: "text", displayOrder: 1 },
    { key: "site.logoText", value: "AT", group: "site", label: "Logo text", type: "text", description: "Two or three characters. Shown in the header mark.", displayOrder: 2 },
    { key: "site.logoImage", value: "", group: "site", label: "Logo image", type: "media", description: "Overrides the logo text when set.", displayOrder: 3 },
    { key: "site.footerText", value: "Built and maintained by Amritesh Tiwari. Every word on this site is editable from the CMS.", group: "site", label: "Footer text", type: "textarea", displayOrder: 4 },
    { key: "site.copyright", value: "© 2026 Amritesh Tiwari", group: "site", label: "Copyright line", type: "text", displayOrder: 5 },
    { key: "site.contactEmail", value: "hello@example.com", group: "site", label: "Contact email", type: "text", description: "Shown in the contact section. Set your real address here.", displayOrder: 6 },
    { key: "site.contactHeading", value: "Let's work together", group: "site", label: "Contact heading", type: "text", displayOrder: 7 },
    { key: "site.contactBlurb", value: "Roles, contract work, or a system you need built properly. Tell me what you are trying to ship.", group: "site", label: "Contact blurb", type: "textarea", displayOrder: 8 },
    { key: "site.showIntro", value: "true", group: "site", label: "Boot sequence intro", type: "boolean", description: "The short terminal boot animation on first visit.", displayOrder: 9 },

    // --- theme ---
    { key: "theme.accent", value: "#ff2a2a", group: "theme", label: "Accent color", type: "color", description: "The single accent used across the whole site.", displayOrder: 0 },
    { key: "theme.background", value: "#060607", group: "theme", label: "Background", type: "color", displayOrder: 1 },
    { key: "theme.surface", value: "#0e0e11", group: "theme", label: "Surface", type: "color", displayOrder: 2 },
    { key: "theme.foreground", value: "#f5f5f7", group: "theme", label: "Foreground", type: "color", displayOrder: 3 },
    { key: "theme.muted", value: "#86868b", group: "theme", label: "Muted text", type: "color", displayOrder: 4 },
    { key: "theme.mode", value: "dark", group: "theme", label: "Color mode", type: "select", options: "dark|light", description: "The design is built dark-first. Light mode inverts the substrate.", displayOrder: 5 },
    { key: "theme.scanlines", value: "false", group: "theme", label: "CRT scanlines", type: "boolean", displayOrder: 6 },
    { key: "theme.grain", value: "true", group: "theme", label: "Film grain", type: "boolean", displayOrder: 7 },

    // --- seo ---
    { key: "seo.title", value: "Amritesh Tiwari / Full Stack Developer, Cloud & AI Engineer", group: "seo", label: "Page title", type: "text", displayOrder: 0 },
    { key: "seo.description", value: "Full stack engineer building production systems with React, TypeScript, Node and AWS. Fleet platforms, real-time ordering, applied LLM tooling.", group: "seo", label: "Meta description", type: "textarea", description: "Aim for 150-160 characters.", displayOrder: 1 },
    { key: "seo.keywords", value: "full stack developer, react, typescript, node.js, aws, cloud engineer, ai engineer, llm, postgresql, amritesh tiwari", group: "seo", label: "Keywords", type: "textarea", description: "Comma separated.", displayOrder: 2 },
    { key: "seo.ogImage", value: "", group: "seo", label: "OG image", type: "media", description: "1200x630. Used by social cards.", displayOrder: 3 },
    { key: "seo.favicon", value: "", group: "seo", label: "Favicon", type: "media", displayOrder: 4 },
    { key: "seo.twitterCard", value: "summary_large_image", group: "seo", label: "Twitter card", type: "select", options: "summary|summary_large_image", displayOrder: 5 },
    { key: "seo.twitterHandle", value: "", group: "seo", label: "Twitter handle", type: "text", description: "Including the @.", displayOrder: 6 },
    { key: "seo.canonicalUrl", value: "", group: "seo", label: "Canonical URL", type: "text", description: "Leave blank to use NEXT_PUBLIC_SITE_URL.", displayOrder: 7 },
    { key: "seo.robots", value: "index,follow", group: "seo", label: "Robots", type: "select", options: "index,follow|noindex,nofollow", displayOrder: 8 },
  ];

  for (const s of settings) {
    const { key, ...rest } = s;
    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, ...rest },
      // Only structure is updated on re-seed. Values the operator edited in
      // admin are left alone.
      update: {
        group: rest.group,
        label: rest.label,
        type: rest.type,
        description: rest.description ?? null,
        options: rest.options ?? null,
        displayOrder: rest.displayOrder,
      },
    });
  }
  console.log(`  settings     ${settings.length} settings`);
}

async function main() {
  console.log("\nSeeding portfolio CMS\n");
  await seedAdmin();
  await seedProfile();
  await seedSocialLinks();
  const categories = await seedProjectCategories();
  await seedProjects(categories);
  await seedExperience();
  await seedEducation();
  await seedSkills();
  await seedCertifications();
  await seedAchievements();
  await seedNavigation();
  await seedSettings();
  console.log("\nDone. Sign in at /admin/login\n");
}

main()
  .catch((e) => {
    console.error("\nSeed failed:\n", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
