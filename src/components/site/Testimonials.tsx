import { Arrow } from "./Arrow";
import { RevealGroup, RevealItem } from "./Reveal";
import { imgProps } from "@/lib/img";

type Testimonial = {
  id: string;
  quote: string;
  name: string;
  role: string | null;
  company: string | null;
  avatar: string | null;
  url: string | null;
};

/**
 * What other people say, set as quotes rather than cards: the words carry it,
 * so they get the serif and the room, and the attribution sits small under
 * each one. Server-rendered; no JavaScript beyond the shared reveal.
 */
export function Testimonials({ items }: { items: Testimonial[] }) {
  return (
    <RevealGroup as="ul" className="tm-list">
      {items.map((t) => {
        const who = [t.role, t.company].filter(Boolean).join(", ");
        return (
          <RevealItem key={t.id} as="li" className="tm-item">
            <figure className="tm-figure">
              <blockquote className="tm-quote t-serif">“{t.quote.trim()}”</blockquote>
              <figcaption className="tm-by">
                {t.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img {...imgProps(t.avatar, "48px")} alt="" className="tm-avatar" loading="lazy" decoding="async" />
                ) : (
                  <span aria-hidden className="tm-avatar is-initial">
                    {t.name.trim().charAt(0)}
                  </span>
                )}
                <span>
                  {t.url ? (
                    <a href={t.url} target="_blank" rel="noopener noreferrer" className="tm-name">
                      {t.name}
                      <Arrow direction="up-right" className="tm-arrow" />
                    </a>
                  ) : (
                    <span className="tm-name">{t.name}</span>
                  )}
                  {who ? <span className="tm-role">{who}</span> : null}
                </span>
              </figcaption>
            </figure>
          </RevealItem>
        );
      })}
    </RevealGroup>
  );
}
