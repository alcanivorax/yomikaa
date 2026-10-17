# 09 Responsive, accessibility, QA and acceptance

This page defines every breakpoint, what changes at each, how to test, the quirks of the reference, and the final acceptance checklist.

## 1. Breakpoints and capabilities

Only two width breakpoints exist, plus capability queries. Do not invent more.

| Query | Meaning |
|---|---|
| `max-width: 900px` | tablet and below |
| `max-width: 600px` | phone |
| `(hover:hover) and (pointer:fine)` (checked in JS) | enables the custom cursor, peek card and orb parallax |
| `prefers-reduced-motion: reduce` | all motion rules in `02` section 10 |

Fluid sizing does most of the work through `clamp()` and `--pad: clamp(20px,4vw,56px)`. Use `100svh` for full-height blocks.

## 2. What changes where

### 900px and below
| Area | Change |
|---|---|
| Index | `.split` becomes one column, gap 34px; rail becomes static, two columns (`1fr 1fr`, gap 26px) with the Sort group spanning both; header stacks and the count numeral aligns left |
| Reader | `.rd` becomes one column (gap 36px, `padding-top:15vh`); side column becomes static and two-up |
| Journal | `.jsplit` stacks (Life above Work); `.jbody` becomes one column; the entries list loses its max-height; browser starts collapsed (decided once on load from the viewport width) |
| Tickets | `.tk` becomes `1fr auto` (gap 10px 20px) and the key input takes its own full row (max-width 220px) |

### 600px and below (adds to the above)
| Area | Change |
|---|---|
| Top bar | clock hidden; bar gap 10px; wordmark 18px; nav gap 9px, 9.5px type, tracking .02em (five items must fit at 360px) |
| Home and Index rows | grid `34px 1fr`, gap `0 12px`; meta moves under the title (`grid-column:2;margin-top:8px`) |
| Index rail | single column |
| Reader | side column single column; neighbours stack and the right one is left-aligned |
| Write dock | status text hidden; dock padding-left 10px |
| Journal entries | Remove shows as an x only (24px) so the duration stays beside the times |
| Tickets | `.tk` is one column; the right column becomes a wrapping row: status, date, Remove |

Everything else is the same at every width. Notably: the hero stays bottom-aligned, the marquee still scrolls, the Work half stays black, the page uses the same type scale (via `clamp`).

## 3. Accessibility

What the reference does and you must keep:

- Landmarks and names: `header.bar` with `nav[aria-label="Primary"]`; `main`; the reader is `role="dialog" aria-modal="true" aria-label="Note"`; the headline has `aria-label` with its full sentence while the letter spans are `aria-hidden`; the curtain, peek card and the three duplicate marquee copies are `aria-hidden` (duplicates also `tabindex="-1"`).
- State: pills use `aria-pressed`; the active nav button has `aria-current="page"`; calendar days and month chips use `aria-pressed`; the month label button has `aria-expanded` and `aria-controls`; calendar days have full-date `aria-label`s.
- Live regions: the Index count (`aria-live="polite"`) and the Write toast (`role="status" aria-live="polite"`). The Journal and Tickets `Saved` flashes are visual only.
- Labels: every input has a visible `label` or an `aria-label`. This includes the journal time inputs ("From time", "To time"), each entry's text and Remove button, and every Tickets field ("Ticket number", "Ticket title", "Notes", "Status", "Date worked"). Entry rows and ticket rows are `role="listitem"` inside `role="list"` containers; the Tickets status filter is a `role="group"` of `aria-pressed` pills.
- Keyboard: `/`, Enter on rows, Esc, Cmd/Ctrl+S, Cmd/Ctrl+Enter (see `02`). Rows are anchors without `href`, made focusable with `tabindex="0"`.
- Focus ring: 2px `--signal`, offset 4px, always visible on `:focus-visible`.
- Reduced motion fully supported.

Contrast (measured from the tokens; keep as is, this is a fidelity build):

| Pair | Ratio |
|---|---|
| `--ink` on `--bone` | about 16:1 |
| `--mute` on `--bone` | about 5.0:1 (passes AA for normal text) |
| `--signal` on `--paper` | about 3.1:1 (fails AA for small text, passes for the 28px margin note) |
| `--ink` on `--signal` (mark, dock button) | about 5.6:1 |

