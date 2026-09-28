/**
 * The college archive, the locked archives and the training facility.
 *
 *   npm run check:archives
 *
 * Same standard as the other rooms, plus the one thing only these can check
 * because their props carry hit boxes: standing at a prop's station puts the
 * prop on screen. A prop you walk to and then cannot see is a room that looks
 * broken, and nothing would throw.
 */
import assert from "node:assert/strict";
import { ARCHIVE, ARCHIVES, ARCHIVE_ESTABLISH, type Box } from "../src/lib/archives";
import { frameFor, type Shot } from "../src/lib/world";

const VIEWS = [
  [1920, 1080],
  [1440, 900],
  [1280, 800],
] as const;

const inside = (shot: Shot, what: string) => {
  assert.ok(
    shot.x >= 0 && shot.x <= ARCHIVE.w && shot.y >= 0 && shot.y <= ARCHIVE.h,
    `${what} parks the camera outside the room`,
  );
  assert.ok(shot.z > 0, `${what} has a non-positive zoom`);
};

const within = (b: Box, outer: Box) =>
  b.x >= outer.x && b.y >= outer.y && b.x + b.w <= outer.x + outer.w && b.y + b.h <= outer.y + outer.h;

assert.equal(new Set(ARCHIVES.map((a) => a.id)).size, ARCHIVES.length, "two archives share an id");
inside(ARCHIVE_ESTABLISH, "the establishing shot");

for (const [vw, vh] of VIEWS) {
  const f = frameFor(ARCHIVE_ESTABLISH, { w: vw, h: vh }, ARCHIVE);
  assert.ok(
    vw / f.z <= ARCHIVE.w + 1 && vh / f.z <= ARCHIVE.h + 1,
    `the establishing shot frames past the room at ${vw}x${vh}`,
  );
}

let props = 0;
for (const room of ARCHIVES) {
  const r = room.id;
  const sids = room.stations.map((s) => s.id);
  assert.equal(new Set(sids).size, sids.length, `${r}: duplicate station id`);
  assert.equal(
    new Set(room.props.map((p) => p.id)).size,
    room.props.length,
    `${r}: duplicate prop id`,
  );

  inside(room.arrival, `${r}: the arrival shot`);
  assert.ok(room.arrival.z > ARCHIVE_ESTABLISH.z, `${r}: the camera does not pull back out of the black`);
  assert.match(room.bulb, /^#[0-9a-f]{6}$/i, `${r}: the bulb is not a hex colour`);
  assert.ok(room.pendants.length > 0, `${r}: no ceiling light`);
  assert.ok(room.shelves.length > 0, `${r}: no shelf to light`);
  assert.ok(within(room.glass, { x: 420, y: 320, w: 1576, h: 628 }), `${r}: the window is off the back wall`);

  for (const s of room.stations) {
    inside(s.cam, `${r}/${s.id}`);
    assert.ok(s.cam.z > ARCHIVE_ESTABLISH.z, `${r}/${s.id} is wider than the establishing shot`);
    assert.ok(s.blurb.trim() && s.name.trim(), `${r}/${s.id} has nothing to say`);
    assert.ok(
      room.props.some((p) => p.at === s.id),
      `${r}/${s.id} is a station with nothing to use at it`,
    );
  }

  const locks = room.props.filter((p) => p.locked);
  assert.ok(locks.length <= 1, `${r}: more than one lock is a corridor of puzzles`);
  for (const p of locks) assert.ok(p.shows, `${r}/${p.id} is locked and guards nothing`);

  for (const p of room.props) {
    props++;
    const station = room.stations.find((s) => s.id === p.at);
    assert.ok(station, `${r}/${p.id} is reached from "${p.at}", which is not a station`);
    assert.ok(p.name.trim() && p.note.trim(), `${r}/${p.id} has no name or says nothing`);
    assert.ok(
      within(p.hit, { x: 0, y: 0, w: ARCHIVE.w, h: ARCHIVE.h }),
      `${r}/${p.id} has a hit box outside the room`,
    );

    // Standing at its station, the prop's centre is on screen, at every size.
    const cx = p.hit.x + p.hit.w / 2;
    const cy = p.hit.y + p.hit.h / 2;
    for (const [vw, vh] of VIEWS) {
      const f = frameFor(station.cam, { w: vw, h: vh }, ARCHIVE);
      const hw = vw / (2 * f.z);
      const hh = vh / (2 * f.z);
      assert.ok(
        Math.abs(cx - f.x) <= hw && Math.abs(cy - f.y) <= hh,
        `${r}/${p.id} is off screen from its own station at ${vw}x${vh}`,
      );
    }
  }
}

console.log(`check-archives: OK — ${ARCHIVES.length} rooms, ${props} props, every one on screen from its station.`);
