---
name: Prayer Keeper
description: Glanceable Muslim prayer times on a Pebble smartwatch
colors:
  ink: "#0a0d0a"
  paper: "#f6f4ef"
  paper-card: "#fffefb"
  adhan-green: "#00b85e"
  adhan-green-deep: "#0a4a23"
  muted-fg: "#7a7d76"
  muted-fg-strong: "#9da19a"
  divider: "#e6e3dc"
  watch-screen: "#000000"
  watch-ink: "#ffffff"
typography:
  watch-display:
    fontFamily: "Bitham"
    fontSize: "30px"
    fontWeight: 900
    lineHeight: "1"
    letterSpacing: "normal"
  watch-title:
    fontFamily: "Gothic"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "1.1"
  watch-body:
    fontFamily: "Gothic"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: "1.2"
  watch-label:
    fontFamily: "Gothic"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "1.2"
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "1.2"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: "1.5"
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "1.4"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "14px 24px"
  card:
    backgroundColor: "{colors.paper-card}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.paper-card}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "12px"
  toggle-on:
    backgroundColor: "{colors.adhan-green}"
    rounded: "{rounded.pill}"
    height: "28px"
    width: "52px"
  toggle-off:
    backgroundColor: "{colors.divider}"
    rounded: "{rounded.pill}"
    height: "28px"
    width: "52px"
  watch-list-row-current:
    backgroundColor: "{colors.adhan-green-deep}"
    textColor: "{colors.watch-ink}"
    typography: "{typography.watch-body}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
---

# Design System: Prayer Keeper

## 1. Overview

**Creative North Star: "The Wrist Adhan"**

Prayer Keeper is the call to prayer on the wrist, not a tiny phone app strapped to it. The whole system is shaped by a single question: can the wearer flick the wrist, get the answer, and put the hand down inside two seconds? Everything that doesn't serve that answer (decoration, ornament, chrome, narrative) is cut. Type carries the moment. Black carries the screen. Green carries the one thing in motion: the count down toward the next prayer.

There are two physical surfaces and they speak in one voice. The watch is a 144 by 168 (or 180 by 180 round, or 200 by 228 on Emery) Pebble screen, button-driven, monochrome on Aplite and Diorite, 64 colors elsewhere. The phone settings page lives inside the Pebble companion app, opened only when the wearer wants to reconfigure. The phone surface inherits the watch's restraint, not the other way around. If the phone page would look at home next to Muslim Pro, it has failed.

This system explicitly rejects two aesthetic lanes. **Phone prayer apps on a wrist**: dense cards, badge counts, daily-quote carousels, ad slots, gradient banners. The watch is not a tiny phone. **Overstyled watchfaces**: decorative dials, ornamental fonts that lose legibility at glance, low-contrast layouts in service of a "look." The data is the design.

**Key Characteristics:**

- Black surface, white type. No ambiguity, no half-tones for mood.
- One semantic accent (Adhan Green) reserved for the one thing in motion.
- Pebble system fonts on the watch; OS system stack on the phone. No custom web fonts, ever.
- Flat everywhere. No shadows, no gradients, no blurs.
- Generous vertical air on the main screen; denser, scannable rows on the list screen.

## 2. Colors: The Adhan Palette

The palette is two channels: a near-monochrome ink-on-paper neutral system that carries every static element, and a single saturated green that marks the active state. Nothing else is colored. Restrained color strategy: the accent appears on under 10% of any given screen, and its rarity is the entire point.

### Primary

- **Adhan Green** (`#00b85e`, oklch ~ 70% 0.18 150): the active state. On the watch, it tints the countdown digits as they tick toward the next prayer. On the phone, it tints the "on" position of toggle switches. It does NOT tint headings, dividers, brand chrome, or call-to-action buttons. It marks "this is alive."
- **Adhan Green Deep** (`#0a4a23`, oklch ~ 35% 0.08 145): the current-prayer row highlight on the watch's list screen. A solid filled rounded rectangle behind the row, white type on top. The deep variant exists so the bright variant can stay reserved for motion.

