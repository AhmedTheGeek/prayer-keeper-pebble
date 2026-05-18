# Design Brief — Prayer Keeper (Rebble Store Submission)

**To:** Claude Design
**From:** Ahmed Hussein
**Project:** Prayer Keeper — Pebble smartwatch app
**Asks:** (1) App icon, (2) Rebble store banner

---

## 1. Context

Prayer Keeper is a glanceable Muslim prayer-times app for Pebble smartwatches, distributed via the Rebble store. The audience is practicing Muslims on the Rebble community — Pebble loyalists who glance at the wrist during routine moments to answer one question: *what is the next prayer, when, and how long until then.*

The brand is **quiet, dependable, considered** — the calm of a well-made pocket watch, not the flash of a notification badge. The full design system lives in `DESIGN.md`; the audience and brand notes in `PRODUCT.md`. Please skim both before sketching — they're short and they're the source of truth.

## 2. Deliverables

### A. App icon

Required sizes (Pebble + Rebble store):

| Use | Size | Format |
|---|---|---|
| Watch menu icon | 25×25 px | PNG, 1-bit-safe |
| App tile / menu | 48×48 px | PNG, 1-bit-safe |
| Rebble store listing | 144×144 px | PNG, color OK |
| Master / high-res source | 1024×1024 px | PNG with transparency + SVG |

**Critical:** the 25×25 and 48×48 variants must read at 1-bit (pure black + pure white, no anti-aliasing assumed) — these render on Aplite and Diorite hardware. The 144 and 1024 versions can use the full Adhan palette.

### B. Rebble store banner

- **Size:** 720×320 px (Rebble featured-banner standard)
- **Format:** PNG, color, no transparency
- Title lockup ("Prayer Keeper") + one-line tagline + a hint of the watch UI is welcome but optional. If type is used, it must be set in the OS system stack equivalent — no decorative or display faces.

## 3. Visual direction

### Mood

The wrist adhan, not a phone app shrunk down. Restrained. The icon should feel like it belongs next to a stopwatch or compass on a utility watch — not next to Muslim Pro or Athan Pro.

### Palette

Pull only from the system tokens in `DESIGN.md`:

- **Ink** `#0a0d0a` — primary mark
- **Paper** `#f6f4ef` — background on color surfaces
- **Adhan Green** `#00b85e` — the *one* accent, used sparingly to mark "alive"
- **Adhan Green Deep** `#0a4a23` — for filled regions where green needs to recede

The Living-Green Rule applies to the marketing surfaces too: green is reserved for one element. Don't tint the whole icon green; don't gradient-wash the banner. One green moment.

### Form

Open to interpretation, but strong candidates:

- An abstract mark that reads as a **countdown / arc / horizon** (the moment before a prayer enters). A 12-o'clock-style indicator angling toward a target works.
- A **silhouette of a minaret or mihrab arch** rendered with the same geometric restraint as a transit-system pictogram — flat, single-weight, no ornament.
- A **crescent + tick / arc** that doubles as a time indicator. Avoid the literal "moon over mosque" cliché.

Whichever direction: it must survive being rasterized to 25×25 at 1-bit. If the form falls apart at that size, it's wrong.

### Typography (banner only)

- Wordmark: a neutral geometric sans (Inter, Söhne, or system-ui). No display faces, no ornamental letterforms, no Arabic-style Latin substitution.
- Tagline candidate: *"The next prayer, on your wrist."*

## 4. Anti-patterns (do not do)

These are pulled straight from `DESIGN.md` and `PRODUCT.md`. Quote-worthy bans:

- **No emoji.** Not in the icon, not in the banner. (The current store description has emoji; the visual marks must not.)
- **No gradients.** No `linear-gradient`, no radial wash, no green-to-deep-green sky. Flat fills only.
- **No drop shadows or glows.** Not on the icon, not under wordmarks, not on the watch render in the banner.
- **No decorative Arabic calligraphy** as ornament. If Arabic script appears at all (it doesn't have to), it must be functional — e.g., the word "Salat" set cleanly, not as a flourish.
- **No "moon + mosque + stars + sparkle" stack.** That's the phone-prayer-app aesthetic this product explicitly rejects.
- **No second accent color.** No gold, no warm red, no holy purple. The palette is ink, paper, green. Period.
- **No skeuomorphic watch frame** in the banner unless it's a true 1:1 Pebble silhouette (Aplite / Time / Time Round / Time 2 / Emery shapes are fine if accurate).
- **No phone mockup.** The phone settings page is configuration, not a brand surface.

## 5. References for tone

- **Yes:** Apple's first-party utilities (Compass, Voice Memos) at icon size. Citymapper's transit-pictogram clarity. The London Underground roundel — a wordmark wrapped in geometry, nothing more.
- **No:** Muslim Pro, Athan Pro, Ramadan Legacy, and any icon featuring a stylized green dome with rays of light behind it.

## 6. Process

1. **Round 1:** 3–4 thumbnail directions for the icon (1024×1024 master each). No banner yet.
2. **Pick one direction** with Ahmed.
3. **Round 2:** the chosen direction rendered at all four icon sizes (25, 48, 144, 1024) + banner v1 using the same mark.
4. **Round 3:** banner polish only.

## 7. Source material

- `DESIGN.md` — full design system (palette, type, do/don'ts)
- `PRODUCT.md` — audience, brand personality, anti-references
- `resources/images/app_icon.png` — current placeholder (the dark-brown mihrab-with-figure mark). Treat as superseded, not a reference.
- `store_assets/store_icon_original.png` — same mark, also superseded.
- `store_assets/screenshots/` — real watch UI screenshots for the banner background, if useful.

## 8. Definition of done

- All four icon sizes delivered + 1024 master + SVG source.
- Banner at 720×320 delivered as PNG, with editable source (Figma or SVG).
- The 25×25 icon, printed on paper and held at arm's length, is unambiguously recognizable as the same mark as the 1024.
- Nothing in either asset violates a "Don't" in `DESIGN.md` §6.

— Brief ends.
