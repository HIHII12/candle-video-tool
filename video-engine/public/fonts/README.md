# Fonts

Two faces, both under the SIL Open Font License 1.1, which permits bundling and
redistribution with the videos:

- **Inter** — Rasmus Andersson. Body copy and labels. Variable file, latin subset.
- **Archivo Black** — Omnibus-Type. Headlines and prices. Latin subset.

These `.woff2` files are the source of truth. `src/fontData.ts` is generated from
them by `node scripts/embed_fonts.mjs` and is what the render actually loads —
see `src/fonts.ts` for why the bytes are inlined rather than fetched.

Re-run the script only when swapping a typeface.
