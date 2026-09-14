import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The text that has to be typed into the upload box, written next to the video.
 *
 * A rendered mp4 is not a post. Somebody still has to write a title, a
 * description and a set of tags for every one of them, and doing that a hundred
 * times by hand is where a hundred-video batch actually dies — the videos exist
 * and none of them get uploaded. Everything here is already in the config: the
 * copy was written for this exact video, so there is nothing to invent.
 *
 * Deliberately plain .txt, one file per video, same name as the mp4. It opens
 * on a phone, and copy-paste out of it works everywhere.
 */

// Hashtags per format and track. Kept short on purpose: a wall of thirty tags
// reads as spam to a viewer and does nothing extra for reach.
const TAGS = {
  en: {
    base: ['#trading', '#forex', '#priceaction'],
    'candle-lesson': ['#candlestick', '#tradingtips'],
    'candle-compare': ['#candlestick', '#learntotrade'],
    'concept-lesson': ['#priceaction', '#smartmoney', '#learntotrade'],
    'buy-or-sell-quiz': ['#tradingquiz', '#technicalanalysis'],
    'named-setup': ['#smartmoney', '#technicalanalysis'],
    'market-map': ['#marketanalysis', '#tradingplan'],
  },
  vi: {
    base: ['#trading', '#forex', '#dautu'],
    'candle-lesson': ['#nennhatban', '#hoctrade'],
    'candle-compare': ['#nennhatban', '#hoctrade'],
    'concept-lesson': ['#phantichkythuat', '#smartmoney', '#hoctrade'],
    'buy-or-sell-quiz': ['#doclenh', '#phantichkythuat'],
    'named-setup': ['#smartmoney', '#phantichkythuat'],
    'market-map': ['#kehoachgiaodich', '#phantichthitruong'],
  },
};

/**
 * Instrument tags, read off the config rather than assumed.
 *
 * The first version hardcoded #xauusd and #gold into the base list, so a WTI
 * video went out tagged as gold. Wrong tags are worse than no tags: they bring
 * an audience that came for something else and leaves immediately, which is the
 * signal the platform actually measures.
 */
const INSTRUMENT_TAGS = [
  [/XAU|GC=F|gold/i, {en: ['#xauusd', '#gold'], vi: ['#xauusd', '#vang']}],
  [/XAG|SI=F|silver/i, {en: ['#xagusd', '#silver'], vi: ['#xagusd', '#bac']}],
  [/WTI|CL=F|oil|crude/i, {en: ['#wti', '#crudeoil'], vi: ['#dautho', '#wti']}],
];

function instrumentTags(cfg, locale) {
  const hay = `${cfg.pair ?? ''} ${cfg.symbol ?? ''}`;
  for (const [re, tags] of INSTRUMENT_TAGS) if (re.test(hay)) return tags[locale] ?? tags.en;
  return [];
}

const DISCLAIMER = {
  en: 'Educational content only. Constructed examples where stated. Not investment advice.',
  vi: 'Chỉ mang tính giáo dục. Ví dụ dựng lại ở những chỗ đã ghi rõ. Không phải lời khuyên đầu tư.',
};

const LABEL = {
  en: {title: 'TITLE', desc: 'DESCRIPTION', tags: 'HASHTAGS', file: 'FILE'},
  vi: {title: 'TIÊU ĐỀ', desc: 'MÔ TẢ', tags: 'HASHTAG', file: 'FILE'},
};

// A last-resort headline per format, when the config carries no written one.
// This is the normal case on the Vietnam track, where a replayed config's
// English title is cleared so the localised copy can take the slot — leaving
// the job id as the only other candidate, and "buy or sell quiz wti 15m" is a
// filename, not a title anybody would click.
const FALLBACK_TITLE = {
  en: {
    'buy-or-sell-quiz': (c) => `Buy or sell? ${c.pair ?? ''} ${c.timeframe ?? ''}`,
    'named-setup': (c) => `${c.pattern?.name ?? 'The setup'} — ${c.pair ?? ''} ${c.timeframe ?? ''}`,
    'market-map': (c) => `${c.pair ?? 'Market'} ${c.timeframe ?? ''} — the levels that matter`,
  },
  vi: {
    'buy-or-sell-quiz': (c) => `Mua hay bán? ${c.pair ?? ''} ${c.timeframe ?? ''}`,
    'named-setup': (c) => `${c.pattern?.name ?? 'Setup'} — ${c.pair ?? ''} ${c.timeframe ?? ''}`,
    'market-map': (c) => `Bản đồ ${c.pair ?? 'thị trường'} ${c.timeframe ?? ''}`,
  },
};

const BIAS = {
  en: {bullish: 'Bias: bullish', bearish: 'Bias: bearish', neutral: 'Bias: neutral'},
  vi: {bullish: 'Thiên hướng: nghiêng mua', bearish: 'Thiên hướng: nghiêng bán',
       neutral: 'Thiên hướng: chưa rõ'},
};

