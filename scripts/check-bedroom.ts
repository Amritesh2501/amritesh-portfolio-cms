/**
 * The properties of the bedroom worth checking rather than trusting.
 *
 *   npm run check:bedroom
 *
 * Same reasoning as check-world: every one of these fails as somebody stuck in
 * a room rather than as an error anybody sees. A station pointed at a wall, a
 * puzzle you cannot reach from anywhere, a shot that frames past the edge of
 * the drawing — none of them throws.
 */
import assert from "node:assert/strict";
import {
  BED_ARRIVAL,
  BED_ESTABLISH,
  BED_PUZZLES,
  BED_STATIONS,
  BEDROOM,
  bedPuzzleById,
  bedStationById,
} from "../src/lib/bedroom";
import { frameFor, type Shot } from "../src/lib/world";

/* Stations ---------------------------------------------------------------- */

{
  const ids = BED_STATIONS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate station id");
  assert.ok(BED_STATIONS.length > 0, "the room has nowhere to stand");

  for (const s of BED_STATIONS) {
    assert.ok(bedStationById(s.id), `${s.id} cannot be looked up by its own id`);
    assert.ok(s.name.trim().length > 0, `${s.id} has no name in the HUD`);
    assert.ok(s.blurb.trim().length > 0, `${s.id} has nothing to say`);
  }

  const inside = (shot: Shot, what: string) => {
    assert.ok(
      shot.x >= 0 && shot.x <= BEDROOM.w && shot.y >= 0 && shot.y <= BEDROOM.h,
      `${what} parks the camera outside the room`,
    );
    assert.ok(shot.z > 0, `${what} has a non-positive zoom`);
  };

  for (const s of BED_STATIONS) inside(s.cam, s.id);
  inside(BED_ESTABLISH, "the establishing shot");
  inside(BED_ARRIVAL, "the arrival shot");

  // The opening is a pull-BACK, the same gesture the case room opens on.
  assert.ok(
    BED_ARRIVAL.z > BED_ESTABLISH.z,
    "the camera does not pull back out of the black",
  );

  // The establishing shot has to cover the room, or the drawing has visible
  // edges on a normal screen.
  for (const [vw, vh] of [
    [1920, 1080],
    [1440, 900],
    [1280, 800],
  ]) {
    const f = frameFor(BED_ESTABLISH, { w: vw, h: vh }, BEDROOM);
    assert.ok(
      vw / f.z <= BEDROOM.w + 1 && vh / f.z <= BEDROOM.h + 1,
      `the establishing shot frames past the room at ${vw}x${vh}`,
    );
  }

  // Every station shot is TIGHTER than the establishing one. A station that
  // shows more of the room than the wide shot is not a place to stand, it is
  // a step backwards.
  for (const s of BED_STATIONS) {
    assert.ok(
      s.cam.z > BED_ESTABLISH.z,
      `${s.id} is wider than the establishing shot`,
    );
  }
}

/* The puzzles ------------------------------------------------------------- */

{
  const ids = BED_PUZZLES.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate puzzle id");
  assert.ok(BED_PUZZLES.length > 0, "the room has nothing in it to open");

  for (const p of BED_PUZZLES) {
    assert.ok(bedPuzzleById(p.id), `${p.id} cannot be looked up by its own id`);
    assert.ok(p.name.trim().length > 0, `${p.id} has no name`);
    assert.ok(p.holds.trim().length > 0, `${p.id} guards nothing`);

    // The one that matters: a puzzle whose station does not exist can never
    // be reached, and nothing would say so.
    assert.ok(
      bedStationById(p.at),
      `${p.id} is at "${p.at}", which is not a station`,
    );
  }

  // Every station is worth walking to: either it holds something, or it is
  // there to be looked at and says so in its blurb. Only the first is checked,
  // because the second cannot be.
  const held = new Set(BED_PUZZLES.map((p) => p.at));
  assert.ok(held.size > 0, "no station holds anything");
}

console.log(
  `check-bedroom: OK — ${BED_STATIONS.length} places to stand, ` +
    `${BED_PUZZLES.length} things to open, room ${BEDROOM.w}x${BEDROOM.h}.`,
);
