# Product

## Register

product

## Users

Practicing Muslims using Pebble smartwatches. Many are long-time Pebble loyalists on the Rebble community — comfortable with button-driven UIs, sideloading, and the trade-offs of older hardware (small screens, monochrome on some models, no touch on most). They glance at the watch during routine moments — work breaks, transit, meal prep — wanting one specific answer: what is the next prayer, at what time, how long until then. The watch is rarely the only prayer tool they own; it complements the phone, not replaces it.

## Product Purpose

Prayer Keeper exists to answer "what's next, when, how long" on the wrist in under a second, without ceremony. Prayer times are calculated from GPS and a chosen calculation method, surfaced on the watch face, listed for the full day, and (optionally) pinned into the Pebble Timeline as reminders. Success is measured by glance, not by session length: a user who opens the app, sees the answer, and looks away within two seconds is the win condition.

Distribution target: the Rebble app store, available to the broader Pebble community across all hardware variants (Aplite, Basalt, Chalk, Diorite, Emery).

## Brand Personality

Warm, human, trustworthy. A friendly companion on the wrist — not a tool, not a sermon. Three words: **quiet, dependable, considered**. The voice is plain and respectful: it names prayers ("Dhuhr in 23 min") rather than abstracting them ("Next prayer: T-23m"). It avoids both the cold utility of generic Pebble data apps and the performative reverence of stock religious apps. The intended emotional register is the calm of a well-made pocket watch, not the flash of a notification badge.

## Anti-references

- **Phone prayer apps on a wrist.** Muslim Pro / Athan Pro-style density, multiple cards per screen, ad slots, badge counts, daily-quote carousels. The watch is not a tiny phone; cramming a phone UI onto 144×168 px is failure.
- **Overstyled watchfaces.** Designs that subordinate the data to aesthetics — decorative dials, ornamental fonts that sacrifice legibility, low-contrast layouts in service of a "look." The data is the design.

## Design Principles

1. **Answer before asking.** The main screen must answer "what is the next prayer, at what time, how long until then" in a single glance — no menu first, no tap to reveal. Lists and settings are secondary surfaces a user opts into.
2. **Respect the device.** Embrace Pebble's idioms — button navigation, monochrome legibility, low-frame-rate motion, system fonts where they fit — rather than fighting them with phone-app patterns. Aplite (1-bit) gets a layout that works in 1-bit; colored platforms get tasteful color, not chromatic flash.
3. **Offline-truthy.** The watch must never imply a freshness it can't honor. When the phone is disconnected, the user sees the cached answer plainly stated, with the cache age visible if it matters. A stale state is communicated warmly, not as an error.

## Accessibility & Inclusion

- **Color-blind safe.** Aplite is 1-bit black and white; the entire UI must work without color as a signal. On color platforms, no information is conveyed by hue alone — pair color with weight, position, or label.
- **Legible text sizes.** Use Pebble system fonts at sizes proven on small displays. The next-prayer name and countdown are the largest elements on the screen; lists trade density for readability.
- **Vibration as a notification channel.** The app vibrates at prayer time (respecting quiet hours), giving non-visual users and people whose watch is out of sight a way to know the moment has arrived.
- No formal WCAG target is committed — this is a third-party app on a discontinued platform — but the spirit (do not exclude users who don't see color or fine detail) is non-negotiable.
