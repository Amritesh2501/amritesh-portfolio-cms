/**
 * Responsive, re-encoded images without swapping every <img> for next/image.
 *
 * The site's pictures are CMS uploads, served as uploaded: a 750 KB PNG went
 * into a slot a few hundred pixels wide. These props point the same <img> at
 * Next's image optimizer, which picks AVIF or WebP per browser and the width
 * from `sizes`, and caches the result (see images in next.config).
 *
 * Only for our own paths: anything else (a pasted remote URL) is returned as
 * is, because the optimizer refuses hosts that are not allow-listed.
 */

// A subset of Next's default deviceSizes; the optimizer rejects other widths.
const WIDTHS = [640, 828, 1200, 1920] as const;

const optimizable = (src: string) => src.startsWith("/") && !src.startsWith("//") && !src.endsWith(".svg");

export function imgProps(src: string, sizes = "(min-width: 1024px) 50vw, 100vw", quality = 75) {
  if (!optimizable(src)) return { src };
  const url = (w: number) => `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${quality}`;
  return {
    src: url(1200),
    srcSet: WIDTHS.map((w) => `${url(w)} ${w}w`).join(", "),
    sizes,
  };
}
