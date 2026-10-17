# 03 Home

Reference: `<section class="view on" id="home">`, CSS section `/* home */`, script functions `buildHero`, `playHero`, `buildHome`, the `#q1` listeners, and the pointer logic for the peek card.

Home is five stacked blocks: **hero**, **shelf marquee**, **Recently filed**, **random band**, **footer**.

```
section#home
  .hero#hero
    .orb#orb
    .col
      p.eyebrow
      h1.big#bigh
      .finder  (label, input#q1, .hint)
  .marq > .mtrack#mq
  .col > .sec.rv (h2 + See everything) , .idx#recent
  button.pull[data-random] > span
  footer.foot
```

## 1. Hero

- `.hero{position:relative;min-height:94svh;display:flex;flex-direction:column;justify-content:flex-end;padding:120px 0 6vh;overflow:hidden}`. Content sits at the bottom of the first screen.
- `.hero .col{position:relative}` so content stacks above the orb.
- **Eyebrow:** `A personal archive · N notes and counting` where N (`#hcount`) is the total note count including user-written notes. The dot is `&middot;`.
- **Headline** (`h1.big#bigh`, `aria-label="Everything I've written down, in one place."`). Three lines, built by script into letter spans:
  - Line 1 `Everything I've` (regular), line 2 `written down,` (italic, class `it`), line 3 `in one place.` (regular).
  - Each line is `span.ln` (`aria-hidden="true"`): `display:block;overflow:hidden;padding:.06em .1em .14em 0;margin:-.06em 0 -.14em`. The overflow clip is the mask that makes letters rise from below the baseline. The negative margin cancels the padding so line spacing stays at `.9`.
  - Each non-space character is `span.ch` with inline `--k` = running letter index across all three lines (0 to 36, spaces are skipped and do not increment). Spaces are `span.sp{display:inline-block;width:.22em}`.
  - The final period of line 3 also has class `dot` (`color:var(--signal)`).
  - `.ch{display:inline-block;transform:translateY(118%) rotate(7deg);transform-origin:0 100%}`.
  - When `.hero` has class `go`: `.ch{animation:rise 1.2s var(--ease) forwards;animation-delay:calc(var(--k)*26ms + .1s)}` with `@keyframes rise{to{transform:none}}`.
  - Total sequence length: roughly 0.1s + 36 x 26ms + 1.2s, about 2.2s.
- **`playHero()`:** remove `go`, force reflow (`void el.offsetWidth`), then add `go` after **300ms** (0ms under reduced motion). It runs on first load and every time Home is entered via `swap`.
- **First-load start:** call `playHero()` once fonts are ready (`document.fonts.ready`), with a 1800ms fallback timeout. A `started` flag prevents double-start.
- **Finder block** (`.finder{margin-top:7vh;display:grid;gap:10px}`):
  - `label.lbl` "Search the archive" (`for="q1"`).
  - `input.megain#q1` type search, placeholder `start typing`, `autocomplete="off"`.
  - `.hint` row: left `#hmatch`, right "Press / from anywhere"; `display:flex;justify-content:space-between;gap:12px`.
- **Live match line (`#hmatch`):** empty input shows `Press enter to open the index`. Otherwise `N match, press enter` or `N matches, press enter` (N computed with the same AND matching as the Index, over title, excerpt, tags and body, ignoring kind and shelf filters).
- **Enter in `#q1`:** reset Index filters (`kind="All"`, `tag=null`), set the query to the input's value (this also fills `#q2`), navigate to Index with the curtain.

### Orb
`.orb{position:absolute;left:50%;top:40%;width:70vmax;height:70vmax;margin:-35vmax 0 0 -35vmax;border-radius:50%;background:radial-gradient(circle,rgba(255,74,28,.30),rgba(255,74,28,0) 62%);filter:blur(30px);pointer-events:none;will-change:transform}`. It parallaxes toward the pointer (see `02`). On touch devices it is static. Under reduced motion it is hidden.

## 2. Shelf marquee

