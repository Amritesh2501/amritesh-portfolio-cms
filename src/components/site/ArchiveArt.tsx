"use client";

import { useId, type ReactNode } from "react";
import { ARCHIVE, type ArchiveProp, type ArchiveRoom as Room, type Box } from "@/lib/archives";

/**
 * The college archive, the locked archives and the training facility, as
 * drawings.
 *
 * Same hand as the other rooms: stroke-only ink, solid fills only to occlude.
 * The shell — walls, floor, window, ceiling fittings and lit shelves — is the
 * same in all three and is drawn from the room's data. What stands in the room
 * is drawn per room, and every one of those things is a <Prop>: a group that
 * takes an `is-on` class when used, which is what the stylesheet animates.
 */

type Props = {
  room: Room;
  at: string | null;
  on: Record<string, boolean>;
  /** The prop touched last; its counter restarts the touch animation. */
  poke?: { id: string; n: number };
  lights: boolean;
  shelfLights: boolean;
  blindOpen: boolean;
  onStation: (id: string) => void;
  onProp: (id: string) => void;
  onLights: () => void;
  onShelfLights: () => void;
  onBlind: () => void;
};

export function ArchiveRoom(p: Props) {
  const { room } = p;
  /** Draw a prop by id: its art, the state class, and its hit box on top. */
  const P = (id: string, art: ReactNode) => {
    const prop = room.props.find((x) => x.id === id)!;
    const poked = p.poke?.id === id ? p.poke.n : 0;
    return <Prop key={id} prop={prop} on={Boolean(p.on[id])} poked={poked} onUse={p.onProp} art={art} />;
  };

  return (
    <svg
      className="xw-svg"
      viewBox={`0 0 ${ARCHIVE.w} ${ARCHIVE.h}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <Shell />
      <Daylight glass={room.glass} open={p.blindOpen} />
      <Window glass={room.glass} bars={room.bars} open={p.blindOpen} onToggle={p.onBlind} />

      {room.id === "college" ? <College P={P} /> : null}
      {room.id === "vault" ? <Vault P={P} /> : null}
      {room.id === "training" ? <Training P={P} /> : null}

      <Shelves shelves={room.shelves} on={p.shelfLights} onToggle={p.onShelfLights} />
      {room.pendants.map((x) => (
        <Pendant key={x} x={x} on={p.lights} onToggle={p.onLights} />
      ))}
    </svg>
  );
}

type Draw = (id: string, art: ReactNode) => ReactNode;

function Prop({
  prop,
  on,
  poked,
  onUse,
  art,
}: {
  prop: ArchiveProp;
  on: boolean;
  poked: number;
  onUse: (id: string) => void;
  art: ReactNode;
}) {
  const { x, y, w, h } = prop.hit;
  return (
    <g className={`xw-ar-prop ${on ? "is-on" : ""}`}>
      {/* Two identical animations, alternated, so every touch replays the
          nudge without remounting the art (which would cut its transitions). */}
      <g className={poked ? `xw-ar-poke-${poked % 2 ? "a" : "b"}` : undefined}>
        {art}
      </g>
      <rect
        className="xw-hit"
        x={x}
        y={y}
        width={w}
        height={h}
        onClick={(e) => {
          e.stopPropagation();
          onUse(prop.id);
        }}
      />
    </g>
  );
}

/* ---------------------------------------------------------------------------
   The shell
   ------------------------------------------------------------------------- */

function Shell() {
  return (
    <>
      <g className="xw-line">
        <path d="M420 320 L1996 316 L1994 944 L422 948 Z" />
        <path d="M422 948 L2 1348" />
        <path d="M1994 944 L2398 1348" />
        <path d="M420 320 L2 130" />
        <path d="M1996 316 L2398 128" />
        <path d="M426 960 L1990 956" className="xw-thin" />
      </g>
      <g className="xw-line xw-thin xw-faint">
        {[-500, -270, -40, 190, 420, 650, 880].map((o, i) => (
          <path key={i} d={`M${1200 + o * 0.18} 954 L${1200 + o * 1.95} 1350`} />
        ))}
      </g>
    </>
  );
}

function Daylight({ glass: g, open }: { glass: Box; open: boolean }) {
  return (
    <g className={`xw-day ${open ? "is-on" : ""}`} aria-hidden>
      <path
        d={`M${g.x} ${g.y + g.h} L${g.x + g.w} ${g.y + g.h} L${g.x + g.w + 320} 1350 L${g.x - 320} 1350 Z`}
        className="xw-day-shaft"
      />
      <ellipse cx={g.x + g.w / 2} cy={1180} rx={g.w * 1.4} ry={140} className="xw-day-pool" />
      <rect x={g.x} y={g.y} width={g.w} height={g.h} className="xw-day-glow" />
    </g>
  );
}

/** A roller blind on a strap, over whatever is outside. Bars for the vault. */
function Window({
  glass: g,
  bars,
  open,
  onToggle,
}: {
  glass: Box;
  bars?: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const clip = "arw" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const h = open ? g.h * 0.09 : g.h * 0.95;
  // Four buildings across the glass, each with a column of lit windows.
  const towers = [0.04, 0.28, 0.52, 0.76].map((f, i) => ({
    x: g.x + g.w * f,
    w: g.w * 0.18,
    top: g.y + g.h * (0.25 + ((i * 0.17) % 0.4)),
  }));

  return (
    <g className="xw-lab-win">
      <path
        d={`M${g.x - 18} ${g.y - 18} L${g.x + g.w + 18} ${g.y - 18} L${g.x + g.w + 18} ${g.y + g.h + 18} L${g.x - 18} ${g.y + g.h + 18} Z`}
        className="xw-line xw-solid"
      />

      <g className={`xw-outside ${open ? "is-open" : ""}`}>
        <rect x={g.x} y={g.y} width={g.w} height={g.h} className="xw-bed-sky-fill" />
        <g className="xw-line xw-thin xw-faint">
          {towers.map((t, i) => (
            <path key={i} d={`M${t.x} ${g.y + g.h} L${t.x} ${t.top} L${t.x + t.w} ${t.top} L${t.x + t.w} ${g.y + g.h}`} />
          ))}
        </g>
        <g className="xw-city">
          {towers.flatMap((t, i) =>
            [0, 1, 2].map((r) =>
              t.top + 12 + r * 26 < g.y + g.h - 16 ? (
                <rect
                  key={`${i}-${r}`}
                  x={t.x + t.w * 0.3}
                  y={t.top + 12 + r * 26}
                  width={t.w * 0.4}
                  height={14}
                  className={(i + r) % 3 === 0 ? "xw-city-lit is-warm" : "xw-city-lit"}
                />
              ) : null,
            ),
          )}
        </g>
      </g>

      <clipPath id={clip}>
        <rect x={g.x} y={g.y} width={g.w} height={g.h} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <g className="xw-lab-blind">
          <rect x={g.x} y={g.y} width={g.w} height={h} className="xw-blind-face" />
          <path d={`M${g.x} ${g.y + h} L${g.x + g.w} ${g.y + h}`} className="xw-line xw-thin" />
        </g>
      </g>

      <g className="xw-line">
        <path d={`M${g.x} ${g.y} L${g.x + g.w} ${g.y} L${g.x + g.w} ${g.y + g.h} L${g.x} ${g.y + g.h} Z`} className="xw-thin" />
        <path d={`M${g.x - 30} ${g.y + g.h + 20} L${g.x + g.w + 30} ${g.y + g.h + 20}`} />
        {bars
          ? Array.from({ length: Math.floor(g.w / 32) }, (_, i) => (
              <path key={i} d={`M${g.x + 16 + i * 32} ${g.y} L${g.x + 16 + i * 32} ${g.y + g.h}`} />
            ))
          : null}
      </g>

      <g className={`xw-cord ${open ? "is-up" : ""}`}>
        <path d={`M${g.x + g.w - 14} ${g.y + h} L${g.x + g.w - 14} ${g.y + h + 60}`} className="xw-hot-line" />
        <circle cx={g.x + g.w - 14} cy={g.y + h + 68} r={8} className="xw-cord-bead" />
      </g>

      <rect
        className="xw-hit"
        x={g.x - 18}
        y={g.y - 18}
        width={g.w + 36}
        height={g.h + 36}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      />
    </g>
  );
}

/** A ceiling fitting. Every fitting in a room is on one switch. */
function Pendant({ x, on, onToggle }: { x: number; on: boolean; onToggle: () => void }) {
  return (
    <g className={`xw-pendant ${on ? "is-on" : ""}`}>
      <g className="xw-bulb-light">
        <path d={`M${x - 200} 250 L${x + 200} 248 L${x + 480} 1350 L${x - 480} 1350 Z`} className="xw-bulb-cone" />
        <ellipse cx={x} cy={1170} rx={380} ry={120} className="xw-bulb-pool" />
      </g>
      <g className="xw-line">
        <path d={`M${x} 130 L${x} 214`} className="xw-thin" />
        <path d={`M${x - 80} 218 L${x + 80} 216 L${x + 100} 262 L${x - 100} 264 Z`} className="xw-solid" />
      </g>
      <circle cx={x} cy={252} r={12} className="xw-bulb-core" />
      <rect
        className="xw-hit"
        x={x - 110}
        y={210}
        width={220}
        height={64}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      />
    </g>
  );
}

/** Shelf boards, each with a strip light on its underside. */
function Shelves({
  shelves,
  on,
  onToggle,
}: {
  shelves: { x: number; y: number; w: number }[];
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <g className={`xw-ar-shelves ${on ? "is-on" : ""}`}>
      {shelves.map((s) => (
        <g key={`${s.x}-${s.y}`}>
          <path
            d={`M${s.x + 8} ${s.y + 12} L${s.x + s.w - 8} ${s.y + 12} L${s.x + s.w + 20} ${s.y + 100} L${s.x - 20} ${s.y + 100} Z`}
            className="xw-ar-spill"
          />
          <path
            d={`M${s.x} ${s.y} L${s.x + s.w} ${s.y} L${s.x + s.w} ${s.y + 10} L${s.x} ${s.y + 10} Z`}
            className="xw-line xw-thin xw-solid"
          />
          <rect x={s.x + 8} y={s.y + 10} width={s.w - 16} height={3} className="xw-ar-strip" />
          <rect
            className="xw-hit"
            x={s.x}
            y={s.y - 2}
            width={s.w}
            height={16}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          />
        </g>
      ))}
    </g>
  );
}

/* ---------------------------------------------------------------------------
   The college archive
   ------------------------------------------------------------------------- */

function College({ P }: { P: Draw }) {
  return (
    <>
      {/* The stacks: a tall case of yearbooks, one of them pulled. */}
      {P(
        "yearbooks",
        <g>
          <path d="M450 350 L830 350 L830 940 L450 940 Z" className="xw-line xw-solid" />
          <g className="xw-line xw-thin">
            {[470, 590, 710, 830].flatMap((y, r) =>
              Array.from({ length: 14 }, (_, i) => {
                const x = 470 + i * 24;
                const top = y - 70 - ((i * 7 + r * 5) % 22);
                const pulled = r === 1 && i === 6;
                return (
                  <path
                    key={`${r}-${i}`}
                    d={`M${x} ${y} L${x} ${top} L${x + 20} ${top} L${x + 20} ${y} Z`}
                    className={pulled ? "xw-solid xw-ar-slide" : "xw-solid"}
                    style={pulled ? { ["--dy" as string]: "-40px" } : undefined}
                  />
                );
              }),
            )}
            <path d="M480 930 L620 930 L620 870 L480 870 Z" className="xw-solid" />
            <path d="M640 930 L800 930 L800 880 L640 880 Z" className="xw-solid" />
          </g>
        </g>,
      )}

      {/* The card catalogue: twelve drawers, brass pulls, one on its runners. */}
      {P(
        "catalogue",
        <g className="xw-line">
          <path d="M900 660 L1180 660 L1180 940 L900 940 Z" className="xw-solid" />
          <path d="M900 660 L922 642 L1200 642 L1180 660 Z" className="xw-solid" />
          <path d="M1180 660 L1200 642 L1200 920 L1180 940 Z" className="xw-solid" />
          {Array.from({ length: 12 }, (_, i) => {
            const c = i % 3;
            const r = Math.floor(i / 3);
            const x = 912 + c * 88;
            const y = 674 + r * 64;
            const out = i === 4;
            return (
              <g
                key={i}
                className={out ? "xw-ar-slide" : undefined}
                style={out ? { ["--dy" as string]: "30px", ["--dx" as string]: "10px" } : undefined}
              >
                <path d={`M${x} ${y} L${x + 80} ${y} L${x + 80} ${y + 56} L${x} ${y + 56} Z`} className="xw-thin xw-solid" />
                <path d={`M${x + 28} ${y + 14} L${x + 52} ${y + 14} L${x + 52} ${y + 24} L${x + 28} ${y + 24} Z`} className="xw-thin" />
                <path d={`M${x + 32} ${y + 38} L${x + 48} ${y + 38}`} className="xw-thin" />
              </g>
            );
          })}
        </g>,
      )}

      {/* The globe on its stand. The meridians turn. */}
      {P(
        "globe",
        <g className="xw-line">
          <path d="M1255 850 L1255 930" />
          <ellipse cx={1255} cy={934} rx={42} ry={8} className="xw-solid" />
          <path d="M1198 792 A 58 58 0 0 0 1296 850" className="xw-thin" />
          <circle cx={1255} cy={790} r={46} className="xw-solid" />
          <g className="xw-ar-tick">
            <circle cx={1255} cy={790} r={46} fill="none" stroke="none" />
            <ellipse cx={1255} cy={790} rx={20} ry={46} className="xw-thin" />
            <path d="M1255 744 L1255 836" className="xw-thin" />
            <path d="M1226 770 Q1244 758 1262 772 Q1250 790 1232 786 Z" className="xw-thin" />
            <path d="M1262 800 Q1282 796 1286 812 Q1272 826 1260 814 Z" className="xw-thin" />
          </g>
          <path d="M1209 790 L1301 790" className="xw-thin xw-faint" />
        </g>,
      )}

      {/* The reading desk. Scenery; the two things on it are the props. */}
      <g className="xw-line">
        <path d="M1320 776 L1740 772 L1762 806 L1298 810 Z" className="xw-solid" />
        <path d="M1298 810 L1762 806 L1762 826 L1298 830 Z" className="xw-solid" />
        <path d="M1316 830 L1316 940" />
        <path d="M1744 826 L1744 936" />
        <path d="M1604 830 L1604 930 M1744 900 L1604 902" className="xw-thin xw-faint" />
      </g>

      {P(
        "lamp",
        <g>
          <path d="M1362 724 L1438 724 L1520 800 L1280 800 Z" className="xw-ar-glow xw-ar-warm" />
          <g className="xw-line">
            <ellipse cx={1400} cy={784} rx={30} ry={7} className="xw-solid" />
            <path d="M1400 784 L1400 726" />
            <path d="M1356 726 L1444 726 L1430 700 L1370 700 Z" className="xw-ar-shade" />
            <path d="M1444 726 L1452 744" className="xw-thin" />
          </g>
        </g>,
      )}

      {P(
        "fiche",
        <g className="xw-line">
          <path d="M1572 700 L1700 700 L1700 782 L1572 782 Z" className="xw-solid" />
          <path d="M1580 640 L1692 640 L1692 700 L1580 700 Z" className="xw-solid" />
          <rect x={1592} y={650} width={88} height={42} className="xw-ar-screen" />
          <g className="xw-ar-glow">
            {[0, 1, 2, 3].map((i) => (
              <path key={i} d={`M1600 ${660 + i * 8} L${1664 - (i % 2) * 18} ${660 + i * 8}`} className="xw-thin" />
            ))}
          </g>
          <circle cx={1686} cy={764} r={7} className="xw-thin" />
        </g>,
      )}

      {/* The diploma, crooked until somebody straightens it. */}
      {P(
        "diploma",
        <g className="xw-ar-tilt">
          <path d="M1262 412 L1448 412 L1448 548 L1262 548 Z" className="xw-line xw-solid" />
          <path d="M1278 426 L1432 426 L1432 534 L1278 534 Z" className="xw-line xw-thin" />
          <g className="xw-line xw-thin xw-faint">
            <path d="M1300 450 L1410 450" />
            <path d="M1316 470 L1394 470" />
            <path d="M1300 490 L1376 490" />
          </g>
          <circle cx={1404} cy={510} r={12} className="xw-ar-seal" />
        </g>,
      )}
    </>
  );
}

/* ---------------------------------------------------------------------------
   The locked archives
   ------------------------------------------------------------------------- */

function Vault({ P }: { P: Draw }) {
  const mesh = "arm" + useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <>
      <defs>
        <pattern id={mesh} width={18} height={18} patternUnits="userSpaceOnUse">
          <path d="M0 0 L18 18 M18 0 L0 18" className="xw-ar-mesh" />
        </pattern>
      </defs>

      {/* The cage: boxes on shelves behind chain link, and a gate with a lock. */}
      {P(
        "cage",
        <g>
          <g className="xw-line xw-thin">
            {[520, 680, 840].flatMap((y) =>
              [0, 1, 2, 3].map((i) => (
                <path
                  key={`${y}-${i}`}
                  d={`M${486 + i * 70} ${y} L${486 + i * 70} ${y - 58} L${546 + i * 70} ${y - 58} L${546 + i * 70} ${y} Z`}
                  className="xw-solid"
                />
              )),
            )}
          </g>
          <rect x={456} y={376} width={300} height={560} fill={`url(#${mesh})`} />
          <g className="xw-line">
            <path d="M452 372 L918 372" />
            <path d="M452 372 L452 940 M918 372 L918 940" />
            <path d="M760 372 L760 940" className="xw-thin" />
          </g>
          {/* The gate, hinged on the left. It folds back once the lock is off. */}
          <g className="xw-ar-fold">
            <rect x={764} y={378} width={150} height={558} fill={`url(#${mesh})`} />
            <path d="M764 378 L914 378 L914 936 L764 936 Z" className="xw-line xw-thin" />
            <g className="xw-line">
              <path d="M870 660 Q870 636 886 636 Q902 636 902 660" className="xw-thin" />
              <path d="M862 660 L910 660 L910 698 L862 698 Z" className="xw-ar-lock" />
              <circle cx={886} cy={678} r={4} className="xw-thin" />
            </g>
          </g>
        </g>,
      )}

      {/* The deposit boxes: forty small doors, one of them not locked. */}
      {P(
        "boxes",
        <g className="xw-line">
          <path d="M980 480 L1420 480 L1420 780 L980 780 Z" className="xw-solid" />
          {Array.from({ length: 40 }, (_, i) => {
            const c = i % 8;
            const r = Math.floor(i / 8);
            const x = 988 + c * 54;
            const y = 488 + r * 58;
            const open = i === 21;
            return (
              <g key={i}>
                {open ? (
                  <path d={`M${x + 8} ${y + 12} L${x + 42} ${y + 12} L${x + 42} ${y + 44} L${x + 8} ${y + 44} Z`} className="xw-ar-paper" />
                ) : null}
                <g className={open ? "xw-ar-fold" : undefined}>
                  <path d={`M${x} ${y} L${x + 50} ${y} L${x + 50} ${y + 54} L${x} ${y + 54} Z`} className="xw-thin xw-solid" />
                  <circle cx={x + 40} cy={y + 27} r={4} className="xw-thin" />
                </g>
              </g>
            );
          })}
        </g>,
      )}

      {/* A trolley with two archive boxes on it. The lid comes off one. */}
      {P(
        "trolley",
        <g className="xw-line">
          <path d="M1030 880 L1370 880 L1370 896 L1030 896 Z" className="xw-solid" />
          <path d="M1050 896 L1050 924 M1350 896 L1350 924" />
          <circle cx={1050} cy={930} r={9} className="xw-thin xw-solid" />
          <circle cx={1350} cy={930} r={9} className="xw-thin xw-solid" />
          <path d="M1370 880 L1392 820" />
          <path d="M1060 880 L1060 824 L1190 824 L1190 880 Z" className="xw-thin xw-solid" />
          <path d="M1210 880 L1210 830 L1340 830 L1340 880 Z" className="xw-thin xw-solid" />
          <path
            d="M1054 824 L1196 824 L1196 810 L1054 810 Z"
            className="xw-thin xw-solid xw-ar-slide"
            style={{ ["--dx" as string]: "30px", ["--dy" as string]: "-26px" }}
          />
        </g>,
      )}

      {/* The vault door: a round door in a square frame, bolts, and a wheel. */}
      {P(
        "vault",
        <g className="xw-line">
          <path d="M1490 440 L1910 440 L1910 880 L1490 880 Z" className="xw-solid" />
          <circle cx={1700} cy={660} r={200} className="xw-solid" />
          <circle cx={1700} cy={660} r={172} className="xw-thin" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <circle key={i} cx={1700 + Math.cos(a) * 186} cy={660 + Math.sin(a) * 186} r={5} className="xw-thin" />;
          })}
          <g className="xw-ar-turn">
            <circle cx={1700} cy={660} r={60} className="xw-thin" />
            {[0, 60, 120].map((d) => {
              const a = (d * Math.PI) / 180;
              const dx = Math.cos(a) * 72;
              const dy = Math.sin(a) * 72;
              return <path key={d} d={`M${1700 - dx} ${660 - dy} L${1700 + dx} ${660 + dy}`} />;
            })}
            <circle cx={1700} cy={660} r={12} className="xw-solid" />
          </g>
        </g>,
      )}

      {/* A camera over the door, and the light that says it is recording. */}
      {P(
        "camera",
        <g className="xw-line">
          <path d="M1962 398 L1962 432 L1944 424" className="xw-thin" />
          <path d="M1868 412 L1940 402 L1946 434 L1874 444 Z" className="xw-solid" />
          <circle cx={1872} cy={428} r={10} className="xw-thin xw-solid" />
          <circle cx={1930} cy={414} r={4} className="xw-ar-led" />
        </g>,
      )}
    </>
  );
}

