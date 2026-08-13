/**
 * The channel mark, in one place.
 *
 * It was hardcoded per format and drifted: the quiz said "XAU DAILY" while the
 * lesson and the map said "XAU LAB", so a viewer meeting two of our videos met
 * two channels. Worse, one format once carried a *reference channel's* initials,
 * copied along with its layout — the layout is fair to study, the mark is not
 * ours to reuse. Importing it from here makes both mistakes impossible to repeat
 * quietly.
 */
export const CHANNEL_MARK = 'XAU LAB';
