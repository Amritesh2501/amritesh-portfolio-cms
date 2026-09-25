/**
 * The office, its patch panel and its backlog board.
 *
 *   npm run check:office
 *
 * Same standard as the other two rooms: no station pointed at a wall, no
 * puzzle you cannot reach, and — for the two new games — nothing generated
 * that cannot be played. Every failure below reads as the game being broken
 * rather than as a bug, which is why none of it is trusted.
 */
import assert from "node:assert/strict";
import {
  OFFICE,
  OFFICE_ARRIVAL,
  OFFICE_ESTABLISH,
  OFFICE_PUZZLES,
  OFFICE_STATIONS,
  officePuzzleById,
  officeStationById,
} from "../src/lib/office";
import { frameFor, type Shot } from "../src/lib/world";
import {
  LEFT_X,
  PANEL_SIZE,
  PANEL_H,
  PANEL_W,
  RIGHT_X,
  ROW,
  SNAP,
  STRANDS,
  isPatched,
  joins,
  makePanel,
  rowY,
  strandById,
} from "../src/lib/wires";
import {
  COLS,
  KINDS,
  ROWS,
  TARGET,
  findMatches,
  hasMove,
  isLegal,
  makeBoard,
  settle,
  swapped,
} from "../src/lib/match3";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/* The room ---------------------------------------------------------------- */

{
  const ids = OFFICE_STATIONS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate station id");
  assert.ok(OFFICE_STATIONS.length > 0, "the office has nowhere to stand");

  for (const s of OFFICE_STATIONS) {
    assert.ok(officeStationById(s.id), `${s.id} cannot be looked up by its own id`);
    assert.ok(s.name.trim().length > 0, `${s.id} has no name in the HUD`);
    assert.ok(s.blurb.trim().length > 0, `${s.id} has nothing to say`);
  }

  const inside = (shot: Shot, what: string) => {
    assert.ok(
      shot.x >= 0 && shot.x <= OFFICE.w && shot.y >= 0 && shot.y <= OFFICE.h,
      `${what} parks the camera outside the room`,
    );
    assert.ok(shot.z > 0, `${what} has a non-positive zoom`);
  };
  for (const s of OFFICE_STATIONS) inside(s.cam, s.id);
  inside(OFFICE_ESTABLISH, "the establishing shot");
  inside(OFFICE_ARRIVAL, "the arrival shot");

  assert.ok(
    OFFICE_ARRIVAL.z > OFFICE_ESTABLISH.z,
    "the camera does not pull back out of the black",
  );

  for (const [vw, vh] of [
    [1920, 1080],
    [1440, 900],
    [1280, 800],
  ]) {
    const f = frameFor(OFFICE_ESTABLISH, { w: vw, h: vh }, OFFICE);
    assert.ok(
      vw / f.z <= OFFICE.w + 1 && vh / f.z <= OFFICE.h + 1,
      `the establishing shot frames past the room at ${vw}x${vh}`,
    );
  }

  for (const s of OFFICE_STATIONS) {
    assert.ok(
      s.cam.z > OFFICE_ESTABLISH.z,
      `${s.id} is wider than the establishing shot`,
    );
  }

  const pids = OFFICE_PUZZLES.map((p) => p.id);
  assert.equal(new Set(pids).size, pids.length, "duplicate puzzle id");
  for (const p of OFFICE_PUZZLES) {
    assert.ok(officePuzzleById(p.id), `${p.id} cannot be looked up by its own id`);
    assert.ok(p.holds.trim().length > 0, `${p.id} guards nothing`);
    assert.ok(officeStationById(p.at), `${p.id} is at "${p.at}", which is not a station`);
  }

  // The record is the thing somebody came for and must not be behind a lock.
  assert.ok(officePuzzleById("record"), "there is no personnel file");
}

/* The patch panel --------------------------------------------------------- */

{
  const ids = STRANDS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "two strands share an id");
  for (const s of STRANDS) {
    assert.ok(strandById(s.id), `${s.id} cannot be looked up by its own id`);
    assert.ok(s.name.trim().length > 0, `${s.id} has no name to announce`);
    assert.match(s.hex, /^#[0-9a-f]{6}$/i, `${s.id} is not a hex colour`);
  }

  const r = rng(41);
  for (let i = 0; i < 5000; i++) {
    const panel = makePanel(r);

    assert.equal(panel.left.length, PANEL_SIZE, "the left side is the wrong size");
    assert.equal(panel.right.length, PANEL_SIZE, "the right side is the wrong size");

    // A colour twice on one side means two wires that cannot be told apart.
    assert.equal(new Set(panel.left).size, PANEL_SIZE, "a strand appears twice on the left");
    assert.equal(new Set(panel.right).size, PANEL_SIZE, "a strand appears twice on the right");

    // Every terminal has a partner.
    for (const id of panel.left) {
      assert.ok(panel.right.includes(id), `${id} is on the left with nothing on the right`);
    }

    // And there is something to do.
    assert.ok(
      !panel.right.every((id, j) => id === panel.left[j]),
      "the panel comes out already patched",
    );

    // Solvable: joining every strand to itself patches it, and not before.
    assert.ok(isPatched(panel, [...panel.left]), "patching every strand does not finish the panel");
    assert.ok(!isPatched(panel, panel.left.slice(0, -1)), "the panel finishes a strand early");
  }

  assert.ok(joins("red", "red"));
  assert.ok(!joins("red", "blue"));
}

