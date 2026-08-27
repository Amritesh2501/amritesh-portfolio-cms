import { z } from "zod";

/**
 * The CMS registry.
 *
 * Every content type is one entry here. The admin list page, the admin edit
 * form, the Zod validation and the server actions are all generated from these
 * definitions, so adding Blog / Testimonials / Speaking later means:
 *   1. add the Prisma model (with `status` + `displayOrder`)
 *   2. add a ResourceDef below
 *   3. add one line to the admin sidebar group
 * No new pages, no new actions, no rewrites of existing modules.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "markdown"
  | "number"
  | "boolean"
  | "select"
  | "date"
  | "slug"
  | "media"
  | "relation"
  | "list"
  | "rows";

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: FieldOption[];
  /** for type="relation" - which model to offer, and which column to show */
  relation?: { resource: string; labelField: string };
  /** for type="rows" - a repeatable child table */
  rows?: { model: string; foreignKey: string; fields: FieldDef[] };
  /** for type="slug" - which sibling field to derive from */
  from?: string;
  min?: number;
  max?: number;
  step?: number;
  wide?: boolean;
  section?: string;
}

export interface ListColumn {
  field: string;
  label: string;
  type?: "text" | "badge" | "boolean" | "date" | "image" | "count" | "order";
  width?: string;
}

export interface ResourceDef {
  key: string;
  model: string;
  label: string;
  singular: string;
  description: string;
  group: "content" | "site";
  fields: FieldDef[];
  listColumns: ListColumn[];
  searchFields: string[];
  orderBy: Record<string, "asc" | "desc">[];
  hasStatus: boolean;
  hasOrder: boolean;
  singleton?: boolean;
  duplicable?: boolean;
  /** builds the public URL for the "preview" action */
  previewPath?: (row: Record<string, unknown>) => string | null;
  include?: Record<string, unknown>;
}

