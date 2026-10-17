---
name: Canteen
description: Anonymous group chat for verified university students. Verified, not identified.
colors:
  you: "oklch(var(--accent-l) var(--accent-c) var(--accent-h))"
  you-dark: "oklch(0.76 var(--accent-soft-c) var(--accent-h))"
  you-hover: "color-mix(in oklch, var(--you), black 5%)"
  you-hover-dark: "color-mix(in oklch, var(--you), white 8%)"
  you-ink: "oklch(0.2 0.025 var(--accent-h))"
  you-muted: "oklch(0.34 0.035 var(--accent-h))"
  accent-yellow: "oklch(0.885 0.165 96)"
  accent-blue: "oklch(0.8 0.13 250)"
  accent-green: "oklch(0.83 0.13 160)"
  accent-rose: "oklch(0.83 0.12 5)"
  accent-violet: "oklch(0.82 0.11 300)"
  accent-orange: "oklch(0.85 0.13 60)"
  background: "oklch(0.974 0.004 255)"
  surface: "oklch(1 0 0)"
  surface-2: "oklch(0.953 0.006 255)"
  surface-3: "oklch(0.918 0.008 255)"
  ink: "oklch(0.205 0.016 265)"
  muted: "oklch(0.46 0.016 265)"
  line: "oklch(0.895 0.008 255)"
  line-strong: "oklch(0.82 0.01 255)"
  background-dark: "oklch(0.155 0.012 265)"
  surface-dark: "oklch(0.212 0.014 265)"
  surface-2-dark: "oklch(0.188 0.013 265)"
  surface-3-dark: "oklch(0.255 0.015 265)"
  ink-dark: "oklch(0.965 0.004 265)"
  muted-dark: "oklch(0.74 0.012 265)"
  line-dark: "oklch(0.285 0.014 265)"
  line-strong-dark: "oklch(0.36 0.016 265)"
  danger: "oklch(0.55 0.2 25)"
  danger-surface: "oklch(0.955 0.03 25)"
  danger-dark: "oklch(0.7 0.17 25)"
  danger-surface-dark: "oklch(0.27 0.06 25)"
  logo-ink: "var(--you-ink)"
  logo-ink-dark: "var(--ink)"
typography:
  display:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 8vw, 6.25rem)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.035em"
    fontVariation: "'wdth' 125"
  headline:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.035em"
    fontVariation: "'wdth' 125"
  title:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
    fontFeature: "'ss01' on"
  label:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  tail: "6px"
  item: "12px"
  field: "16px"
  reply: "22px"
  bubble: "24px"
  opener: "26px"
  card: "28px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.you}"
    textColor: "{colors.you-ink}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.you-hover}"
  button-primary-disabled:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.muted}"
  button-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "40px"
  button-ghost:
    textColor: "{colors.muted}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "40px"
  send-button:
    backgroundColor: "{colors.you}"
    textColor: "{colors.you-ink}"
    rounded: "{rounded.full}"
    size: "40px"
  bubble-others:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.bubble}"
    padding: "14px 16px 8px"
  bubble-mine:
    backgroundColor: "{colors.you}"
    textColor: "{colors.you-ink}"
    rounded: "{rounded.bubble}"
    padding: "14px 16px 8px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "6px 14px"
  chip-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.background}"
  input:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0 16px"
    height: "48px"
  brand-loader:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
    padding: "64px 24px"
---

# Design System: Canteen

## Overview

**Creative North Star: "The Group Chat at the Canteen Table"**

Every thread is a group chat where each sender is a verified student wearing a per-thread alias. The interface uses chat-app grammar, not a forum's card feed. Others' messages are neutral bubbles on the left. The student's own messages use their selected accent on the right, with the original highlighter yellow as the default. Names come in per-thread hues with initials avatars, and a faint hand-drawn doodle wallpaper sits behind conversations. There are no vote columns, no karma and no photos of real people. The bubbles carry the identity.

The grounds are cool: a near-white in light mode and a deep ink-graphite in dark mode. Both modes are first-class and built from the same token names. Color mode (Device, Light or Dark) is independent of the six accent palettes. Dark accents are soft by default, with a vivid option. Density is phone-first. Each feed is a single column of bubbles with roughly 15px body text. Navigation, headers and the reply bar stay pinned to the edges, and content scrolls between them.

