---
version: 1
slug: "app"
primary_target: "app"
related_targets: ["app/(marketing)", "app/(auth)"]
---

# Surface brief: Canteen app (feed, threads, composer, account, settings) + landing + sign-in

Mode: Operate for the app surfaces; Persuade for the landing page; both live in one world.

Audience/job: verified university students on phones (often at night) reading threads, replying, and posting candidly; first-time visitors deciding to verify with their university account.

Constraints: identity never reaches the client; no fabricated members, universities, or metrics; demo threads on the landing page are labeled as examples. User asked for a modern, current feel that students find cool, not nostalgic or paper-like.

## Direction contract

THESIS: Every thread is a group chat at the canteen table where every sender is a verified student wearing a per-thread alias. Refuses the Reddit card-feed: no vote columns, no avatars of real people, no karma.

OWN-WORLD: Chat-app grammar rebuilt for Canteen. Cool near-white or deep ink-graphite grounds (dark first-class), others' messages as neutral bubbles, the student's own voice in the selected accent with dark ink (Original yellow by default), alias names in per-thread hues with initials avatars, an authored doodle wallpaper behind threads, Mona Sans variable: expanded heavy for display, normal width for UI. Lucide line icons, pill chips, round send button. The same accent carries the authored mug-and-speech mark. Light/dark/device mode remains independent; soft dark accents are the default, with a vivid option.

STORY: Visitors see a real-looking thread between students of different universities, understand verified-not-identified in one glance, and join with their university account. Members scan the feed, open a thread, and reply from the thumb-reach composer.

FIRST VIEWPORT: Landing: left, a huge expanded headline and the join action; right, a live phone-sized chat replaying an example thread (typing dots, aliases, university tags). App: sticky header naming where you are with topic chips; the feed of post bubbles beneath; desktop nav rail with an accent New post action; mobile bottom tab bar with a center accent plus.

FORM: group chat, position 7 on the ordered grounded list, seed key 43eb70ec. Raises: bilateral law (you right in the selected accent, others left) from labanotation; live length budgets from the cassette J-card; sticky where-you-are header from the lexicon; state by shape as well as color from the emission rail. Signature interaction: sending a reply pops an accent bubble up out of the composer into the thread.

PROVENANCE: ordered grounded list was 1 exam answer booklet, 2 campus notice board, 3 student ID and university seal, 4 desk and stall graffiti, 5 ruled lecture notebook, 6 canteen token and order board, 7 the group chat. Corroborated on 2026-10-15: concept-seed --scope direction --mode operate --from 43eb70ec --candidate-count 7 reproduces ASSIGNED INDEX 7 with the same six challengers. The user confirmed the roll in chat ("I like first one (the roll)").

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Settings, time and loading extension

This is a local extension of the confirmed chat world, without a new concept roll or approved comp. Original / Blue hour / Mint / Rose / Lilac / Apricot carry the same logo, own-message and primary-action roles. Cool neutrals, Mona Sans, alias hues, bubble shapes and pill actions remain the foundation.

The authenticated Settings page is linked from the desktop rail and private account page. Native radio groups and the live logo-and-chat preview expose color mode, accent, soft/vivid dark accents, motion, wallpaper, relative/exact timestamps and Device/12-hour/24-hour clocks. Settings apply immediately and stay in this browser, with cross-tab updates when saved. Validated first-paint preferences fall back safely if storage is unavailable. Reset restores display defaults only: Original, Soft, Follow device motion, Doodles, Time ago, Device clock and Device color mode. Device reduced motion is always respected.

Timestamps use a styled ink tooltip on hover or keyboard focus, state local time, and refresh relative labels through one shared clock. The branded deadline Dialog becomes a bottom sheet on phones; round selected days follow the accent. Arrow keys, Home/End and PageUp/PageDown navigate the calendar. Labeled 24-hour numeric fields and timezone guidance make local entry explicit; only valid future deadlines can be set. Date displays honor the selected clock format.

The server-rendered root loading surface shows the themed mark, wordmark and “Pulling up a chair…” on the existing wallpaper. Only its three dots animate, without an artificial delay; local and device reduced motion quiet them. Conversation skeletons remain. No new dependencies, backend schema or migrations are part of this extension.
