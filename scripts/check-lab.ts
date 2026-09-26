/**
 * The developer lab, and the route into the machine.
 *
 *   npm run check:lab
 *
 * Same standard as the other three rooms: no station pointed at a wall, no
 * puzzle you cannot reach, and nothing generated that cannot be played.
 */
import assert from "node:assert/strict";
import {
  LAB,
  LAB_ARRIVAL,
  LAB_ESTABLISH,
  LAB_PUZZLES,
  LAB_SCREENS,
  LAB_STATIONS,
  labPuzzleById,
  labStationById,
} from "../src/lib/lab";
import { frameFor, type Shot } from "../src/lib/world";
import { ROUNDS, STEPS } from "../src/lib/path";

/* The room ---------------------------------------------------------------- */

{
  const ids = LAB_STATIONS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate station id");
  assert.ok(LAB_STATIONS.length > 0, "the lab has nowhere to stand");

  for (const s of LAB_STATIONS) {
    assert.ok(labStationById(s.id), `${s.id} cannot be looked up by its own id`);
    assert.ok(s.name.trim().length > 0, `${s.id} has no name in the HUD`);
    assert.ok(s.blurb.trim().length > 0, `${s.id} has nothing to say`);
  }

  const inside = (shot: Shot, what: string) => {
    assert.ok(
      shot.x >= 0 && shot.x <= LAB.w && shot.y >= 0 && shot.y <= LAB.h,
      `${what} parks the camera outside the room`,
    );
    assert.ok(shot.z > 0, `${what} has a non-positive zoom`);
  };
  for (const s of LAB_STATIONS) inside(s.cam, s.id);
  inside(LAB_ESTABLISH, "the establishing shot");
  inside(LAB_ARRIVAL, "the arrival shot");

  assert.ok(LAB_ARRIVAL.z > LAB_ESTABLISH.z, "the camera does not pull back out of the black");

  for (const [vw, vh] of [
    [1920, 1080],
    [1440, 900],
    [1280, 800],
  ]) {
    const f = frameFor(LAB_ESTABLISH, { w: vw, h: vh }, LAB);
    assert.ok(
      vw / f.z <= LAB.w + 1 && vh / f.z <= LAB.h + 1,
      `the establishing shot frames past the room at ${vw}x${vh}`,
    );
  }

  for (const s of LAB_STATIONS) {
    assert.ok(s.cam.z > LAB_ESTABLISH.z, `${s.id} is wider than the establishing shot`);
  }

  /* What is in it --------------------------------------------------------- */

  const pids = LAB_PUZZLES.map((p) => p.id);
  assert.equal(new Set(pids).size, pids.length, "duplicate puzzle id");
  for (const p of LAB_PUZZLES) {
    assert.ok(labPuzzleById(p.id), `${p.id} cannot be looked up by its own id`);
    assert.ok(p.holds.trim().length > 0, `${p.id} guards nothing`);
    assert.ok(p.name.trim().length > 0, `${p.id} has no name`);
    assert.ok(
      labStationById(p.at),
      `${p.id} is reached from "${p.at}", which is not a station in this room`,
    );
  }

  /* The three screens ------------------------------------------------------ */

  const sids = LAB_SCREENS.map((s) => s.id);
  assert.equal(new Set(sids).size, sids.length, "two screens share an id");
  assert.equal(LAB_SCREENS.length, 3, "the rig is drawn with three screens");
  for (const s of LAB_SCREENS) {
    assert.ok(s.name.trim().length > 0, `screen ${s.id} has no name`);
    assert.ok(s.note.trim().length > 0, `screen ${s.id} has nothing to say`);
  }

  /* The lock --------------------------------------------------------------- */

  assert.ok(ROUNDS >= 1, "the machine opens without a single round being played");
  assert.ok(STEPS >= 4, "a route this short is not worth remembering");
}

console.log(
  `check-lab: OK — ${LAB_STATIONS.length} places to stand, ${LAB_PUZZLES.length} things to open, ` +
    `${LAB_SCREENS.length} screens, ${ROUNDS} rounds of ${STEPS} steps.`,
);
