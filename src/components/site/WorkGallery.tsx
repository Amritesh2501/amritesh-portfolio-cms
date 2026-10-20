"use client";

import { useState } from "react";
import { imgProps } from "@/lib/img";

/**
 * The pictures of a work in progress: one large, the rest as thumbnails that
 * swap in. Nothing to load beyond the images themselves.
 */
export function WorkGallery({ images, title }: { images: { url: string; caption: string | null }[]; title: string }) {
  const [i, setI] = useState(0);
  const shown = images[i] ?? images[0];
  if (!shown) {
    return (
      <div className="cw-stage">
        <span aria-hidden className="cw-blank t-serif">
          {title.trim().charAt(0)}
        </span>
      </div>
    );
  }

  return (
    <div className="cw-gallery">
      <figure className="cw-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={shown.url}
          {...imgProps(shown.url, "(min-width: 1024px) 55vw, 100vw")}
          alt={shown.caption ?? `${title}, screenshot ${i + 1}`}
          decoding="async"
        />
        {shown.caption ? <figcaption className="cw-caption">{shown.caption}</figcaption> : null}
      </figure>
      {images.length > 1 ? (
        <div className="cw-thumbs" role="group" aria-label="More images">
          {images.map((img, n) => (
            <button
              key={img.url + n}
              type="button"
              className={`cw-thumb ${n === i ? "is-on" : ""}`}
              onClick={() => setI(n)}
              aria-label={`Show image ${n + 1}${img.caption ? `: ${img.caption}` : ""}`}
              aria-pressed={n === i}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img {...imgProps(img.url, "96px")} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
