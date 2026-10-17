# 04 Index (search and archive)

Reference: `<section class="view" id="search">`, CSS section `/* index */`, script section `/* search / index */` (`nodes`, `addNode`, `filters`, `render`, `tween`, `hl`, `toSearch`, `match`, `matchQ`).

The nav calls this page **Index**; the section id is `search`.

```
section#search > .col
  .shead
    .fld  (label.lbl, input.megain#q2)
    .num  (span#num, small#numl)
  .split
    aside.rail
      div  h4 "Kind"  .pills#kinds
      div  h4 "Shelf" .pills#tags
      .srt#sort  h4 "Sort"  buttons (Newest, Oldest, A to Z)
    div  #list  +  .empty#empty
```

## 1. Header block

- `.shead{padding-top:132px;display:flex;align-items:flex-end;justify-content:space-between;gap:24px}`.
- `.fld{flex:1;min-width:0;display:grid;gap:10px}`: `label.lbl` "Search the archive" (`for="q2"`), `input.megain#q2` (type search, placeholder `type anything`, `autocomplete="off"`).
- `.num` (right side, `aria-live="polite"`): the number of matching entries as a giant **outlined** numeral (see `01` for the text-stroke spec), `text-align:right`; below it `small#numl` with `entry` (exactly 1) or `entries`.
- **Count tween:** when the count changes, animate from the previous value to the new one over **600ms** with ease-out cubic `1 - (1-p)^3`, writing rounded integers each frame (`requestAnimationFrame`). The last shown value is stored on the element (`dataset.v`). Reduced motion: set the value immediately. First render animates from 0.
- At 900px and below the header stacks (`flex-direction:column;align-items:stretch`) and the numeral aligns left.

## 2. Layout

`.split{display:grid;grid-template-columns:220px 1fr;gap:56px;padding-top:7vh;padding-bottom:16vh}`. At 900px and below it is one column with gap 34px.

## 3. Rail (filters and sort)

`.rail{position:sticky;top:92px;align-self:start;display:grid;gap:34px}`. At 900px and below: `position:static;grid-template-columns:1fr 1fr;gap:26px` with the sort group spanning both columns (`.rail .srt{grid-column:1/-1}`); at 600px and below a single column.

Group titles `h4`: DM Mono 11px, tracking .12em, uppercase, `--mute`, `margin:0 0 12px`.

- **Kind pills** (`#kinds`): `All` first, then one pill per kind that exists in the data, in first-appearance order, labeled plural (`Essays`, `Snippets`, `Notes`, `Links`). Exactly one is pressed. `data-k="All|Essay|..."`.
- **Shelf pills** (`#tags`): every tag alphabetically, label is the tag. Clicking the pressed tag clears it. `data-t="tag"`. No tag is pressed by default.
- **Sort buttons** (`.srt button`, `data-s="new|old|az"`): labels `Newest`, `Oldest`, `A to Z`. DM Mono 12px, tracking .08em, uppercase, `--mute`, `padding:3px 0`. Pressed state (`aria-pressed="true"`): color `--ink`, `padding-left:16px`, and a 6px `--signal` dot (`::before`, absolute left 0, vertically centered) scales from 0 to 1 (`transform .4s var(--ease)`); padding transition `.4s var(--ease)`.
- **Important implementation detail:** build the pill buttons only when the set of kinds and tags changes (compare a signature string `kinds.join() + "|" + tags.join()`). On every other render just toggle `aria-pressed` on the existing buttons. This is what makes the pressed-state transitions animate instead of snapping.

## 4. State

```ts
st = { q: string, kind: "All" | Kind, tag: string | null, sort: "new" | "old" | "az" }
```
`q` is shared with the Home input: setting the query writes it to both `#q1` and `#q2`.

## 5. Matching