export const STATUS_OPTIONS: FieldOption[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

export const LIFECYCLE_OPTIONS: FieldOption[] = [
  { value: "LIVE", label: "Live" },
  { value: "IN_DEVELOPMENT", label: "In Development" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "PRIVATE", label: "Private" },
  { value: "COMING_SOON", label: "Coming Soon" },
];

const statusField: FieldDef = {
  name: "status",
  label: "Publish state",
  type: "select",
  options: STATUS_OPTIONS,
  required: true,
  help: "Only Published rows appear on the public site.",
  section: "Publishing",
};

const orderField: FieldDef = {
  name: "displayOrder",
  label: "Display order",
  type: "number",
  help: "Lower numbers appear first.",
  section: "Publishing",
};

// ---------------------------------------------------------------------------

export const RESOURCES: ResourceDef[] = [
  {
    key: "profile",
    model: "profile",
    label: "Profile",
    singular: "Profile",
    description: "Your name, positioning, bio and hero copy.",
    group: "content",
    singleton: true,
    hasStatus: true,
    hasOrder: false,
    searchFields: [],
    orderBy: [{ createdAt: "asc" }],
    listColumns: [],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, section: "Identity" },
      {
        name: "headline",
        label: "Headline",
        type: "text",
        required: true,
        placeholder: "Full Stack Developer / Cloud & AI Engineer",
        section: "Identity",
      },
      {
        name: "shortHeadline",
        label: "Short headline",
        type: "text",
        help: "Compact version used in the nav and OG cards.",
        section: "Identity",
      },
      { name: "location", label: "Location", type: "text", section: "Identity" },
      { name: "email", label: "Contact email", type: "text", section: "Identity" },
      { name: "phone", label: "Phone", type: "text", section: "Identity" },
      { name: "profileImage", label: "Profile image", type: "media", section: "Identity" },
      { name: "resumeUrl", label: "Resume URL", type: "text", section: "Identity" },
      {
        name: "heroTagline",
        label: "Hero tagline",
        type: "text",
        wide: true,
        help: "The one line under your name. Keep it to a single sentence.",
        section: "Hero",
      },
      {
        name: "heroDescription",
        label: "Hero description",
        type: "textarea",
        wide: true,
        help: "Max 20 words. It has to fit the first viewport.",
        section: "Hero",
      },
      {
        name: "availabilityStatus",
        label: "Availability",
        type: "select",
        options: [
          { value: "OPEN", label: "Open to work" },
          { value: "SELECTIVE", label: "Selective" },
          { value: "CLOSED", label: "Not available" },
        ],
        section: "Hero",
      },
      { name: "availabilityText", label: "Availability text", type: "text", section: "Hero" },
      {
        name: "currentlyWorkingAt",
        label: "Currently at",
        type: "text",
        section: "Hero",
      },
      {
        name: "currentlyWorkingRole",
        label: "Current role",
        type: "text",
        section: "Hero",
      },
      {
        name: "yearsOfExperience",
        label: "Years of experience",
        type: "number",
        min: 0,
        max: 60,
        section: "Hero",
      },
      {
        name: "bio",
        label: "Short bio",
        type: "markdown",
        required: true,
        wide: true,
        section: "About",
      },
      { name: "longBio", label: "Long bio", type: "markdown", wide: true, section: "About" },
      {
        name: "philosophy",
        label: "Engineering philosophy",
        type: "markdown",
        wide: true,
        section: "About",
      },
      {
        name: "technicalInterests",
        label: "Technical interests",
        type: "markdown",
        wide: true,
        section: "About",
      },
      {
        name: "currentFocus",
        label: "Current focus",
        type: "markdown",
        wide: true,
        section: "About",
      },
      statusField,
    ],
  },

  {
    key: "projects",
    model: "project",
    label: "Projects",
    singular: "Project",
    description: "Case studies and shipped work.",
    group: "content",
    hasStatus: true,
    hasOrder: true,
    duplicable: true,
    searchFields: ["title", "slug", "shortDescription", "role"],
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    include: {
      category: true,
      technologies: { orderBy: { displayOrder: "asc" } },
      metrics: { orderBy: { displayOrder: "asc" } },
      gallery: { orderBy: { displayOrder: "asc" } },
    },
    previewPath: (row) => (row.slug ? `/projects/${row.slug}` : null),
    listColumns: [
      { field: "thumbnail", label: "", type: "image", width: "56px" },
      { field: "title", label: "Title" },
      { field: "categoryId", label: "Category", type: "text" },
      { field: "lifecycle", label: "Lifecycle", type: "badge" },
      { field: "featured", label: "Featured", type: "boolean" },
      { field: "status", label: "State", type: "badge" },
      { field: "displayOrder", label: "Order", type: "order", width: "84px" },
      { field: "updatedAt", label: "Updated", type: "date" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, section: "Overview" },
      {
        name: "slug",
        label: "Slug",
        type: "slug",
        from: "title",
        required: true,
        help: "The public URL is /projects/<slug>. Changing it breaks existing links.",
        section: "Overview",
      },
      {
        name: "shortDescription",
        label: "Short description",
        type: "textarea",
        required: true,
        wide: true,
        help: "One or two lines. This is the card copy and the meta description.",
        section: "Overview",
      },
      {
        name: "categoryId",
        label: "Category",
        type: "relation",
        relation: { resource: "project-categories", labelField: "name" },
        help: "Drives the filter chips on the public projects grid.",
        section: "Overview",
      },
      {
        name: "lifecycle",
        label: "Lifecycle",
        type: "select",
        options: LIFECYCLE_OPTIONS,
        required: true,
        section: "Overview",
      },
      { name: "year", label: "Year", type: "number", min: 2000, max: 2100, section: "Overview" },
      { name: "featured", label: "Featured", type: "boolean", section: "Overview" },
      { name: "role", label: "Your role", type: "text", section: "Overview" },
      {
        name: "duration",
        label: "Duration",
        type: "text",
        placeholder: "May 2025 - present",
        section: "Overview",
      },
      { name: "thumbnail", label: "Card thumbnail", type: "media", section: "Media" },
      { name: "heroImage", label: "Hero image", type: "media", section: "Media" },
      {
        name: "gallery",
        label: "Gallery",
        type: "rows",
        wide: true,
        section: "Media",
        rows: {
          model: "projectImage",
          foreignKey: "projectId",
          fields: [
            { name: "url", label: "Image", type: "media", required: true },
            { name: "alt", label: "Alt text", type: "text" },
            { name: "caption", label: "Caption", type: "text" },
          ],
        },
      },
      { name: "liveUrl", label: "Live URL", type: "text", section: "Links" },
      { name: "githubUrl", label: "GitHub URL", type: "text", section: "Links" },
      { name: "caseStudyUrl", label: "External case study", type: "text", section: "Links" },
      {
        name: "technologies",
        label: "Technologies",
        type: "rows",
        wide: true,
        section: "Stack",
        rows: {
          model: "projectTechnology",
          foreignKey: "projectId",
          fields: [{ name: "name", label: "Technology", type: "text", required: true }],
        },
      },
      {
        name: "metrics",
        label: "Metrics",
        type: "rows",
        wide: true,
        section: "Stack",
        help: "Only add numbers you can defend.",
        rows: {
          model: "projectMetric",
          foreignKey: "projectId",
          fields: [
            { name: "value", label: "Value", type: "text", required: true },
            { name: "label", label: "Label", type: "text", required: true },
          ],
        },
      },
      {
        name: "fullDescription",
        label: "Full description",
        type: "markdown",
        wide: true,
        section: "Case study",
      },
      { name: "challenges", label: "Challenge", type: "markdown", wide: true, section: "Case study" },
      { name: "solution", label: "Solution", type: "markdown", wide: true, section: "Case study" },
      { name: "results", label: "Results", type: "markdown", wide: true, section: "Case study" },
      {
        name: "architecture",
        label: "Architecture",
        type: "markdown",
        wide: true,
        section: "Case study",
      },
      {
        name: "lessonsLearned",
        label: "Lessons learned",
        type: "markdown",
        wide: true,
        section: "Case study",
      },
      statusField,
      orderField,
    ],
  },

  {
    key: "project-categories",
    model: "projectCategory",
    label: "Project categories",
    singular: "Category",
    description: "The filter chips above the projects grid.",
    group: "content",
    hasStatus: true,
    hasOrder: true,
    searchFields: ["name", "slug"],
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { projects: true } } },
    listColumns: [
      { field: "name", label: "Name" },
      { field: "slug", label: "Slug" },
      { field: "_count.projects", label: "Projects", type: "count" },
      { field: "status", label: "State", type: "badge" },
      { field: "displayOrder", label: "Order", type: "order", width: "84px" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "slug", from: "name", required: true },
      { name: "description", label: "Description", type: "text", wide: true },
      statusField,
      orderField,
    ],
  },

  {
    key: "experience",
    model: "experience",
    label: "Experience",
    singular: "Role",
    description: "Where you have worked.",
    group: "content",
    hasStatus: true,
    hasOrder: true,
    searchFields: ["company", "role", "location"],
    orderBy: [{ displayOrder: "asc" }, { startDate: "desc" }],
    include: { technologies: { orderBy: { displayOrder: "asc" } } },
    listColumns: [
      { field: "company", label: "Company" },
      { field: "role", label: "Role" },
      { field: "location", label: "Location" },
      { field: "currentlyWorking", label: "Current", type: "boolean" },
      { field: "status", label: "State", type: "badge" },
      { field: "displayOrder", label: "Order", type: "order", width: "84px" },
    ],
    fields: [
      { name: "company", label: "Company", type: "text", required: true, section: "Role" },
      { name: "role", label: "Title", type: "text", required: true, section: "Role" },
      { name: "location", label: "Location", type: "text", section: "Role" },
      {
        name: "employmentType",
        label: "Employment type",
        type: "select",
        options: [
          { value: "Internship", label: "Internship" },
          { value: "Full-time", label: "Full-time" },
          { value: "Part-time", label: "Part-time" },
          { value: "Contract", label: "Contract" },
          { value: "Freelance", label: "Freelance" },
        ],
        section: "Role",
      },
      { name: "startDate", label: "Start date", type: "date", required: true, section: "Role" },
      { name: "endDate", label: "End date", type: "date", section: "Role" },
      { name: "currentlyWorking", label: "Currently working here", type: "boolean", section: "Role" },
      { name: "companyLogo", label: "Company logo", type: "media", section: "Role" },
      { name: "companyUrl", label: "Company URL", type: "text", section: "Role" },
      {
        name: "description",
        label: "Description",
        type: "markdown",
        wide: true,
        section: "Detail",
      },
      {
        name: "achievements",
        label: "Achievements",
        type: "list",
        wide: true,
        help: "One per line.",
        section: "Detail",
      },
      {
        name: "technologies",
        label: "Technologies",
        type: "rows",
        wide: true,
        section: "Detail",
        rows: {
          model: "experienceTechnology",
          foreignKey: "experienceId",
          fields: [{ name: "name", label: "Technology", type: "text", required: true }],
        },
      },
      statusField,
      orderField,
    ],
  },

  {
    key: "skill-categories",
    model: "skillCategory",
    label: "Skill categories",
    singular: "Skill category",
    description: "How skills are grouped on the public site.",
    group: "content",
    hasStatus: true,
    hasOrder: true,
    searchFields: ["name", "slug"],
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { skills: true } } },
    listColumns: [
      { field: "name", label: "Name" },
      { field: "slug", label: "Slug" },
      { field: "_count.skills", label: "Skills", type: "count" },
      { field: "status", label: "State", type: "badge" },
      { field: "displayOrder", label: "Order", type: "order", width: "84px" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "slug", from: "name", required: true },
      { name: "description", label: "Description", type: "text", wide: true },
      statusField,
      orderField,
    ],
  },

  {
    key: "skills",
    model: "skill",
    label: "Skills",
    singular: "Skill",
    description: "The technology list, grouped by category.",
    group: "content",
    hasStatus: true,
    hasOrder: true,
    searchFields: ["name"],
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: { category: true },
    listColumns: [
      { field: "name", label: "Name" },
      { field: "categoryId", label: "Category", type: "text" },
      { field: "proficiency", label: "Proficiency" },
      { field: "featured", label: "Featured", type: "boolean" },
      { field: "status", label: "State", type: "badge" },
      { field: "displayOrder", label: "Order", type: "order", width: "84px" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      {
        name: "categoryId",
        label: "Category",
        type: "relation",
        relation: { resource: "skill-categories", labelField: "name" },
        required: true,
      },
      {
        name: "proficiency",
        label: "Proficiency",
        type: "number",
        min: 0,
        max: 100,
        step: 5,
        help: "0-100. Shown as a bar on the public site when set.",
      },
      { name: "yearsExperience", label: "Years", type: "number", min: 0, max: 60, step: 0.5 },
      {
        name: "icon",
        label: "Simple Icons slug",
        type: "text",
        placeholder: "typescript",
        help: "Slug from simpleicons.org. Leave blank for no logo.",
      },
      { name: "featured", label: "Featured", type: "boolean" },
      statusField,
      orderField,
    ],
  },

  {
    key: "education",
    model: "education",
    label: "Education",
    singular: "Education entry",
    description: "Degrees and programmes.",
    group: "content",
    hasStatus: true,
    hasOrder: true,
    searchFields: ["institution", "degree", "field"],
    orderBy: [{ displayOrder: "asc" }, { startDate: "desc" }],
    listColumns: [
      { field: "institution", label: "Institution" },
      { field: "degree", label: "Degree" },
      { field: "field", label: "Field" },
      { field: "status", label: "State", type: "badge" },
      { field: "displayOrder", label: "Order", type: "order", width: "84px" },
    ],
    fields: [
      { name: "institution", label: "Institution", type: "text", required: true },
      { name: "degree", label: "Degree", type: "text", required: true },
      { name: "field", label: "Field of study", type: "text" },
      { name: "location", label: "Location", type: "text" },
      { name: "startDate", label: "Start date", type: "date", required: true },
      { name: "endDate", label: "End date", type: "date" },
      { name: "grade", label: "Grade", type: "text" },
      { name: "description", label: "Description", type: "markdown", wide: true },
      statusField,
      orderField,
    ],
  },

  {
    key: "certifications",
    model: "certification",
    label: "Certifications",
    singular: "Certification",
    description: "Credentials and training.",
    group: "content",
    hasStatus: true,
    hasOrder: true,
    searchFields: ["name", "issuer", "credentialId"],
    orderBy: [{ displayOrder: "asc" }, { issueDate: "desc" }],
    listColumns: [
      { field: "name", label: "Name" },
      { field: "issuer", label: "Issuer" },
      { field: "issueDate", label: "Issued", type: "date" },
      { field: "featured", label: "Featured", type: "boolean" },
      { field: "status", label: "State", type: "badge" },
      { field: "displayOrder", label: "Order", type: "order", width: "84px" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "issuer", label: "Issuer", type: "text", required: true },
      { name: "issueDate", label: "Issue date", type: "date" },
      { name: "expiryDate", label: "Expiry date", type: "date" },
      { name: "credentialId", label: "Credential ID", type: "text" },
      { name: "credentialUrl", label: "Credential URL", type: "text" },
      { name: "certificateImage", label: "Certificate image", type: "media" },
      { name: "description", label: "Description", type: "textarea", wide: true },
      { name: "featured", label: "Featured", type: "boolean" },
      statusField,
      orderField,
    ],
  },

  {
    key: "achievements",
    model: "achievement",
    label: "Achievements",
    singular: "Achievement",
    description: "The numbers strip. Nothing here is hardcoded in the UI.",
    group: "content",
    hasStatus: true,
    hasOrder: true,
    searchFields: ["label", "value"],
    orderBy: [{ displayOrder: "asc" }],
    listColumns: [
      { field: "value", label: "Value" },
      { field: "label", label: "Label" },
      { field: "status", label: "State", type: "badge" },
      { field: "displayOrder", label: "Order", type: "order", width: "84px" },
    ],
    fields: [
      { name: "value", label: "Value", type: "text", required: true, placeholder: "100+" },
      {
        name: "label",
        label: "Label",
        type: "text",
        required: true,
        placeholder: "Orders in first 30 minutes",
      },
      { name: "description", label: "Description", type: "text", wide: true },
      { name: "icon", label: "Icon slug", type: "text" },
      statusField,
      orderField,
    ],
  },

  {
    key: "social-links",
    model: "socialLink",
    label: "Social links",
    singular: "Social link",
    description: "Header, footer and contact links.",
    group: "content",
    hasStatus: true,
    hasOrder: true,
    searchFields: ["platform", "label", "url"],
    orderBy: [{ displayOrder: "asc" }],
    listColumns: [
      { field: "platform", label: "Platform" },
      { field: "label", label: "Label" },
      { field: "url", label: "URL" },
      { field: "enabled", label: "Enabled", type: "boolean" },
      { field: "status", label: "State", type: "badge" },
      { field: "displayOrder", label: "Order", type: "order", width: "84px" },
    ],
    fields: [
      { name: "platform", label: "Platform", type: "text", required: true },
      { name: "label", label: "Label", type: "text", required: true },
      { name: "url", label: "URL", type: "text", required: true },
      {
        name: "icon",
        label: "Simple Icons slug",
        type: "text",
        placeholder: "github",
        help: "Slug from simpleicons.org.",
      },
      { name: "enabled", label: "Enabled", type: "boolean" },
      statusField,
      orderField,
    ],
  },

  {
    key: "navigation",
    model: "navigationItem",
    label: "Navigation",
    singular: "Nav item",
    description: "Header and footer links. Rename, reorder, hide or add.",
    group: "site",
    hasStatus: false,
    hasOrder: true,
    searchFields: ["label", "href"],
    orderBy: [{ displayOrder: "asc" }],
    listColumns: [
      { field: "label", label: "Label" },
      { field: "href", label: "Href" },
      { field: "location", label: "Location", type: "badge" },
      { field: "visible", label: "Visible", type: "boolean" },
      { field: "displayOrder", label: "Order", type: "order", width: "84px" },
    ],
    fields: [
      { name: "label", label: "Label", type: "text", required: true },
      {
        name: "href",
        label: "Href",
        type: "text",
        required: true,
        placeholder: "/#projects",
      },
      {
        name: "location",
        label: "Location",
        type: "select",
        required: true,
        options: [
          { value: "HEADER", label: "Header" },
          { value: "FOOTER", label: "Footer" },
          { value: "BOTH", label: "Header and footer" },
        ],
      },
      { name: "visible", label: "Visible", type: "boolean" },
      { name: "external", label: "External link", type: "boolean" },
      orderField,
    ],
  },
];

