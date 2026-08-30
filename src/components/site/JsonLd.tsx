/**
 * Structured data. One component, because the only thing that varies between
 * schema types is the object itself.
 *
 * Rendered as a plain <script>, not next/script: JSON-LD has to be in the
 * server-rendered HTML for crawlers that do not execute JavaScript.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // The payload is our own CMS content, not user input, and JSON.stringify
      // cannot emit a closing script tag except inside a string value, which
      // the < escape below neutralises.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\u003c"),
      }}
    />
  );
}

export function breadcrumbList(
  base: string,
  crumbs: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${base}${c.path}`,
    })),
  };
}
