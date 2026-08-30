"use client";

/**
 * Last-resort boundary. It replaces the entire document, so it cannot rely on
 * the root layout, the theme tokens or the fonts, and has to carry its own
 * <html> and inline styles.
 *
 * This is what catches a failure inside the root layout itself, for example
 * the database being unreachable while settings are read.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          background: "#060607",
          color: "#f5f5f7",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ maxWidth: "34rem" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.6875rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#ff2a2a",
            }}
          >
            Service interrupted
          </p>
          <h1
            style={{
              margin: "1.25rem 0 0",
              fontSize: "clamp(2rem, 6vw, 3rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              fontWeight: 600,
            }}
          >
            This page could not be rendered
          </h1>
          <p
            style={{
              margin: "1.5rem 0 0",
              fontSize: "1.0625rem",
              lineHeight: 1.6,
              color: "#86868b",
            }}
          >
            The site could not reach its content. This is usually the database
            being unavailable rather than anything you did.
          </p>

          {error.digest ? (
            <p
              style={{
                margin: "1.5rem 0 0",
                fontSize: "0.75rem",
                fontFamily: "ui-monospace, monospace",
                color: "#86868b",
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              padding: "0.75rem 1.375rem",
              borderRadius: 999,
              border: "none",
              background: "#ff2a2a",
              color: "#fff",
              fontSize: "0.9375rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
