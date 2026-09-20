"use client";

import Image from "next/image";

/**
 * The investigation room, as a photograph.
 *
 * A still is one plane, and the brief wants a camera that moves through a
 * room, so the depth here comes from three things rather than from faking
 * per-object parallax:
 *
 *   1. The camera itself — panning and pushing in across a frame much larger
 *      than the viewport is most of the effect, and it is the honest part.
 *   2. One genuine foreground plane, below.
 *   3. A lens pass — vignette, grain, and a warm/cold grade — locked to the
 *      viewport rather than the room, so it reads as the thing you are
 *      looking THROUGH instead of another thing in the room.
 *
 * What is deliberately NOT done is slicing the picture into cut-out objects.
 * Every copied region shows its own edge the moment it moves away from what
 * is painted underneath it, and a shelf with a faint second shelf sliding out
 * from behind it is far worse than a shelf that simply sits still.
 */

const SRC = "/files/office.webp";

/**
 * The file is stored at twice the scene box.
 *
 * The scene is measured in the frame’s own 1672x941 pixels, but the camera
 * pushes to nearly 3x on a wide monitor, and a 1x file at 3x is mush. Storing
 * 2x does not invent detail, but it does mean the browser is resampling from
 * something much closer to what it is being asked to draw.
 */
const INTRINSIC = { w: 3344, h: 1882 };

/** The room. */
export function OfficePlate() {
  return (
    <Image
      src={SRC}
      alt=""
      width={INTRINSIC.w}
      height={INTRINSIC.h}
      priority
      // The camera pushes past 1:1, so let it decode at full size rather than
      // letting the optimiser pick a width for a viewport that is not how
      // this image is used.
      unoptimized
      className="fg-plate-img"
      draggable={false}
    />
  );
}

/**
 * The one true parallax plane: the front edge of the desk.
 *
 * Clipped from the same photograph and pushed to a nearer depth, so it tracks
 * faster than the room behind it. This strip is chosen because it is almost
 * pure shadow — the bottom of the frame is desk edge and dark floor — so the
 * doubling that would give the trick away anywhere else has nothing in it to
 * show.
 */
export function OfficeForeground() {
  return (
    <div className="fg-office-fore" aria-hidden>
      <Image
        src={SRC}
        alt=""
        width={INTRINSIC.w}
        height={INTRINSIC.h}
        unoptimized
        className="fg-plate-img"
        draggable={false}
      />
    </div>
  );
}

/**
 * The lens: vignette, grade and grain, fixed to the viewport.
 *
 * Grain does more for "photographed at night" than any amount of extra
 * geometry, and it is also what hides the softness of pushing a 1672px frame
 * past its own resolution.
 */
export function OfficeLens() {
  return (
    <div className="fg-lens" aria-hidden>
      <svg className="fg-lens-grain" aria-hidden>
        <filter id="fg-lens-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="3"
            seed="11"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#fg-lens-noise)" />
      </svg>
    </div>
  );
}
