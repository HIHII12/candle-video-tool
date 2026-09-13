/**
 * Where the platform draws its own interface over ours.
 *
 * A 1080x1920 upload is not 1080x1920 of usable frame. YouTube Shorts lays its
 * title, channel name and progress bar across the bottom, its like / comment /
 * share column down the right, and a row of chips across the top. Anything we
 * put there is not clipped by us — it is simply covered, on every phone, which
 * looks identical to being cut off.
 *
 * The first version of this file carried only `bottom: 280` and `right: 110`,
 * and no top band at all. Screenshots taken off a real phone on 2026-09-13
 * showed what that cost: the market map's instrument name and timeframe sat
 * under the Shorts chip row, its BSL / GAP / SSL labels ran under the action
 * buttons, and the candle lesson's "Theo doi" call to action — the one element
 * whose entire job is to convert a viewer into a subscriber — was completely
 * hidden behind the caption bar. A layout check with the corrected numbers
 * found up to 31% of a market map frame sitting under platform furniture.
 *
 * Measured from those screenshots, rounded up:
 *
 *   top     the Shorts chip row (Shorts / Kenh dang ky / Phat truc tiep)
 *   right   the like / comment / save / share / remix column
 *   bottom  channel name, caption, sound pill and share bar
 *
 * Small print may sit below the bottom line: a disclaimer is required to be
 * present, not to be prominent, and the description carries it too. Anything
 * the viewer is meant to READ — a title, a level, a call to action — must clear
 * every one of these bands.
 */
export const SAFE = {
  /** Keep meaningful content at least this many px below the top edge. */
  top: 190,
  /** Keep meaningful content at least this many px above the bottom edge. */
  bottom: 390,
  /** And this far from the right edge, clear of the action buttons. */
  right: 130,
} as const;

/** Height of the band a viewer can actually read, between the two lines. */
export const SAFE_HEIGHT = 1920 - SAFE.top - SAFE.bottom;
