/**
 * Feedback loop: leg-end modal is gated on !isAnimating.
 * After the final pyramid die animates, isAnimating must become false
 * so CamelUpLegEndModal can show.
 *
 * Reproduces useCamelTrackAnimation's wouldAnimateTrack / isAnimating
 * against camelUpTrackMove helpers (inlined).
 *
 * Expect: RED while bug exists (post-animation isAnimating stuck true).
 */

const CAMEL_UP_TRACK_LENGTH = 16;
const CAMEL_UP_COLORS = ['white', 'yellow', 'orange', 'green', 'blue'];

function isInitialLegTrack(track) {
  const colors = track[1]?.colors ?? [];
  if (colors.length !== CAMEL_UP_COLORS.length) return false;
  const onStart = new Set(colors);
  return CAMEL_UP_COLORS.every((color) => onStart.has(color));
}

function extractMovingStack(track, color) {
  for (let space = 1; space <= CAMEL_UP_TRACK_LENGTH; space += 1) {
    const stack = track[space]?.colors ?? [];
    const colorIndex = stack.indexOf(color);
    if (colorIndex === -1) continue;
    return {
      fromSpace: space,
      staying: stack.slice(0, colorIndex),
      moving: stack.slice(colorIndex),
    };
  }
  return null;
}

function buildCamelMovePath(fromSpace, dieValue, desertTiles) {
  const path = [fromSpace];
  let current = fromSpace;
  const pushSpace = (space) => {
    if (path[path.length - 1] !== space) path.push(space);
  };
  for (let step = 0; step < dieValue; step += 1) {
    current = Math.min(current + 1, CAMEL_UP_TRACK_LENGTH);
    pushSpace(current);
  }
  const desert = desertTiles.find((tile) => tile.space === current);
  if (desert) {
    const extra = desert.effect === 'oasis' ? 1 : -1;
    const next = Math.max(1, Math.min(current + extra, CAMEL_UP_TRACK_LENGTH));
    pushSpace(next);
  }
  return path;
}

function tracksEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Mirrors useCamelTrackAnimation.wouldAnimateTrack (no reduced-motion). */
function wouldAnimateTrack(prevTrack, track, lastRoll, desertTiles) {
  if (tracksEqual(prevTrack, track)) return false;
  if (isInitialLegTrack(track)) return false;
  if (!lastRoll) return false;
  const extracted = extractMovingStack(prevTrack, lastRoll.color);
  if (!extracted) return false;
  const path = buildCamelMovePath(extracted.fromSpace, lastRoll.value, desertTiles);
  return path.length > 1;
}

/**
 * Exact copy of isAnimating when movingStack === null (post-finalize / idle).
 * Bug: after animation, prevTrackRef === final track, but wouldAnimateTrack
 * still returns true because it re-projects the roll from the *new* space.
 */
function isAnimatingIdle(prevTrackRef, track, lastRoll, desertTiles) {
  const movingStack = null;
  return movingStack !== null || wouldAnimateTrack(prevTrackRef, track, lastRoll, desertTiles);
}

// --- Scenario: 5th die rolled, camel blue moves 3→5, leg enters scoring ---
const before = {
  1: { colors: ['white', 'yellow'] },
  3: { colors: ['orange', 'blue'] },
  7: { colors: ['green'] },
};
const after = {
  1: { colors: ['white', 'yellow'] },
  3: { colors: ['orange'] },
  5: { colors: ['blue'] },
  7: { colors: ['green'] },
};
const lastRoll = { color: 'blue', value: 2, legEnded: false };
const desertTiles = [];

// During pending animation (new state arrived, effect not finalized):
const pending = isAnimatingIdle(before, after, lastRoll, desertTiles);
// After animation finalize: prevTrackRef = after, track = after, lastRoll still set
const afterAnim = isAnimatingIdle(after, after, lastRoll, desertTiles);

const showLegEndModal = (phase, legScoringSummary, isAnimating) =>
  phase === 'leg_scoring' && Boolean(legScoringSummary) && !isAnimating;

const modalDuringPending = showLegEndModal('leg_scoring', { endedLeg: 1 }, pending);
const modalAfterAnim = showLegEndModal('leg_scoring', { endedLeg: 1 }, afterAnim);

console.log(
  JSON.stringify(
    {
      pendingIsAnimating: pending,
      afterAnimIsAnimating: afterAnim,
      modalDuringPending,
      modalAfterAnim,
      expected: {
        pendingIsAnimating: true,
        afterAnimIsAnimating: false,
        modalDuringPending: false,
        modalAfterAnim: true,
      },
    },
    null,
    2,
  ),
);

const pass =
  pending === true &&
  afterAnim === false &&
  modalDuringPending === false &&
  modalAfterAnim === true;

if (!pass) {
  console.error(
    '\nFAIL: after final die animation, isAnimating stayed true → leg-end modal hidden',
  );
  process.exit(1);
}

console.log('\nPASS: leg-end modal can show after animation');
process.exit(0);