Known accessibility gaps in the reference (record them; fix only with owner approval, because fixes could change visuals):
1. The reader is `aria-modal` but does not trap focus. A trap that cycles Tab among the reader's own focusable elements is an **invisible** improvement and is allowed; list it in `DEVIATIONS.md`.
2. The 10px `Life` and `Work` labels in the journal list are `--signal` on `--bone` (about 2.8:1). Do not change the color without approval.
3. Clickable rows are anchors without `href`; they work by script. A visible-behavior-neutral upgrade (real buttons) is allowed only if styling and keyboard behavior stay identical.

## 4. Browser and performance targets

- Evergreen Chrome, Safari, Firefox and Edge. Web Animations API, `IntersectionObserver`, `clip-path: circle()`, `mix-blend-mode`, `mask-image`, `-webkit-text-stroke` are required.
- iOS Safari: input font sizes are already at least 30px (no zoom on focus). The dock respects `env(safe-area-inset-bottom)`.
- Performance: animate only `transform`, `opacity`, `clip-path` and `background-size`. The grain tile is a data URI (no request). The only network requests are Google Fonts, the API and Supabase.
- Keep the one `requestAnimationFrame` loop for cursor, peek and orb; it runs only when `FX` is true.
- No layout shift from fonts: use `font-display: swap` and, in Next.js, `next/font` fallbacks. The segmented knob and the hero start only after `document.fonts.ready`.

## 5. Tests to write

The backend, API and signed-in end-to-end tests are specified in `11` section 10; the lists below still apply to the web app and shared helpers.

**Unit (pure functions, from `08`):**
- `slug`: `"  Hello, World! "` gives `hello-world`; `"---"` gives empty.
- `matchQ`: all words must match (AND); matches title, excerpt, tags and body; case-insensitive; empty query matches all.
- `fmt("2026-09-28")` is `Sep 28`; `key(new Date(2026,8,28,23,30))` is `2026-09-28` in any timezone.
- Excerpt: 139, 140 and 141 character bodies truncate correctly with `...` only when over 140.
- Chronology numbers and neighbours for the 12 samples (oldest is No. 01, newest is No. 12).
- Calendar leading blanks: for each month of 2026, blanks equal `(firstDay.getDay() + 6) % 7`.
- `stepMonth` and `stepDay` never go past today; month stepping crosses year boundaries.
- `hl` escapes HTML in the title and excerpt.