A note matches when **all** of these hold:
1. `kind` is All or equals the note's kind.
2. `tag` is null or the note's tags include it.
3. Every whitespace-separated word of `q` (lowercased) is a substring of the lowercased concatenation `title + " " + excerpt + " " + tags.join(" ") + " " + body.join(" ")`. Empty `q` matches everything.

Sorting: `new` is date descending then id descending; `old` is date ascending then id ascending; `az` is `localeCompare` on the title.

## 6. Result row

Rows are `<a class="item" tabindex="0" data-id="id">` (display: grid). Inner markup, in order:
```
span.no            zero-padded position in the current result list (01, 02, ...)
div
  h4.tt            title with <mark> around query words
  p                excerpt with <mark> around query words
  div.tg           #tag  #tag   (separated by two non-breaking spaces)
span.mt            Kind · Sep 28
```
- `.item{display:grid;grid-template-columns:56px 1fr auto;gap:0 20px;padding:24px 0 26px;border-bottom:1px solid var(--line);cursor:pointer;transition:opacity .5s var(--ease)}`, container `#list{border-top:1px solid var(--line)}`.
- `.item .tt` has `margin:0`. `.item p{margin:8px 0;color:var(--mute);font:300 17px/1.55 var(--read);max-width:58ch}`.
- Hover behavior: see `01` section 5 (siblings dim to .4, title shifts 16px, number turns signal).
- Highlighting (`hl`): escape HTML first, then wrap each query word (regex-escaped, case-insensitive, global) in `<mark>`.
- Click or Enter opens the note in the Reader (`05`).
- At 600px and below: `grid-template-columns:34px 1fr;gap:0 12px`; `.mt` goes under the content (`grid-column:2;margin-top:8px`).

## 7. Rendering model (important for matching the motion)

Rows are created **once** per note (`addNode`) and kept in a `Map` keyed by note id. `render()` never destroys them:

1. Rebuild/refresh the filter UI (section 3).
2. **First:** for every currently visible row that has `data-ready`, record `getBoundingClientRect().top`.
3. Compute the sorted matching list. Set `style.display = ""` for matching rows and `"none"` for the rest.
4. For each matching row (in order) write its inner HTML (numbering by position) and `appendChild` it to `#list` (this reorders the DOM).
5. **Last and play:** unless reduced motion, for each matching row measure its new top.
   - If it had a recorded top (`was`): if `dy = was - now` is non-zero, animate `translateY(dy)` to none, **700ms**, easing `cubic-bezier(.16,1,.3,1)`.
   - If it is new to the list: animate `opacity 0, translateY(24px)` to `opacity 1, none`, **800ms**, same easing, **delay `min(i,8)*45`ms**, `fill:"backwards"`.
6. Mark all matching rows `data-ready=1`.
7. Tween the count (`#num`) and set `#numl`.
8. Empty state: `#empty` is shown only when nothing matches, text `Nothing filed under that yet.` (Instrument Serif italic 40px/1.1 `--mute`, `padding:60px 0`).

`render()` runs: on entering Index, on every keystroke in `#q2`, and on every filter or sort click. New notes created in Write get a new row via `addNode` immediately.

## 8. Entering Index from elsewhere

- Nav "Index": filters and query are left as they were.
- Home Enter in the finder: query set, kind All, tag cleared.
- Shelf click anywhere (marquee, reader side column): `tag` set, `kind` All, query cleared. If Index is already the current view, just re-render and scroll to top; otherwise navigate with the curtain.
- After arriving, `#q2` receives focus after 900ms.

## 9. Index checklist

- [ ] Typing filters live, rows glide to their new places, new matches fade up with a small stagger.
- [ ] Count numeral tweens and its label switches between entry and entries.
- [ ] Pill pressed state animates (background and color), sort dot scales in.
- [ ] Rail sticks while scrolling on desktop and flows inline on tablet and phone.
- [ ] Empty state appears and disappears correctly.
- [ ] Shelf links from Home and Reader land here pre-filtered.