Type comes from one variable family, Mona Sans. Its expanded heavy cut (width 125%, weight 800) is used for display moments, and normal width is used for everything you read and tap. Icons are Lucide line icons. Chips, buttons and the send button are pills or circles.

**Key Characteristics:**

- Bilateral layout by position: you on the right in the selected accent, everyone else on the left in neutral bubbles.
- One selected accent connects the student's own voice, primary actions and the Canteen mark; Original yellow remains the default.
- Per-thread alias hues: the alias sets the hue, the theme sets lightness and chroma.
- Expanded heavy Mona Sans for display, normal width for UI.
- Light and dark are equal citizens. No surface is designed for one theme only.
- A doodle wallpaper behind chat areas, tinted by the theme at about 4 to 5% strength, with a plain option.

## Colors

One selected accent over cool, slightly blue-tinted neutrals, plus a per-alias hue system that is computed rather than stored as a palette. `app/globals.css` owns the live colors; the accent entries above record each palette's light/vivid color, while `you` resolves the active palette.

### Primary

- **Your Accent** (`you`): the student's own bubbles, primary buttons (New post, Join, Start a thread), the round send button, the mobile tab bar's center plus, the Canteen mark and text selection. In dark mode it also becomes the focus ring and the focused-field ring. Text on it uses **Accent Ink** (`you-ink`), with **Accent Ink Muted** (`you-muted`) for meta text such as timestamps, view counts and the Campus marker inside an accent bubble. Both ink colors follow the selected hue. Hover mixes in 5% black in light mode (`you-hover`) or 8% white in dark mode (`you-hover-dark`).

| Palette in Settings | Stored accent | Hue | Light/vivid L / C | Soft dark C |
| ------------------- | ------------- | --- | ----------------- | ----------- |
| Original            | `yellow`      | 96  | 0.885 / 0.165     | 0.09        |
| Blue hour           | `blue`        | 250 | 0.8 / 0.13        | 0.085       |
| Mint                | `green`       | 160 | 0.83 / 0.13       | 0.085       |
| Rose                | `rose`        | 5   | 0.83 / 0.12       | 0.075       |
| Lilac               | `violet`      | 300 | 0.82 / 0.11       | 0.075       |
| Apricot             | `orange`      | 60  | 0.85 / 0.13       | 0.085       |

Soft dark mode uses L 0.76 with the palette's soft chroma and hue. Vivid dark mode uses the same L/C as the light palette. These are accents within the existing neutral system, not separate visual identities.

### Neutral

