import Link from "next/link";

/**
 * Visible breadcrumb trail. Pairs with the BreadcrumbList JSON-LD: search
 * results show the trail, and the same links give crawlers a route back up
 * from deep project pages, which otherwise are only reachable from /projects.
 */
export function Breadcrumbs({
  items,
}: {
  items: { name: string; path?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.path ?? item.name} className="flex items-center gap-2">
              {item.path && !last ? (
                <Link
                  href={item.path}
                  className="transition-colors hover:text-[var(--fg)]"
                >
                  {item.name}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined}>{item.name}</span>
              )}
              {!last && (
                <span aria-hidden="true" className="opacity-50">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