On color-capable hardware (Basalt, Chalk, Emery), these greens render directly through the Pebble palette quantizer (the watch resolves them to `GColorMediumSpringGreen` for the countdown and `GColorDarkGreen` for the row highlight). On 1-bit hardware (Aplite, Diorite), both fall back to white type without backgrounds. Color never carries the only signal.

### Neutral

- **Ink** (`#0a0d0a`): primary text on the phone, and the watch's screen color. A near-black tinted a hair toward green so it shares hue family with the accent. Strict `#000000` is reserved for the literal watch screen (the hardware emits black; nothing softer is possible there).
- **Paper** (`#f6f4ef`): the phone background. A warm off-white, the color of unbleached paper held under indoor light. Replaces the current saturated green gradient.
- **Paper Card** (`#fffefb`): card surfaces on the phone, barely brighter than paper. Carries setting cards.
- **Muted FG** (`#7a7d76`): hint text, captions, list-time strings on the phone. The "second voice."
- **Muted FG Strong** (`#9da19a`): the watch's "Next Prayer" label and similar de-emphasized type on dark surfaces. Corresponds to `GColorLightGray`.
- **Divider** (`#e6e3dc`): input strokes, optional row separators, the toggle's off-state pill. Never used as a colored stripe accent.
- **Watch Screen** (`#000000`) / **Watch Ink** (`#ffffff`): the watch's hardware palette. Pure black background, pure white text. No tinting on the watch; it would just round back to these values.

### Named Rules

**The Living-Green Rule.** Adhan Green tints only what is alive: the countdown digits in motion, the toggle that is currently "on," the row that marks the current prayer. It never tints brand chrome, headings, buttons, links, or decoration. If the green is sitting still and means nothing, it is wrong.

**The Honest Black Rule.** The Pebble screen renders pure `#000000` and pure `#ffffff` because the hardware emits those values directly. Do not waste OKLCH tinting on the watch surface. Tint the phone-side neutrals instead, where CSS can honor the nuance.

**The One Accent Rule.** Exactly one chromatic family lives in the system: green. There is no secondary accent, no error red, no warning amber. State that needs a different signal uses weight, position, or label, not a new color.

## 3. Typography

**Watch fonts:** Bitham (display weight) and Gothic (text weights). Both are Pebble SDK system fonts, baked into the OS. Never load custom watch fonts. Custom watch fonts cost ROM, fail to render at small sizes, and ignore the platform's careful subpixel work.

