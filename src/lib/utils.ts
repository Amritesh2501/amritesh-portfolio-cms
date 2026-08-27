export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "May 2025" - the only date format the public site uses. */
export function monthYear(date: Date | string | null | undefined) {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function dateRange(
  start: Date | string | null,
  end: Date | string | null,
  current: boolean,
) {
  const from = monthYear(start);
  if (!from) return current ? "Present" : "";
  const to = current ? "Present" : (monthYear(end) ?? "Present");
  return `${from} - ${to}`;
}

/** "2 Feb 2026, 14:07" for admin tables. */
export function timestamp(date: Date | string | null | undefined) {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "-";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

export function relativeTime(date: Date | string | null | undefined) {
  if (!date) return "never";
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const units: Array<[number, string]> = [
    [60, "min"],
    [3600, "hr"],
    [86400, "day"],
    [604800, "week"],
    [2592000, "month"],
    [31536000, "year"],
  ];
  let value = seconds;
  let label = "sec";
  for (const [divisor, name] of units) {
    if (seconds >= divisor) {
      value = Math.floor(seconds / divisor);
      label = name;
    }
  }
  return `${value} ${label}${value === 1 ? "" : "s"} ago`;
}

/**
 * Minimal, escape-first markdown for CMS-authored prose.
 *
 * ponytail: the admin is a single trusted operator, but the output still goes
 * through HTML escaping BEFORE any tag is emitted, so a compromised account
 * cannot inject script. Supports the subset that portfolio copy actually needs:
 * headings, bold, italic, inline code, links, bullet lists, paragraphs.
 * Swap for `marked` + `DOMPurify` if the content ever needs tables or images.
 */
export function renderMarkdown(input: string | null | undefined): string {
  if (!input) return "";

  const escaped = input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const inline = (s: string) =>
    s
      .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
      );

  const blocks = escaped.split(/\n{2,}/);
  const html: string[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = Math.min(6, heading[1].length + 1);
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    const lines = trimmed.split("\n");
    if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      const items = lines
        .map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ""))}</li>`)
        .join("");
      html.push(`<ul>${items}</ul>`);
      continue;
    }
    if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
      const items = lines
        .map((l) => `<li>${inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>`)
        .join("");
      html.push(`<ol>${items}</ol>`);
      continue;
    }

    html.push(`<p>${inline(lines.join("<br />"))}</p>`);
  }

  return html.join("");
}

/** Strips markdown for meta descriptions and card previews. */
export function plainText(input: string | null | undefined, max = 160) {
  if (!input) return "";
  const text = input
    .replace(/[#*`_>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}...`;
}