- `.marq`: top and bottom 1px `--line` borders, `overflow:hidden;white-space:nowrap`, edge fade `mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)` (also `-webkit-` prefixed).
- `.mtrack{display:inline-flex;padding:22px 0;animation:mq 80s linear infinite}`, `@keyframes mq{to{transform:translateX(-50%)}}`. `.marq:hover .mtrack{animation-play-state:paused}`.
- Content: the list of all shelves (tags), alphabetical, rendered **four times** in a row so that translating by -50% loops seamlessly. The first copy is interactive; the other three have `tabindex="-1"` and `aria-hidden="true"`.
- Each shelf is `button.mq` with `data-shelf="tag"`: Instrument Serif italic `clamp(34px,5vw,64px)`/1, `padding:0 .45em`, `transition:color .3s`; inside it the tag name and `<sup>count</sup>` (count of notes with that tag; DM Mono 11px non-italic `--mute`, `margin-left:4px`, `vertical-align:top`, `position:relative;top:.35em`).
- After each shelf, a signal-colored dot (`::after`, `.16em` circle, `margin-left:.9em`, `vertical-align:middle`).
- Hover: text turns `--signal`.
- Click: open Index filtered to that shelf (`kind` reset to All, query cleared). Closes the reader first if it is open.

## 3. Recently filed

- `.sec{padding:12vh 0 4vh;display:flex;justify-content:space-between;align-items:baseline;gap:16px}` with class `rv`. Left `h2` "Recently filed" (italic display `clamp(34px,5vw,64px)`/1, margin 0). Right `button.lbl[data-go="search"]` "See everything".
- `.idx{border-top:1px solid var(--line)}` containing six rows: the six newest notes sorted by date descending, then by id descending.
- Row: `<a class="row rv" style="--d:i" data-open="id" tabindex="0">` with three children `span.no` (zero-padded position 01 to 06), `span.tt` (title), `span.mt` (`Kind · Sep 28`).
- `.row{display:grid;grid-template-columns:64px 1fr auto;gap:0 20px;align-items:baseline;padding:22px 0;border-bottom:1px solid var(--line);cursor:pointer;transition:opacity .5s var(--ease),transform 1s var(--ease)}`.
- Hover behavior: the other rows dim to .32, the hovered row stays 1, its title slides right 16px, its number turns `--signal`.
- Click or Enter: open the note in the Reader (`05`). On touch, there is no peek card.
- On 600px and below: columns become `34px 1fr`, gap `0 12px`, and `.mt` moves under the title (`grid-column:2;margin-top:8px`).
- Peek card behavior: see `02` section 6.

## 4. Random band

`button.pull[data-random]`: `position:relative;display:flex;align-items:center;justify-content:center;width:100%;min-height:46svh;margin-top:14vh;background:var(--ink);color:var(--bone);overflow:hidden;text-align:center`.
- Inner `span`: "Pull a random page", Instrument Serif italic `clamp(46px,10vw,160px)`/.95, tracking -.02em, `position:relative`, `padding:0 var(--pad)`, `transition:color .5s`.
- Flood: `::before` absolute, inset 0, `background:var(--signal)`, `transform:translateY(101%)`, `transition:transform .8s var(--ease)`. On hover the pseudo moves to `none` (fills from the bottom) and the text color becomes `--ink`.
- Click: open a random note (any note, uniformly from all). The reader expands from the pointer position.

## 5. Footer

`footer.foot{display:flex;flex-wrap:wrap;gap:8px 28px;justify-content:space-between;padding:26px var(--pad)}` with three spans:
1. `N notes filed` (`#f1`).
2. `N days journaled` or `1 day journaled` (`#f2`): count of journal days that have at least one stored Life or Work entry.
3. Static text: `Written by hand, kept in one place`.

Both counts refresh each time `buildHome()` runs (on entering Home and after filing a note).

## 6. Home checklist

- [ ] Headline letters rise in order, left to right, line by line, once per entry to Home.
- [ ] Typing in the finder updates the match line live; Enter opens Index with the query.
- [ ] Marquee scrolls, pauses on hover, loops seamlessly with no visible jump.
- [ ] Row hover dims siblings; peek card follows the cursor with a lean; touch has no peek.
- [ ] Random band floods orange on hover and opens a note on click.
- [ ] Footer counts reflect real data.
- [ ] Reduced motion: headline visible, marquee static, no orb.