const BODY = {
  en: {
    'buy-or-sell-quiz': 'Structure, then the zones, then three seconds to pick a side.',
    'named-setup': 'Map the structure first. The formation gives the level, confluence gives the timing.',
  },
  vi: {
    'buy-or-sell-quiz': 'Cấu trúc trước, rồi tới các vùng, rồi ba giây để chọn một bên.',
    'named-setup': 'Vẽ cấu trúc ra trước. Mô hình cho mức giá, hợp lưu cho thời điểm.',
  },
};

/**
 * The question a quiz video asks, as its title.
 *
 * Deliberately does NOT name the pattern. The title is the first thing a viewer
 * reads and the pattern name is the answer, so a title like "Hammer — buy or
 * sell?" answers its own question in the feed. The name is in the description
 * and the hashtags, where it can still be searched for without being spoiled.
 */
function quizTitleOf(job, cfg, locale) {
  const vi = locale === 'vi';
  if (job.format === 'candle-compare') {
    const ask = (job.quizAsk === 'right' ? cfg.right : cfg.left)?.name ?? '';
    // Matches the wording on screen, and stays correct for the plural names
    // ("Three Black Crows") that "which one is the ..." breaks on.
    return vi ? `Cái nào là ${ask}?` : `Spot the ${ask}`;
  }
  return vi ? 'Chart này: mua hay bán?' : 'Buy or sell this chart?';
}

/** The headline, taken from whatever the format actually put on screen. */
function titleOf(job, cfg, caption, locale) {
  if (job.quiz) return quizTitleOf(job, cfg, locale);
  if (job.format === 'candle-compare') return cfg.title;
  if (job.format === 'candle-lesson' || job.format === 'concept-lesson') {
    return cfg.pattern?.tagline || caption?.title || job.label;
  }
  const written = caption?.title || cfg.title;
  if (written) return written;
  const build = (FALLBACK_TITLE[locale] ?? FALLBACK_TITLE.en)[job.format];
  return build ? build(cfg).replace(/\s+/g, ' ').trim() : job.label;
}

/**
 * The description, built from the video's own lines.
 *
 * Not generated fresh: a description that says something the video does not is
 * worse than no description, and it is exactly how a channel ends up making a
 * claim it cannot support.
 */
function bodyOf(job, cfg, locale) {
  const out = [];
  if (job.format === 'candle-compare') {
    out.push(cfg.same, cfg.diff);
    out.push(`${cfg.left.name}: ${cfg.left.verdict}`);
    out.push(`${cfg.right.name}: ${cfg.right.verdict}`);
    out.push(cfg.why);
  } else if (job.format === 'concept-lesson') {
    // The rule and its three checks, verbatim. This format exists because the
    // videos held attention without teaching much; the description is the one
    // place the whole rule fits, so the whole rule goes in.
    out.push(cfg.pattern?.rule);
    for (const c of cfg.pattern?.checks ?? []) out.push(`• ${c}`);
  } else if (job.format === 'candle-lesson') {
    out.push(cfg.pattern?.rule);
    if (cfg.stats) {
      out.push(`${cfg.stats.settled} tries, ${cfg.stats.wins} won — R:R ${cfg.stats.rewardRisk}`);
    }
  } else if (job.format === 'market-map') {
    out.push(`${cfg.pair} ${cfg.timeframe}`);
    if (cfg.bias) out.push(`${BIAS[locale]?.[cfg.bias] ?? cfg.bias}`);
    out.push((cfg.zones ?? []).map((z) => z.label).join(' · '));
  } else {
    // On the Vietnam track a replayed config's English hook is cleared so the
    // localised copy can take the slot, which left these two formats with a
    // description that only repeated the title. One written line per format
    // beats a blank.
    out.push(cfg.hook || (BODY[locale] ?? BODY.en)[job.format]);
    if (cfg.pair) out.push(`${cfg.pair} ${cfg.timeframe ?? ''}`.trim());
  }
  return out.filter(Boolean);
}

export function writeUploadNote(engineDir, videoPath, job, cfg, caption) {
  const locale = job.locale ?? cfg.locale ?? 'en';
  const L = LABEL[locale] ?? LABEL.en;
  const t = TAGS[locale] ?? TAGS.en;
  const tags = [...(t[job.format] ?? []), ...instrumentTags(cfg, locale), ...t.base].join(' ');

  const text = [
    `${L.file}: ${videoPath.split('/').pop()}`,
    '',
    `${L.title}:`,
    titleOf(job, cfg, caption, locale),
    '',
    `${L.desc}:`,
    ...bodyOf(job, cfg, locale),
    '',
    DISCLAIMER[locale] ?? DISCLAIMER.en,
    '',
    `${L.tags}:`,
    tags,
    '',
  ].join('\n');

  const out = join(engineDir, videoPath.replace(/\.mp4$/, '.txt'));
  writeFileSync(out, text, 'utf8');
  return out;
}
