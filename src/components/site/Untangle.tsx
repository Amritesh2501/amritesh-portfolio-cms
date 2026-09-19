"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LEVELS, buildBoard, countCrossings } from "@/lib/untangle";

/**
 * Untangle: drag the nodes until no two wires cross.
 *
 * The geometry and the board generation live in lib/untangle, because the one
 * property that matters (every board is solvable) is worth a test rather than
 * trust, and a "use client" component is the wrong place to put anything a
 * test needs to reach. See scripts/check-untangle.ts.
 *
 * Coordinates are a 0..1 unit square, so the board is resolution independent:
 * the SVG viewBox scales it and nothing recalculates on resize.
 *
 * onSolved is how the world outside hears about a clean board: the gate in the
 * experiments world is locked on the first one. It fires once per board rather
 * than on every render, because "solved" is derived from the node positions
 * and stays true for as long as the player leaves them alone.
 */
export function Untangle({ onSolved }: { onSolved?: (level: number) => void } = {}) {
  const [level, setLevel] = useState(0);
  const [board, setBoard] = useState(() => buildBoard(0));
  const [dragging, setDragging] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const crossings = useMemo(
    () => countCrossings(board.nodes, board.edges),
    [board],
  );

  const solved = crossings === 0;

  const firedFor = useRef(-1);
  useEffect(() => {
    if (!solved || firedFor.current === level) return;
    firedFor.current = level;
    onSolved?.(level);
  }, [solved, level, onSolved]);

  /** Pointer position as 0..1 of the board, clamped inside it. */
  const toBoard = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.min(0.96, Math.max(0.04, (clientX - rect.left) / rect.width)),
      y: Math.min(0.96, Math.max(0.04, (clientY - rect.top) / rect.height)),
    };
  }, []);

  useEffect(() => {
    if (dragging === null) return;

    const onMove = (e: PointerEvent) => {
      const point = toBoard(e.clientX, e.clientY);
      if (!point) return;
      setBoard((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === dragging ? { ...n, ...point } : n)),
      }));
    };
    const onUp = () => {
      setDragging(null);
      setMoves((m) => m + 1);
    };

    // On window, not the node: a fast drag outruns the pointer and the node
    // would be dropped the moment the cursor left its 22px circle.
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, toBoard]);

  /** Keyboard: nudge the selected node. The whole game is drag, so this is the
   *  only way it is playable without a pointer at all. */
  const nudge = (id: number, dx: number, dy: number) => {
    setBoard((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              x: Math.min(0.96, Math.max(0.04, n.x + dx)),
              y: Math.min(0.96, Math.max(0.04, n.y + dy)),
            }
          : n,
      ),
    }));
  };

  const reset = (next: number) => {
    // Re-arms onSolved, so shuffling a solved board and clearing it again
    // reports a fresh win rather than being swallowed as a repeat.
    firedFor.current = -1;
    setLevel(next);
    setBoard(buildBoard(next));
    setMoves(0);
  };

  return (
    <div className="untangle">
      <div className="untangle-hud">
        <span className="t-meta">
          Board {level + 1} of {LEVELS.length}
        </span>
        <span
          className="t-meta tabular-nums"
          role="status"
          aria-live="polite"
        >
          {solved ? "Untangled" : `${crossings} crossing${crossings === 1 ? "" : "s"}`}
        </span>
        <span className="t-meta tabular-nums">{moves} moves</span>
      </div>

      <svg
        ref={svgRef}
        className={`untangle-board ${solved ? "is-solved" : ""}`}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="application"
        aria-label="Untangle the wires. Drag each node, or focus one and use the arrow keys."
      >
        {board.edges.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            x1={board.nodes[a].x * 100}
            y1={board.nodes[a].y * 100}
            x2={board.nodes[b].x * 100}
            y2={board.nodes[b].y * 100}
            className="untangle-wire"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {board.nodes.map((node) => (
          <circle
            key={node.id}
            cx={node.x * 100}
            cy={node.y * 100}
            r="2.2"
            className={`untangle-node ${dragging === node.id ? "is-held" : ""}`}
            vectorEffect="non-scaling-stroke"
            tabIndex={0}
            role="button"
            aria-label={`Node ${node.id + 1}`}
            onPointerDown={(e) => {
              e.preventDefault();
              setDragging(node.id);
            }}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 0.08 : 0.02;
              const map: Record<string, [number, number]> = {
                ArrowLeft: [-step, 0],
                ArrowRight: [step, 0],
                ArrowUp: [0, -step],
                ArrowDown: [0, step],
              };
              const move = map[e.key];
              if (!move) return;
              e.preventDefault();
              nudge(node.id, move[0], move[1]);
            }}
          />
        ))}
      </svg>

      <div className="untangle-foot">
        {solved ? (
          level < LEVELS.length - 1 ? (
            <button type="button" className="btn btn-solid" onClick={() => reset(level + 1)}>
              Next board
            </button>
          ) : (
            <p className="text-[0.9375rem] text-[var(--xp-dim)]">
              All three clear. That is the whole of it for now.
            </p>
          )
        ) : (
          <p className="text-[0.9375rem] text-[var(--xp-dim)]">
            Drag the nodes until no two wires cross.
          </p>
        )}
        <button type="button" className="btn btn-sm" onClick={() => reset(level)}>
          Shuffle
        </button>
      </div>
    </div>
  );
}
