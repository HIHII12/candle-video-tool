/**
 * Where the platform draws its own interface over ours.
 *
 * A 1080x1920 upload is not 1080x1920 of usable frame. YouTube Shorts lays its
 * title, channel name and progress bar across the bottom, and its like / comment
 * / share column down the right. Anything we put there is not clipped by us — it
 * is simply covered, on every phone, which looks identical to being cut off.
 *
 * A layout check across all four formats found meaningful content inside these
 * bands in every one of them, up to 28% of a frame's content in the candle
 * lesson. These constants exist so that fact is expressed once rather than
 * rediscovered per component.
 *
 * Small print may sit below the line: a disclaimer is required to be present,
 * not to be prominent. Anything the viewer is meant to read must clear it.
 */
export const SAFE = {
  /** Keep meaningful content at least this many px above the bottom edge. */
  bottom: 280,
  /** And this far from the right edge, clear of the action buttons. */
  right: 110,
} as const;