/* ---------------------------------------------------------------------------
   The training facility
   ------------------------------------------------------------------------- */

function Training({ P }: { P: Draw }) {
  return (
    <>
      {/* The drills on a whiteboard, and one circled once you look. */}
      {P(
        "whiteboard",
        <g>
          <path d="M452 392 L828 392 L828 612 L452 612 Z" className="xw-line xw-solid" />
          <path d="M466 404 L814 404 L814 598 L466 598 Z" className="xw-line xw-thin xw-faint" />
          <g className="xw-line xw-thin">
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                <path d={`M486 ${432 + i * 32} L${640 - (i % 3) * 30} ${432 + i * 32}`} />
                <path d={`M690 ${432 + i * 32} L${716 + (i % 2) * 40} ${432 + i * 32}`} className="xw-faint" />
              </g>
            ))}
          </g>
          <ellipse cx={560} cy={464} rx={96} ry={18} className="xw-ar-glow xw-ar-marker" />
          <path d="M452 612 L828 612 L836 622 L444 622 Z" className="xw-line xw-thin xw-solid" />
        </g>,
      )}

      {/* Trophies on the lit shelf under the board. */}
      {P(
        "trophies",
        <g>
          <g className="xw-line xw-thin">
            {[0, 1, 2, 3].map((i) => {
              const x = 500 + i * 86;
              const t = 648 + (i % 2) * 14;
              return (
                <g key={i}>
                  <path d={`M${x} ${t} L${x + 40} ${t} Q${x + 40} ${t + 30} ${x + 20} ${t + 34} Q${x} ${t + 30} ${x} ${t} Z`} className="xw-solid" />
                  <path d={`M${x + 20} ${t + 34} L${x + 20} ${708}`} />
                  <path d={`M${x + 6} 708 L${x + 34} 708 L${x + 34} 718 L${x + 6} 718 Z`} className="xw-solid" />
                </g>
              );
            })}
          </g>
          <g className="xw-ar-glow xw-ar-glint">
            {[0, 1, 2, 3].map((i) => (
              <path key={i} d={`M${514 + i * 86} 656 l6 -12 M${526 + i * 86} 660 l12 -6`} />
            ))}
          </g>
        </g>,
      )}

      {/* Four lockers. The second one swings open onto its kit. */}
      {P(
        "lockers",
        <g className="xw-line">
          {[0, 1, 2, 3].map((i) => {
            const x = 880 + i * 70;
            return (
              <g key={i}>
                {i === 1 ? (
                  <g className="xw-thin">
                    <path d={`M${x} 420 L${x + 70} 420 L${x + 70} 940 L${x} 940 Z`} className="xw-solid" />
                    <path d={`M${x + 10} 520 L${x + 60} 520`} />
                    <path d={`M${x + 22} 520 L${x + 18} 640 L${x + 34} 640 L${x + 32} 520`} className="xw-ar-paper" />
                    <circle cx={x + 48} cy={700} r={14} className="xw-ar-paper" />
                  </g>
                ) : null}
                <g className={i === 1 ? "xw-ar-fold" : undefined}>
                  <path d={`M${x} 420 L${x + 70} 420 L${x + 70} 940 L${x} 940 Z`} className="xw-solid" />
                  {[0, 1, 2].map((v) => (
                    <path key={v} d={`M${x + 16} ${446 + v * 10} L${x + 54} ${446 + v * 10}`} className="xw-thin xw-faint" />
                  ))}
                  <path d={`M${x + 56} 660 L${x + 56} 700`} className="xw-thin" />
                  <path d={`M${x + 14} 490 L${x + 44} 490 L${x + 44} 504 L${x + 14} 504 Z`} className="xw-thin" />
                </g>
              </g>
            );
          })}
        </g>,
      )}

      {/* The heavy bag, on a chain from the beam. */}
      {P(
        "bag",
        <g className="xw-ar-swing">
          <g className="xw-line">
            <path d="M1300 320 L1300 396" className="xw-thin" />
            <path d="M1300 396 L1270 412 M1300 396 L1330 412" className="xw-thin" />
            <path d="M1266 412 L1334 412 L1338 740 Q1300 756 1262 740 Z" className="xw-solid" />
            <path d="M1264 470 L1336 470 M1264 690 L1337 690" className="xw-thin xw-faint" />
          </g>
        </g>,
      )}

      {/* A rack of dumbbells. One comes off. */}
      {P(
        "rack",
        <g className="xw-line">
          <path d="M1392 940 L1420 780 L1520 780 L1548 940" />
          <path d="M1404 860 L1536 860" className="xw-thin" />
          {[
            { x: 1430, y: 790 },
            { x: 1490, y: 790, lift: true },
            { x: 1420, y: 870 },
            { x: 1500, y: 870 },
          ].map((d, i) => (
            <g
              key={i}
              className={d.lift ? "xw-ar-slide" : undefined}
              style={d.lift ? { ["--dy" as string]: "-60px" } : undefined}
            >
              <path d={`M${d.x + 8} ${d.y - 6} L${d.x + 32} ${d.y - 6}`} />
              <path d={`M${d.x} ${d.y - 16} L${d.x + 10} ${d.y - 16} L${d.x + 10} ${d.y + 4} L${d.x} ${d.y + 4} Z`} className="xw-thin xw-solid" />
              <path d={`M${d.x + 30} ${d.y - 16} L${d.x + 40} ${d.y - 16} L${d.x + 40} ${d.y + 4} L${d.x + 30} ${d.y + 4} Z`} className="xw-thin xw-solid" />
            </g>
          ))}
        </g>,
      )}

      {/* The round clock. */}
      {P(
        "clock",
        <g className="xw-line">
          <circle cx={1460} cy={430} r={36} className="xw-solid" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return (
              <path
                key={i}
                d={`M${1460 + Math.cos(a) * 28} ${430 + Math.sin(a) * 28} L${1460 + Math.cos(a) * 32} ${430 + Math.sin(a) * 32}`}
                className="xw-thin"
              />
            );
          })}
          <g className="xw-ar-tick">
            <circle cx={1460} cy={430} r={30} fill="none" stroke="none" />
            <path d="M1460 430 L1460 404" className="xw-ar-hand" />
          </g>
        </g>,
      )}

      {/* The treadmill under the window. */}
      {P(
        "treadmill",
        <g className="xw-line">
          <path d="M1620 896 L1940 896 L1960 926 L1600 926 Z" className="xw-solid" />
          <path d="M1600 926 L1960 926 L1960 942 L1600 942 Z" className="xw-solid" />
          <path d="M1624 910 L1936 910" className="xw-ar-belt" />
          <path d="M1904 896 L1880 780 M1940 896 L1916 780" />
          <path d="M1846 770 L1934 770 L1926 800 L1856 800 Z" className="xw-solid" />
          <rect x={1866} y={776} width={52} height={16} className="xw-ar-screen" />
        </g>,
      )}
    </>
  );
}