**End to end (Playwright):**
1. Home: headline letters finish animating; type "design" in the finder and read the match line; press Enter and land on Index with the query.
2. Index: toggle a kind and a shelf; count numeral reaches the right value; sort changes order; empty state appears for nonsense.
3. Reader: open a note by click; progress line moves on scroll; Earlier and Later switch notes; a shelf click lands in Index filtered; Esc closes.
4. Write: file a note; it appears on Home; reload persists; Edit updates in place; validation messages for empty title, empty body and a bad link.
5. Journal: add timed entries in Life and Work (the second starts at the first's end); duration, totals, dots, chip count and list update; a row with only a start time is not saved; 22:00 to 01:30 reads 3h 30m; entries re-sort after focus leaves the list, not while typing; Enter adds a row, Shift+Enter a newline; Remove works; reload persists; legacy plain-text data loads; collapsing works; Later and next-month are disabled at the current month.
6. Tickets: add a ticket (key, title, notes, status); Enter flows key to title to notes; changing status updates the dot and counts; filtering and both empty messages; two-step Remove (arms, `Sure?`, disarms after 2.8s, deletes on second click); reload persists; blank rows are not saved; future dates cannot be picked; no horizontal scroll and a fitting nav at 360px.
7. Reduced motion: no curtain, no cursor, headline visible, instant reader.

**Visual diff:** screenshot the reference and your build with `reducedMotion: "reduce"` at every size below and every state listed, then diff. Aim for only anti-aliasing differences.

Sizes: 360x740, 390x844, 430x932, 768x1024, 834x1194, 1024x768, 1280x800, 1440x900, 1920x1080.

States per size: Home (after the headline finishes, and with a query typed); Index (default, query "design", a shelf selected, empty); Reader (the notes "The case for boring infrastructure" with margin note, "A good reading list on typography" as a Link, "Binary search, off-by-one cheatsheet" as a Snippet); Write (empty, filled with tags and Link kind, toast visible); Journal (empty today, with entries and a populated month, browser collapsed, scrolled to the split halves, with three timed entries and totals on each half); Tickets (empty, five tickets in mixed statuses, filtered, one row being edited).

Timing checks (use `performance.now()` around events): headline first letter starts 300ms after entering Home (plus 100ms animation delay); curtain cover 560ms, hold 140ms, uncover 680ms; reader open 900ms and close 700ms; count tween 600ms; moved rows 700ms; new rows 800ms with 45ms stagger; draft save debounce 700ms; journal save debounce 600ms; tickets save debounce 500ms; ticket Remove disarm 2800ms.

## 6. Quirks of the reference (replicate, do not fix)

1. There is no URL routing in the reference: reloading always returns to Home. (The real build uses real paths per `11` section 5, which is an allowed deviation, but must not change what the user sees or the transitions.)
2. The journal browser's initial open or collapsed state is decided once from the viewport width at load time, not on resize.
3. The Home match line and the Home input ignore kind and shelf filters.
4. Random picks uniformly from all notes (including your own) and opens the reader directly, with no curtain.
5. The peek card appears only for the Recently filed rows on Home, never in Index.
6. The Index numbers rows by their position in the current result list, not by a fixed id.
7. Today is based on the local clock. Journal day keys and note dates are local dates.
8. Sample notes have no Edit link; only notes written in Write do.
9. The Write dock exists on every page's DOM but is shown only when Write is current.
10. The curtain label for Home reads `Marginalia`, for the others `Index`, `Write`, `Journal`, `Tickets`.
11. Journal entries re-sort by start time only when focus leaves a list, never while typing. Ticket rows never re-sort; new ones go to the top.
12. A ticket whose status changes stays visible under a non-matching filter until the list is next re-rendered (filter click, add, remove, or re-entering the view).

## 7. Acceptance checklist

Structure and fidelity
- [ ] Five views and the reader match the reference at 1440x900 and 390x844 (visual diff clean).
- [ ] Fonts are exactly Instrument Serif, Newsreader and DM Mono; no other typefaces load.
- [ ] Every token in `01` matches; no extra colors, radii, shadows or easings.
- [ ] Visual result is identical to the reference (screenshots and computed styles); DOM structure, ids, roles and `data-*` hooks match. Styling is Tailwind with the exact tokens (`11` section 7); no component libraries, no `dark:` variants.

Motion
- [ ] Headline letter rise, marquee, orb, peek card and custom cursor behave as specified.
- [ ] Curtain timings (560 / 140 / 680) and reader circle (900 / 700) match.
- [ ] Index FLIP (700), new rows (800 with 45ms stagger) and count tween (600) match.
- [ ] Knob slide (.6s), random band flood (.8s), reveal stagger (60ms) match.
- [ ] Reduced motion paths work everywhere.

Behavior
- [ ] Matching, sorting, filtering, highlights match `04`.
- [ ] Write validation messages are exact; filing, preview, edit and start over work as in `06`.
- [ ] Journal browser (month chips, calendar, list, collapse, picking) and the timed entry editor (add, chain, duration, totals, sort, remove, midnight span, legacy data) work as in `07`.
- [ ] Tickets (add, edit, status dots, filter, counts, two-step remove, persistence) works as in `10`.
- [ ] Storage keys and shapes match `08`; the app works when storage throws.
- [ ] Keyboard shortcuts work as in `02`.

Responsive and quality
- [ ] Both breakpoints behave as in section 2; no horizontal scroll at any matrix size; the five-item nav fits at 360px.
- [ ] Top bar inverts over the Work half, random band and curtain (no ancestor breaks the blend).
- [ ] Accessibility items in section 3 are present; any deviation is listed in `DEVIATIONS.md`.
- [ ] Lighthouse mobile: accessibility 90 or higher, performance 85 or higher, no layout shift from fonts.
- [ ] `pnpm install`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm dev` run from a fresh clone with `.env.example` filled; lint, type checks and all tests pass.

Backend and data (see `11`)
- [ ] Public note and tag reads work without a token; every owner route returns 401 without a token and 403 for a non-owner.
- [ ] Sample notes cannot be edited through the API; excerpt, tags and Link rules are enforced server-side.
- [ ] Journal day `PUT` replaces entries in order and removes empty days; ticket `PUT` upserts and removes unused tickets.
- [ ] RLS is enabled on every table with no policies; the anon key reads nothing.
- [ ] Autosave keeps the 700 / 600 / 500ms debounces, one request in flight per resource, `Saved` on success and `Not saved` with retry on failure.
- [ ] Visitors see only Index and Random; owner views redirect to `/login`; the footer journal count is owner-only.
- [ ] No secret (database URL, service role key) reaches the browser bundle.