- **Cool Near-White / Deep Ink-Graphite** (`background` / `background-dark`): the page ground.
- **Surface** (`surface` / `surface-dark`): others' bubbles, cards, dialogs, menus, active nav item.
- **Surface 2** (`surface-2` / `surface-2-dark`): resting fields, secondary buttons, quiet sections (the landing's "how it works" band), topic tags inside bubbles.
- **Surface 3** (`surface-3` / `surface-3-dark`): hover fills, skeletons, disabled primary actions.
- **Ink** (`ink` / `ink-dark`): primary text. It is also the fill of the active topic chip and the OP badge (with `background` as text), and the light-mode focus ring.
- **Muted** (`muted` / `muted-dark`): meta lines, placeholders, inactive nav and chips.
- **Line / Line Strong** (`line`, `line-strong` and dark pairs): 1px rings on bubbles and cards, header borders and the field hover ring.

### Status

- **Danger** (`danger`, `danger-surface` and dark pairs): errors, destructive menu items, the unread badge and liked hearts. A liked heart is filled as well as coloured, so the state is carried by shape too.

### Alias hues

Each alias has a hue (0–360). Its colours are `oklch(L C hue)`, with L and C supplied per theme: name text (L 0.5 / C 0.15 in light, L 0.8 / C 0.13 in dark), avatar fill (L 0.92 / C 0.07 in light, L 0.34 / C 0.075 in dark), and avatar initials (L 0.36 / C 0.11 in light, L 0.93 / C 0.06 in dark). Never hard-code an alias colour. Set `--hue` and let the theme tokens decide the rest.

### Logo

The authored mark remains a speech bubble with a mug handle and three ink dots. In the app (`components/logo.tsx`), its fill and handle follow `--you`; its outline and dots use `--logo-ink` (accent ink in light mode, `--ink` in dark mode). Preserve its geometry when changing palettes. The static browser icon (`app/icon.svg`) retains the original yellow identity. The wordmark "canteen" is set in the display cut.

### Named Rules

**The Your Voice Rule.** The selected accent means "this is you, or this is your next move," and also carries the Canteen mark. Use it for the student's own messages, primary actions, selection and dark-mode focus. Don't use it for others' content, unrelated decorative fills, category colours or status.

**The Hue From Alias Rule.** Others are identified by an alias hue on their name and avatar, never by a bubble colour. Their bubbles stay neutral `surface`.

**The Neutral Disabled Rule.** A disabled primary action drops to `surface-3` with `muted` text at full opacity. It is never a faded accent, because an accent action must appear available only when it can be used.

## Typography

**Display Font:** Mona Sans variable, `wdth` axis loaded (fallback `ui-sans-serif, system-ui, sans-serif`)
**Body Font:** Mona Sans at normal width
**Label Font:** Mona Sans at normal width

**Character:** One family in two widths. The expanded, extra-bold cut is loud and current, while the normal width stays calm for reading and tapping. Stylistic set `ss01` is on globally.

### Hierarchy

- **Display** (800, width 125%, tracking -0.035em; landing hero `clamp(3rem, 8vw, 6.25rem)` at line-height 0.92, section statements `clamp(2rem, 5vw, 4rem)` at 1): landing headlines, the join card title (30px), and the not-found and error pages.
- **Headline** (same display cut, 22px on mobile and 26px from `lg`): the sticky page-header title naming where you are, the composer title (20px), and the account university name.
- **Title** (600–700, tracking tight): thread opener title (700, 22px, 26px from `sm`), feed post title (600, 17px), dialog and empty-state titles (700, 19px), landing feature titles (700, 26px).
- **Body** (400, 15px, line-height 1.625): post excerpts and replies. The thread opener body is 16px. Landing lead copy is 18–20px in `muted`, capped near 34rem.
- **Label** (600, 13px): meta lines, chips, small buttons. The smallest steps are 12px for timestamps and counters and 11px for tab labels. Counts use tabular numerals.

### Named Rules

**The Two Widths Rule.** The display cut is only for display text: landing statements, page-header titles and the wordmark. Don't use it for bubble text, buttons or meta text. Width carries the hierarchy, so you don't need more font sizes.

## Layout

The app is a single centered feed column. From `lg` (1024px), a 264px sticky nav rail sits on its left. Below `lg`, the rail is replaced by a fixed bottom tab bar, 64px tall plus the safe-area inset. Its five slots are Feed, Campus, a raised 48px accent plus, Alerts and You. Thread and composer routes hide the tab bar because they own the bottom of the screen, so bottom padding for the tab bar is only added where the bar exists.

Page gutters are 16px on mobile and 24px from `lg`. Feed bubbles take 88% of the column width on mobile and 82% from `sm`. Reply bubbles are capped at 82% and 72%. A bubble pushes to its sender's side, and the leftover width is the empty space that makes the bilateral reading work. Consecutive replies from the same alias within 10 minutes group with 4px gaps. New speakers start 16px down.

Headers are sticky: a 1px `line` bottom border over `background` at 85% opacity with a heavy backdrop blur. They name the place and hold topic chips in a horizontal scroll row with hidden scrollbars. The reply bar is sticky at the bottom in the same material.

The landing uses a 1200px max width: a two-column hero (1.15fr / 1fr) with the headline and join action on the left and a live phone-sized chat demo on the right, then 1100px content bands with 80–112px vertical padding.

## Elevation & Depth

Depth is mostly tonal. The ground is darkest in dark mode and lightest in light mode, surfaces are lifted by one step, and every lifted element carries a 1px `line` ring. Two soft, diffuse shadows sit on top of that. They are re-tuned per theme, with stronger, black-based values in dark mode. Translucent blurred bars give the pinned chrome a sense of layering.

### Shadow Vocabulary

- **Soft** (`--shadow-soft`): resting elevation for others' bubbles, cards, the active nav item and the mobile plus button.
- **Pop** (`--shadow-pop`): floating layers such as dialogs, menus, the search palette, the join card and the landing phone demo. It is also the hover state of a feed bubble.

### Named Rules

**The Ring Plus Soft Rule.** Others' bubbles and cards use `surface` + 1px `line` ring + soft shadow. Accent bubbles use none of these, because their colour already lifts them.

## Shapes

Everything is round. Buttons, chips, the send button, avatars and badges are full pills or circles. Containers use generous radii that grow with their role: menu items 12px, fields and images 16px, replies 22px, feed bubbles 24px, the thread opener and reply-bar shell 26px, cards and dialogs 28px, the join card 32px, the demo phone 36px.

Bubbles have a tail: the corner nearest the sender drops to 6px (top-left for others, top-right for you). Grouped follow-up replies soften that corner to 8px.

The doodle wallpaper (`public/doodles.svg`, original line drawings) is applied as a CSS mask tile, 300px square, filled with `--doodle` (ink at 5% in light mode, white at 4% in dark mode). It appears behind threads, empty states, the landing demo, the landing's closing band and the branded loading screen. The Plain preference hides the mask wherever `.wallpaper` is used.

## Components

### Buttons

Chunky, rounded and quick to press.

- **Shape:** full pill, semibold; heights 32 / 40 / 48px (`sm` / `md` / `lg`), with the landing CTA at 56px. Icons are 1.15em.
- **Primary:** selected accent with Accent Ink. Used for the one main action on a surface.
- **Hover / Focus / Active:** hover moves to `you-hover`. Focus is a 2px outline at 2px offset in `ring` (ink in light, selected accent in dark). Pressing scales to 0.97 over 150ms with ease-out-quart.
- **Disabled:** see The Neutral Disabled Rule.
- **Secondary:** `surface-2` with an inset `line` ring and ink text. This is the default variant.
- **Ghost / Quiet:** no fill. Ghost uses `muted` text and quiet uses `ink` text; both hover to `surface-3`.
- **Danger:** `danger` fill with white text.

### Chips

- **Topic filter:** a pill at 13px semibold. Inactive chips use `surface` with an inset `line` ring and `muted` text. The active chip is `ink` with `background` text.
- **Composer choices** (topic, audience) use the same inverted-ink selected state with `role="radio"`.
- **Tags inside bubbles:** a 12px pill on `surface-2` with a ring. On an accent bubble, the tag is a 10% `you-ink` tint instead.

### Cards / Containers

- **Corner Style:** 28px.
- **Background:** `surface`.
- **Shadow Strategy:** soft at rest. Floating cards use pop.
- **Border:** 1px `line` ring.
- **Internal Padding:** 24px (20px on the account card on mobile).

### Inputs / Fields

- **Style:** `surface-2`, 16px radius, inset 1px `line` ring, 15px text, 48px tall. Textareas grow with their content (`field-sizing: content`).
- **Hover:** the ring moves to `line-strong`.
- **Focus:** the background lifts to `surface` and the ring becomes 2px `ink` in light mode or 2px selected accent in dark mode.
- **Error / Disabled:** errors use a `danger` ring and a 13px `danger` message below. Disabled fields drop to 60% opacity.
- **Length budget:** a counter stays hidden until 20% of the limit remains, then shows the characters left in `muted`, turning `danger` once over.

### Navigation

- **Desktop rail:** logo, then 48px items with 22px icons in `muted` that hover to `surface-3`. The active item becomes a `surface` card with a ring and soft shadow, semibold `ink` text and a thicker icon stroke. Below the items is a full-width accent "New post" button. A search field with a ⌘K hint, the verified university, Settings and the theme toggle sit at the bottom.
- **Mobile tab bar:** 24px icons over 11px labels. The active tab uses `ink` and a thicker stroke. The center slot is the 48px accent plus. Unread counts are a `danger` pill. Settings is reached through the private account page; the You tab stays active there.

### Message bubbles (signature)

- **Others:** left-aligned, `surface` + ring + soft shadow, with the top-left corner as the tail. The meta line above shows the alias name in its hue, the university and the time. On `sm` and up, feed posts show an initials avatar. In threads, the avatar appears only on the last bubble of a group.
- **Yours:** right-aligned selected accent with Accent Ink. The top-right corner is the tail. The meta line reads "You". Actions inside an accent bubble hover to a 10% `you-ink` tint.
- **OP badge:** a 10px uppercase bold tag, ink on background (a 10% `you-ink` tint on an accent bubble). It is a functional label, not a heading.

### Reply bar and the send rise

The reply bar is a 26px-radius `surface` shell holding an auto-growing textarea and a 40px round accent send button with an up arrow (2.6 stroke). Focus thickens the shell ring to 2px (ink in light, selected accent in dark). Under the shell, a line reads "You appear as [alias] in this thread." When you send, the page scrolls to the newest reply. The new accent bubble rises from the composer's position into its slot, starting at 0.9 scale and 0.3 opacity, over 520ms with ease-out-quart. The motion is skipped when either the device or the local preference requests reduced motion.

### Dialogs, menus and search

On phones, dialogs are bottom sheets with 28px top corners. From `sm` up they become centered 28px cards (448px max width) with pop shadow over a 40% black, 2px-blur scrim. Menus are 16px-radius `surface` panels with 12px-radius items. Destructive items use `danger` text on a `danger-surface` highlight. Search is a 24px-radius command palette placed at 10% of the viewport height.

### Landing chat demo

A 400px phone-style card (36px radius, pop shadow) replays an example thread that is labeled "Example". It shows typing dots (a 1.2s bob), aliases with university tags, and messages that pop in (360ms ease-out-expo, rising 14px from 0.92 scale). The top of the message list fades out under a mask.

### Settings and reading preferences

The authenticated `/settings` surface uses the existing page header, neutral sections, native radio groups with visible focus, and a live logo-and-chat preview. Color mode remains Device / Light / Dark through `next-themes`; the accent is a separate choice. Display settings stay in this browser and update immediately, including across tabs when storage is available. Stored values are validated before first paint; blocked storage falls back to the current visit and reports that it could not save.

Defaults are Original yellow, Soft dark accents, Follow device motion, Doodles, Time ago and Device clock. Alternatives are Vivid dark accents, Reduce motion, Plain wallpaper, Date & time, and 12-hour / 24-hour clocks. Reset restores these display defaults and Device color mode. It does not change account content. Device reduced motion always wins over decorative motion; both CSS and scripted motion honor it.

### Timestamps and deadline picker

Message timestamps are keyboard-focusable semantic `<time>` elements. Their exact local date and time appear in an ink-filled tooltip in 12px type with a 12px radius, pop shadow and arrow, on hover or focus. Relative times refresh from one shared minute clock; the optional exact display and date labels honor Device / 12-hour / 24-hour clock preferences.

The opportunity deadline field opens the existing branded Dialog, a bottom sheet on phones. The calendar uses round days, an accent-selected day, neutral hover fills and a ring for today. Arrow keys move by day or week, Home / End move within the week, and PageUp / PageDown move by month. Labeled numeric hour and minute fields use a 24-hour clock; helper text names the local timezone and explains that others see their own local time. Only a valid future date and time enables Set deadline.

### Branded loading

The root loading fallback is a server-rendered, full-height wallpaper surface with the themed mark, display wordmark and "Pulling up a chair…". Only the mark's three dots animate: the existing 1.2s typing rhythm with 140ms and 280ms offsets. It has a loading status label, respects motion and wallpaper preferences, and adds no artificial wait. Conversation-specific skeletons stay in place.

## Do's and Don'ts

### Do:

- **Do** place the student's own content on the right in the selected accent with Accent Ink, and everyone else's on the left in neutral `surface` bubbles.
- **Do** use exactly one accent primary action per surface region, such as New post in the rail, the plus in the tab bar, or the send button in a thread.
- **Do** colour aliases through `--hue` with the theme's L/C tokens, so both themes stay legible.
- **Do** check every new surface in both light and dark mode, including soft and vivid accents, before it ships.
- **Do** use the display cut (width 125%, weight 800, -0.035em) for page-header titles and landing statements, and normal width for everything else.
- **Do** show state by shape as well as colour: filled hearts, thicker active icon strokes, inverted active chips.
- **Do** respect both `prefers-reduced-motion` and the local Reduce preference. Global CSS already collapses animations, and scripted motion must check both too.

### Don't:

- **Don't** use the selected accent for others' messages, categories, status or unrelated decoration.
- **Don't** fade a disabled primary button. Switch it to `surface-3` with `muted` text.
- **Don't** add vote columns, karma, follower counts, real-person avatars or profile photos. Identity is an alias hue with initials.
- **Don't** hard-code alias colours or use a theme-specific hex where a token exists.
- **Don't** add tab-bar bottom padding on routes where the tab bar is hidden (threads, composer).
- **Don't** set bubble text, buttons or meta text in the expanded display cut.