export const RESOURCE_MAP = new Map(RESOURCES.map((r) => [r.key, r]));

export function getResource(key: string): ResourceDef | undefined {
  return RESOURCE_MAP.get(key);
}

export function allFields(resource: ResourceDef) {
  return resource.fields;
}

export function scalarFields(resource: ResourceDef) {
  return resource.fields.filter((f) => f.type !== "rows");
}

export function rowFields(resource: ResourceDef) {
  return resource.fields.filter((f) => f.type === "rows");
}

// ---------------------------------------------------------------------------
// Zod schema generated from the field definitions.
// Server actions validate against this. The client form uses the same builder,
// so the rules cannot drift between the two.
// ---------------------------------------------------------------------------

function baseSchemaFor(field: FieldDef): z.ZodTypeAny {
  switch (field.type) {
    case "number": {
      let n = z.coerce.number();
      if (field.min !== undefined) n = n.min(field.min);
      if (field.max !== undefined) n = n.max(field.max);
      return field.required
        ? n
        : z.preprocess(
            (v) => (v === "" || v === null || v === undefined ? null : v),
            n.nullable(),
          );
    }
    case "boolean":
      return z.coerce.boolean();
    case "date":
      return field.required
        ? z.coerce.date()
        : z.preprocess(
            (v) => (v === "" || v === null || v === undefined ? null : v),
            z.coerce.date().nullable(),
          );
    case "select": {
      const values = (field.options ?? []).map((o) => o.value);
      const e = z.string().refine((v) => values.includes(v), {
        message: "Not a valid option.",
      });
      return field.required ? e : z.union([e, z.literal("")]).nullable().optional();
    }
    case "list":
      return z.array(z.string().trim().min(1)).default([]);
    case "relation":
      return z
        .string()
        .nullable()
        .optional()
        .transform((v) => (v === "" ? null : v));
    case "slug": {
      const s = z
        .string()
        .trim()
        .min(1, "Required.")
        .max(80)
        .regex(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          "Lowercase letters, numbers and single hyphens only.",
        );
      return field.required ? s : s.optional();
    }
    default: {
      const s = z.string().trim().max(field.type === "text" ? 500 : 20000);
      return field.required
        ? s.min(1, "Required.")
        : s.nullable().optional().transform((v) => (v === "" ? null : v));
    }
  }
}

export function buildSchema(resource: ResourceDef) {
  return buildSchemaFromFields(resource.fields);
}

/**
 * Client forms only receive the field array (ResourceDef carries functions and
 * is not serialisable across the server boundary), so the schema builder takes
 * fields rather than the whole resource. Same code path both sides.
 */
export function buildSchemaFromFields(fields: FieldDef[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    if (field.type === "rows") {
      const childShape: Record<string, z.ZodTypeAny> = {};
      for (const child of field.rows!.fields) {
        childShape[child.name] = baseSchemaFor(child);
      }
      shape[field.name] = z.array(z.object(childShape)).default([]);
      continue;
    }
    shape[field.name] = baseSchemaFor(field);
  }

  return z.object(shape);
}

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Tell me your name.").max(120),
  email: z.string().trim().email("That does not look like an email address.").max(200),
  subject: z.string().trim().min(3, "Add a subject.").max(200),
  message: z
    .string()
    .trim()
    .min(20, "A bit more detail, please. At least 20 characters.")
    .max(5000),
  // Honeypot. Real people never fill this; bots fill everything.
  website: z.string().max(0, "Rejected.").optional().default(""),
});

export type ContactInput = z.infer<typeof contactSchema>;
