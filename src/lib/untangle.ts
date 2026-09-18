export type Node = { id: number; x: number; y: number };
export type Edge = [number, number];
export type Board = { nodes: Node[]; edges: Edge[]; solved: Node[] };

export const LEVELS = [
  { nodes: 6, extra: 2 },
  { nodes: 8, extra: 3 },
  { nodes: 10, extra: 4 },
];

/**
 * Does segment ab cross segment cd? Segments sharing an endpoint do not count.
 *
 * Strict crossing only: collinear overlap is treated as untangled. It is
 * invisible to the player, and counting it makes a board that looks solved
 * refuse to be.
 */
export function crosses(a: Node, b: Node, c: Node, d: Node) {
  if (a.id === c.id || a.id === d.id || b.id === c.id || b.id === d.id) return false;

  const side = (p: Node, q: Node, r: Node) =>
    Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));

  const d1 = side(a, b, c);
  const d2 = side(a, b, d);
  const d3 = side(c, d, a);
  const d4 = side(c, d, b);

  return d1 !== d2 && d3 !== d4 && d1 !== 0 && d2 !== 0 && d3 !== 0 && d4 !== 0;
}

export function countCrossings(nodes: Node[], edges: Edge[]) {
  let n = 0;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const [a, b] = edges[i];
      const [c, d] = edges[j];
      if (crosses(nodes[a], nodes[b], nodes[c], nodes[d])) n++;
    }
  }
  return n;
}

/**
 * Builds a board that is provably winnable.
 *
 * The nodes are laid out on a circle and wired so that nothing crosses in THAT
 * arrangement, and only then scattered. A solution is therefore guaranteed to
 * exist, because the layout it was generated from is one. Boards drawn at
 * random are not winnable often enough to put in front of anyone.
 *
 * Coordinates are a 0..1 unit square, so the board is resolution independent.
 */
export function buildBoard(level: number, rnd: () => number = Math.random): Board {
  const { nodes: count, extra } = LEVELS[Math.min(level, LEVELS.length - 1)];

  const solved: Node[] = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    return { id: i, x: 0.5 + Math.cos(angle) * 0.36, y: 0.5 + Math.sin(angle) * 0.36 };
  });

  // The ring itself never crosses.
  const edges: Edge[] = solved.map((_, i) => [i, (i + 1) % count] as Edge);

  // Then chords, each accepted only if it crosses nothing already accepted in
  // the solved layout.
  let attempts = 0;
  while (edges.length < count + extra && attempts < 400) {
    attempts++;
    const a = Math.floor(rnd() * count);
    const b = Math.floor(rnd() * count);
    if (a === b) continue;
    if (edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) continue;
    if (edges.some(([x, y]) => crosses(solved[a], solved[b], solved[x], solved[y]))) {
      continue;
    }
    edges.push([a, b]);
  }

  // Scatter, kept off the very edge so a node is never half under the frame.
  const nodes: Node[] = solved.map((n) => ({
    ...n,
    x: 0.12 + rnd() * 0.76,
    y: 0.12 + rnd() * 0.76,
  }));

  return { nodes, edges, solved };
}
