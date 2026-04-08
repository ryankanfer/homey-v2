# Design System — homey.

## Product Context
- **What this is:** Private real estate intelligence platform for NYC buyers, renters, and the agents who serve them
- **Who it's for:** Mixed — first-time buyers overwhelmed by NYC complexity, savvy repeat buyers wanting edge, high-net-worth buyers ($2M+) expecting white-glove service, and licensed agents managing client relationships
- **Space/industry:** Residential real estate, NYC market
- **Project type:** Web app (buyer onboarding + dashboard + agent CRM)

## Aesthetic Direction
- **Direction:** Luxury/Refined editorial
- **Decoration level:** Minimal — typography and space do all the work
- **Mood:** A private advisor who already read your file before you walked in. Calm, precise, seen. The interface recedes; the intelligence leads. Like Loewe's website — nothing decorative without earning its place.
- **Reference:** Loewe.com, Bottega Veneta — restraint, negative space, editorial authority
- **Anti-reference:** Zillow/StreetEasy (commodity, listing-grid heavy), generic SaaS dashboards (card soup, sidebar nav, metric tiles)

## Typography
- **Display/Hero:** Playfair Display — italic form creates intimacy; authority without coldness; the "voice" of homey.
- **Body/UI:** Instrument Sans — warm, less ubiquitous than Inter, same optical quality; pairs with Playfair without competing
- **Labels/Tags:** Instrument Sans, uppercase, `tracking-widest`, 10–11px — editorial byline feel, not UI chrome
- **Data/Tables:** Instrument Sans with `tabular-nums` — readable at small sizes
- **Code:** not applicable
- **Loading:** Google Fonts CDN — `Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&Instrument+Sans:wght@400;500;600`
- **Scale:**
  - 3xl: clamp(2.5rem, 5vw, 4rem) — hero questions, page titles
  - 2xl: clamp(1.75rem, 3vw, 2.5rem) — section headers
  - xl: 1.5rem — card titles
  - lg: 1.125rem — body emphasis
  - md: 1rem — body
  - sm: 0.875rem — secondary body
  - xs: 0.75rem — captions
  - 2xs: 0.625rem (10px) — uppercase labels, tracking-widest

## Color
- **Approach:** Restrained — sand gold is precious because it's rare
- **Background:** `#0D0D0B` — near-black with warm (not cool) tint
- **Surface:** `#141412` (soft), `#1A1A17` (muted/elevated)
- **Border:** `#2A2A27` (default), `#3A3A37` (strong)
- **Primary accent:** `#C8B89A` (sand gold) — trust, warmth, NYC limestone
- **Accent muted:** `#A8956E` — secondary accent moments
- **Accent light:** `#E8DCC8` — hover states, highlights
- **Text primary:** `#F0EDE8` — warm off-white, never pure white
- **Text muted:** `#A8A49E`
- **Text dim:** `#6E6A65`
- **Semantic success:** `#4A7C59`
- **Semantic error:** `#8B3A3A`
- **Dark mode:** Dark only. No light mode. The dark palette IS the brand.

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable — generous whitespace, especially around onboarding questions
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px) 4xl(96px)
- **Onboarding exception:** Questions get 4xl vertical padding above/below — they float

## Layout
- **Approach:** Creative-editorial for onboarding/buyer; grid-disciplined for agent dashboard
- **Grid:** 12-col, 24px gutter, max-width 1280px
- **Max content width:** 3xl (48rem) for questions/copy; full-width for dashboard data
- **Border radius:** 0 — sharp corners everywhere. No exceptions unless it's a circular avatar.

## Motion
- **Approach:** Intentional — state transitions, entrances, nothing decorative
- **Easing:** enter(`cubic-bezier(0.16, 1, 0.3, 1)` — expo-out) exit(`ease-in`) move(`ease-in-out`)
- **Duration:** micro(80ms) short(200ms) medium(350ms) long(600ms)
- **Onboarding:** Step transitions slide horizontally (exit left, enter right) at medium duration. Progress bar ease-out-expo. Synthesis ticker stagger at 1400ms intervals.
- **Never:** bounce, elastic, spring wobble, decorative particles

## Onboarding Design Principles
1. **Questions float in space** — no card container, no border. The question IS the screen.
2. **The advisor recedes** — UI chrome disappears at question steps; only progress bar + back arrow remain
3. **Name first** — collect `fullName` at step 1, not step 6. Users are named from the start.
4. **Progressive profile crystallization** — on desktop, a right-side panel assembles the profile live as answers come in. Users watch their file take shape.
5. **Serif italic for questions** — signals conversation, not form
6. **Uppercase sand gold labels** — for category/section markers only; sparingly

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-07 | Instrument Sans over Inter for body | Less ubiquitous, same warmth, better Playfair pairing |
| 2026-04-07 | Zero border-radius everywhere | Loewe-adjacent restraint; breaks from SaaS/Airbnb norms |
| 2026-04-07 | Name collected first in onboarding | Users feel recognized from step one, not rewarded at the finish line |
| 2026-04-07 | Live profile panel on desktop | Creates "crystallizing" sensation — users see their file taking shape |
| 2026-04-07 | Post-auth redirect to /onboarding for new users | Closes the gap: currently new users land on dashboard with empty profile |
| 2026-04-07 | Dark mode only | The dark palette is the brand identity; no light mode variant |