**Phone fonts:** the OS system stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...`). One family, no display pairing, no web font loading. The settings page is configuration, not a brand surface; it should disappear into the host OS.

**Character:** plain, dependable, mechanical. Bitham is a wide blocky display face that holds prayer names at glance; Gothic is the Pebble Gothic UI sans, designed for the device's pixel grid. The pair carries no editorial mood, which is the point.

### Hierarchy

Watch:

- **Watch Display** (Bitham, 30px, weight 900, line-height 1): the next prayer name and the countdown digits. The two largest pieces of type on the watch screen.
- **Watch Title** (Gothic Bold, 24px, line-height 1.1): the next prayer's clock time, sitting just under the prayer name.
- **Watch Body** (Gothic, 18px, line-height 1.2): the location header at the top of the main screen and the prayer-time strings in the list rows. Bold variant (18px) tags the prayer names in the list.
- **Watch Label** (Gothic, 14px, line-height 1.2): the "Next Prayer" supra-label, the bottom-of-screen hint ("DOWN for all times"), error messages.

Phone:

- **Display** (system sans, 24px, weight 600, line-height 1.2): the settings page H1.
- **Body** (system sans, 15px, weight 500, line-height 1.5): setting labels and toggle labels. Cap prose at 65–75 ch on wide viewports; the settings page is column-bound so this rarely binds.
- **Caption** (system sans, 12px, weight 400, line-height 1.4): the per-setting "note" lines under each control.

### Named Rules

**The Two-Stack Rule.** Pebble system fonts on the watch (Bitham, Gothic). OS system fonts on the phone. No web fonts, no font files in `resources/`, no Inter / SF / IBM Plex bundled into the bundle. Both stacks are native to their host; neither needs help looking right.

**The No-Display-Face-In-Labels Rule.** Bitham is for the two display roles only (prayer name, countdown). It does not appear in lists, hints, errors, or any phone surface. Using a display face for labels is the canonical "overstyled watchface" tell.

## 4. Elevation

Flat. Both surfaces. No shadows, no gradients, no blurs, no glassmorphism.

Depth is communicated by **contrast** (white ink on the watch's black screen, ink on paper on the phone) and by **filled regions** (the Adhan Green Deep highlight under the current prayer row). The Pebble watch SDK does not support drop shadows in any meaningful way, so adopting flatness on the phone is consistency, not asceticism. A shadowed phone settings page next to a flat watch screen would feel like a costume change.

### Named Rules

**The No-Shadow Rule.** No `box-shadow`, no `text-shadow`, no `filter: drop-shadow()`. Anywhere. The current settings page violates this with `box-shadow: 0 4px 12px rgba(26, 95, 42, 0.4)` on its save button and `0 2px 8px rgba(0, 0, 0, 0.15)` on its cards. Both must go.

**The No-Gradient Rule.** No `linear-gradient`, no `radial-gradient`. The current settings page's body `linear-gradient(135deg, #1a5f2a, #0d3d18)` and save-button gradient are both prohibited. Replace with `Paper` background and `Ink` button.

## 5. Components

### Buttons

- **Shape:** softly rounded (`md` = 8px). Not pill, not square.
- **Primary** (`button-primary`): `Ink` background, `Paper` text, 14px / 24px padding, 15px weight-500 type. One button per screen, used for "Save Settings" on the phone surface. No icons, no shadows.
- **Hover / Focus:** background shifts to `Adhan Green Deep` for hover; focus ring is a 2px `Adhan Green` outline at 2px offset. No translate, no shadow lift.
- **Disabled:** background `Divider`, text `Muted FG`.

### Setting Cards

- **Shape:** `lg` = 12px radius.
- **Background:** `Paper Card`, sitting on the page `Paper` background. The page is warm white; the card is barely brighter. The card reads as a card because it is bounded, not because it floats.
- **Border:** 1px solid `Divider`, full perimeter only. Never side-stripe.
- **Internal padding:** 16px (`spacing.lg`).
- **Group title:** above the card, 12px uppercase `Muted FG`, letter-spacing 0.08em, left-margin 4px. Quiet, navigational.

### Inputs

- **Shape:** `md` = 8px radius.
- **Style:** 1px solid `Divider`, `Paper Card` fill, 12px padding, body typography.
- **Focus:** stroke shifts to `Adhan Green` (the only place the bright accent appears in an input). No glow.
- **Error / disabled:** the system has no error state by design; settings either save or fail silently with no inline validation needed.

### Toggle Switch

- **Shape:** 52px wide, 28px tall pill (`rounded.pill`). 22px circular thumb inside.
- **Off:** track `Divider`, thumb `Paper Card` with a 1px `Divider` perimeter (no shadow). Thumb sits at left.
- **On:** track `Adhan Green`, thumb `Paper Card` at right. The active green is the only chromatic signal in the whole control.
- **Motion:** 200ms `ease-out-quart` translate on the thumb. No bounce, no elastic.

### Watch Main Screen

- **Surface:** `#000000` background, full bleed. No chrome.
- **Vertical rhythm (rectangular display):** location header at y=5 (Watch Body, centered). "Next Prayer" supra-label at center-55 (Watch Label, Muted FG Strong, centered). Prayer name at center-40 (Watch Display, white, centered). Prayer time at center (Watch Title, white, centered). Countdown at center+28 (Watch Display, Adhan Green on color hardware, white on 1-bit). Hint "DOWN for all times" at bottom-22 (Watch Label, dark gray, centered).
- **Round display offsets:** the round (Chalk) variant increases padding to 18px and shifts top/bottom by ~7px to clear the bezel. Spec values live in `prayer_display.c`.
- **Tick:** the countdown layer redraws on `SECOND_UNIT` so the seconds tick. Everything else is static between updates.

### Watch List Row

- **Layout:** prayer name flush-left, prayer time flush-right, 5 rows for the 5 named prayers (Fajr, Dhuhr, Asr, Maghrib, Isha). Sunrise is shown on the main screen but omitted from the list.
- **Default:** transparent background, white type. 18px Gothic Bold for the name, 18px Gothic regular for the time.
- **Current prayer:** the row whose prayer has begun but not yet ended gets a filled `Adhan Green Deep` background, 4px radius, all corners, with white type on top. This is the only fill in the list.
- **Density:** 24px row height on rectangular displays, 26px on round.

### Vibration

- Not strictly a visual component but part of the language: at prayer time (countdown reaches zero, quiet time not active), a five-segment pulse fires (200, 100, 200, 100, 400 ms). Two short taps and a longer hold. Anyone wearing the watch knows what just happened without looking.

## 6. Do's and Don'ts

These guardrails carry PRODUCT.md's anti-references into the visual spec. Quote them verbatim where applicable.

### Do:

- **Do** reserve Adhan Green for active state: the countdown digits, the toggle's on position, the current-prayer row fill. Nothing else.
- **Do** use Pebble system fonts on the watch (`FONT_KEY_BITHAM_30_BLACK`, `FONT_KEY_GOTHIC_*`) and the OS system stack on the phone. Both surfaces use what their host provides.
- **Do** treat the watch as the canonical surface. The phone settings page is configuration, not a brand showcase. If they disagree, the watch wins.
- **Do** lay out the main watch screen so the next prayer name, time, and countdown are reachable in one glance. Center column, generous vertical air, no scroll, no tap.
- **Do** label the current prayer with a filled background (Adhan Green Deep), not a colored border or side stripe.
- **Do** keep both surfaces flat. Contrast and fill carry depth.
- **Do** state cache freshness plainly when offline ("Cached, 6h ago"), in `Muted FG Strong`. Carries PRODUCT.md's *Offline-truthy* principle.

### Don't:

- **Don't** look like phone prayer apps on a wrist. No multiple cards on the main screen, no badge counts, no daily-quote carousels, no ad slots. (Direct from PRODUCT.md anti-references.)
- **Don't** subordinate the data to aesthetics. No decorative dials, no ornamental fonts that lose legibility at glance, no low-contrast layouts in service of a "look." (Direct from PRODUCT.md anti-references.)
- **Don't** ship the current settings page as-is. The `linear-gradient(135deg, #1a5f2a, #0d3d18)` body, the `box-shadow: 0 4px 12px rgba(26, 95, 42, 0.4)` save button, and the emoji icons (🕌 🌅 📍 📅 ⏰ 📳) are all out. Replace with `Paper` background, flat `Ink` button, no icons.
- **Don't** use gradients anywhere. No `linear-gradient`, no `radial-gradient`, no `conic-gradient`. Single solid colors only.
- **Don't** use shadows anywhere. No `box-shadow`, no `text-shadow`, no `filter: drop-shadow()`. Borders, not floats.
- **Don't** use a colored side stripe (`border-left: 4px solid green`) to mark the current row or anything else. The active state is a full filled background. Side stripes are an absolute ban.
- **Don't** use Bitham (display) for labels, hints, or anything other than the two display roles (next prayer name, countdown). Display faces in label positions is the canonical overstyled-watchface tell.
- **Don't** introduce a second accent color. No error red, no warning amber. The system has one chromatic voice.
- **Don't** load custom fonts on either surface. No web fonts on the phone, no `font` resources in the Pebble bundle. The two system stacks are sufficient.
- **Don't** animate on the watch beyond what `SECOND_UNIT` ticks already give you. No layout transitions, no fades, no entrance choreography. The hardware refresh rate is too slow and the user's wrist is the wrong place to perform.