/* The backlog board -------------------------------------------------------- */

{
  assert.ok(KINDS >= 4, "too few kinds of ticket to be a board");
  assert.ok(COLS >= 5 && ROWS >= 5, "the board is too small to cascade");
  assert.ok(TARGET > 0, "nothing to clear");

  const r = rng(73);
  for (let i = 0; i < 600; i++) {
    const b = makeBoard(r);

    assert.equal(b.length, COLS * ROWS, "the board is the wrong size");
    for (const v of b) {
      assert.ok(Number.isInteger(v) && v >= 0 && v < KINDS, `a cell holds ${v}`);
    }

    // A board that arrives with a match on it resolves itself and hands out
    // points nobody earned.
    assert.equal(findMatches(b).size, 0, "the board starts with a match already on it");

    // A board with no legal move is a grid somebody stares at.
    assert.ok(hasMove(b), "the board starts with no move available");
  }
}

/* Playing it -------------------------------------------------------------- */

{
  const r = rng(11);

  // A legal swap really does make a match, and an illegal one really does not.
  for (let i = 0; i < 300; i++) {
    const b = makeBoard(r);
    for (let j = 0; j < b.length; j++) {
      const c = j % COLS;
      if (c + 1 >= COLS) continue;
      if (isLegal(b, j, j + 1)) {
        assert.ok(findMatches(swapped(b, j, j + 1)).size > 0, "a legal swap makes no match");
      } else {
        assert.equal(findMatches(swapped(b, j, j + 1)).size, 0, "an illegal swap makes a match");
      }
    }
  }

  // A full game terminates. Play the first legal move, cascade to a stop,
  // repeat: if this cannot reach the target the board is unplayable.
  let reached = 0;
  for (let i = 0; i < 120; i++) {
    let board = makeBoard(r);
    let cleared = 0;
    let moves = 0;

    while (cleared < TARGET && moves < 300) {
      let a = -1;
      let b2 = -1;
      for (let j = 0; j < board.length && a < 0; j++) {
        const c = j % COLS;
        const row = Math.floor(j / COLS);
        if (c + 1 < COLS && isLegal(board, j, j + 1)) {
          a = j;
          b2 = j + 1;
        } else if (row + 1 < ROWS && isLegal(board, j, j + COLS)) {
          a = j;
          b2 = j + COLS;
        }
      }
      if (a < 0) break;

      board = swapped(board, a, b2);
      moves++;

      for (let pass = 0; pass < 60; pass++) {
        const step = settle(board, r);
        board = step.board;
        cleared += step.cleared;
        if (step.cleared === 0) break;
      }

      assert.equal(board.length, COLS * ROWS, "settling changed the size of the board");
      for (const v of board) {
        assert.ok(v >= 0 && v < KINDS, "settling left a hole in the board");
      }
    }

    if (cleared >= TARGET) reached++;
  }

  assert.ok(
    reached > 100,
    `only ${reached} of 120 games reached the target, so the board is not reliably finishable`,
  );
}

/* ---------------------------------------------------------------------------
   The panel is dragged, so its geometry has to hold

   A dropped cable end goes to the nearest free socket within SNAP. Two things
   break that, and neither shows up as a type error or as a failed render — the
   panel simply connects the wrong pair and reads as cheating:

     - sockets closer together than the snap radius, which happens the moment
       somebody adds a seventh strand without making the panel taller;
     - the two columns close enough that a drop meant for one side lands on the
       other.
   ------------------------------------------------------------------------- */
{
  assert.ok(
    ROW > SNAP,
    `sockets are ${ROW.toFixed(1)} apart and the snap radius is ${SNAP}, so a drop ` +
      `between two of them can land on either`,
  );
  assert.ok(
    RIGHT_X - LEFT_X > SNAP * 2,
    "the two columns are close enough that a drop can reach the side it came from",
  );
  // And the whole run of sockets has to be inside the panel it is drawn in.
  assert.ok(rowY(0) > 0, "the top socket is off the panel");
  assert.ok(rowY(PANEL_SIZE - 1) < PANEL_H, "the bottom socket is off the panel");
  assert.ok(LEFT_X > 0 && RIGHT_X < PANEL_W, "a column of sockets is off the panel");
}

console.log(
  `check-office: OK — ${OFFICE_STATIONS.length} places to stand, ${OFFICE_PUZZLES.length} things to open, ` +
    `5000 panels, 600 boards, 120 games played through, ` +
    `${PANEL_SIZE} sockets ${ROW.toFixed(0)} apart with a ${SNAP} snap.`,
);
