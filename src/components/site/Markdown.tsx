import { renderMarkdown } from "@/lib/utils";

/**
 * CMS prose. `renderMarkdown` escapes the input before emitting any tag, so
 * this cannot inject markup even if an admin account is compromised.
 */
export function Markdown({
  content,
  className = "",
}: {
  content: string | null | undefined;
  className?: string;
}) {
  if (!content?.trim()) return null;
  return (
    <div
      className={`prose-tech ${className}`}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
