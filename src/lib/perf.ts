/**
 * Whether the pre-paint grader in the root layout marked this device as
 * low-power. See GRADE_DEVICE there for what feeds the decision.
 *
 * Read from the DOM rather than recomputed, so the CSS and the JavaScript can
 * never disagree about which page the visitor is on.
 */
export function isLowPower() {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.perf === "low";
}
