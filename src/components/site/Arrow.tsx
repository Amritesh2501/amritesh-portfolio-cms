/**
 * The one arrow on the site.
 *
 * Drawn rather than typed. The glyphs this replaces (&rarr;, &#8599;) are
 * font-dependent: weight, length and optical centring changed between the
 * serif, the sans and the mono, so no two arrows on the page matched. A stroked
 * SVG is the same mark everywhere and inherits currentColor and the type scale.
 *
 * The stem is drawn from the tail so that `grow` can lengthen it on hover
 * without moving the head, which is what makes the gesture read as the arrow
 * reaching rather than the whole glyph sliding.
 */
export function Arrow({
  direction = "right",
  className = "",
}: {
  direction?: "right" | "up-right" | "up" | "left" | "down";
  className?: string;
}) {
  const rotation = { right: 0, "up-right": -45, up: -90, left: 180, down: 90 }[direction];

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      focusable="false"
      className={`arrow ${className}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <path
        className="arrow-stem"
        d="M3 12h16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M13.5 6.5 19 12l-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
