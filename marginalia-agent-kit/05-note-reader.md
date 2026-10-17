# 05 Note reader (overlay)

Reference: `<div class="reader" id="reader">`, CSS section `/* reader */`, script section `/* reader */` (`fillReader`, `openNote`, `closeNote`, `closeInstant`, `rOrigin`, `radius`, `chrono`).

The reader is not a route in the reference; it is a full-screen overlay that shows one note. It is used for: opening a note from Home rows, Index results, the Random actions, previewing in Write, and showing a note right after it is filed.

```
.reader#reader (hidden, role="dialog", aria-modal="true", aria-label="Note")
  .prog#prog                         reading progress line
  .rtop  span#rk | button#rclose[data-close] (span "Close", kbd "esc")
  div#rbody                          filled by fillReader()
     .rd
        aside.side.rv  (dl blocks)
        article
           h2.rt.rv
           .rb.rv   p, p, ...
           a.lk (optional link)
           nav.pn   (Earlier / Later buttons)
```

## 1. Container

`.reader{position:fixed;inset:0;z-index:80;background:var(--paper);overflow:auto;overscroll-behavior:contain}`; `.reader[hidden]{display:none}`. It scrolls internally. The page behind does not scroll (`body.style.overflow="hidden"` while open).

- **Progress line** `.prog`: fixed, top 0, height 3px, full width, `--signal`, `transform:scaleX(0)`, `transform-origin:0`, z-index 3. On the reader's `scroll` event set `scaleX(scrollTop / (scrollHeight - clientHeight))` (0 if the content is not scrollable). Reset to 0 on open.
- **Top strip** `.rtop`: fixed, top 0, full width, flex space-between, `padding:calc(18px + env(safe-area-inset-top,0px)) var(--pad) 22px`, `background:linear-gradient(var(--paper) 55%,rgba(247,245,239,0))` so the content fades under it. z-index 2. Left `#rk` text: `Essay · No. 07` (kind, middle dot, "No.", chronological position zero-padded). Right: the close button (`Close` plus a bordered `esc` key cap: `border:1px solid var(--line);border-radius:4px;padding:2px 6px;color:var(--mute)`).

## 2. Open animation (the signature moment)

The reader **expands as a circle from where the user last pressed**.

- Track the pointer: a capture-phase `pointerdown` listener on `window` stores `rOrigin = [clientX, clientY]`. Default before any click: `[innerWidth/2, innerHeight*.9]`.
- For keyboard activation (Enter on a focused row), set `rOrigin` to the element's center first (see `02`).
- `radius()` is the distance from the origin to the farthest viewport corner: `hypot(max(x, innerWidth - x), max(y, innerHeight - y))`.
- `openNote(id)`:
  1. Remember the previously focused element (`rTrig`) to restore focus later.
  2. Fill the content (`fillReader`).
  3. If the reader is already open (navigating prev/next): reset `scrollTop` to 0, restart scroll reveals, and return. No circle animation.
  4. Otherwise: unhide, `scrollTop = 0`, mark open, lock body scroll, reset the progress line.
  5. Unless reduced motion: `reader.animate([{clipPath:"circle(0px at X Ypx)"},{clipPath:"circle(RADIUSpx at X Ypx)"}],{duration:900,easing:"cubic-bezier(.7,0,.2,1)"})`.
  6. Start scroll reveals inside the reader and focus the close button after **350ms** (0 under reduced motion) with `preventScroll:true`.
- `closeNote()` (animated; used by Esc and the close button):
  1. Mark closed immediately.
  2. Unless reduced motion: animate `circle(RADIUS) -> circle(0px)` at the **current** `rOrigin` over **700ms**, same easing, `fill:"forwards"`. Because the close button was just pressed, `rOrigin` is the button's position, so the sheet collapses into the top-right.
  3. On finish: hide the reader, restore `body.style.overflow = ""`, return focus to `rTrig`, cancel the animations.
- `closeInstant()` (used by shelf clicks, nav clicks and Edit): if open, cancel animations, hide, unlock scroll, no animation.

## 3. Content layout

`.rd{max-width:1180px;margin:0 auto;padding:18vh var(--pad);display:grid;grid-template-columns:230px 1fr;gap:64px}`. At 900px and below: one column, gap 36px, `padding-top:15vh`, and the side column becomes static and two-up (`grid-template-columns:1fr 1fr`; one column at 600px and below).

### Side column (`aside.side.rv`, reveal delay `--d:2`)
`position:sticky;top:110px;align-self:start;display:grid;gap:22px;font:400 12px/1.5 var(--mono);letter-spacing:.06em`. Each block is a `dl` (margin 0) with a `dt` label (11px uppercase `--mute`, tracking .12em, margin-bottom 4px) and a `dd` (margin 0):

1. **Filed**: full date, `September 28, 2026` (long month, day, year).
2. **Kind**: Essay, Snippet, Note or Link.
3. **Reading**: `max(1, round(wordCount / 200)) min` where wordCount counts words across the body paragraphs.
4. **Shelves**: the note's tags as `.pill` buttons with `data-shelf` (click closes the reader instantly and opens Index filtered to that shelf).
5. **In the margin** (only if the note has a margin note): `dl.marg` with `dd > p` in Instrument Serif italic 28px/1.15, `--signal`, `letter-spacing:0`, `text-transform:none`.
6. **Edit link** (only for notes written in Write, i.e. not the 12 sample notes, and not in preview mode): `button.lk[data-edit="id"]` "Edit this note".

### Article
- `h2.rt.rv` (delay `--d:1`): the title, large display type (see `01`), `margin:0 0 7vh`.
- `.rb.rv` (delay `--d:3`): one `p` per body paragraph. If a note has no body, show its excerpt as the only paragraph. First paragraph has the drop cap (spec in `01`).
- Link notes: if the note has a URL starting with `http://` or `https://`, show `a.lk` "Open the link" (`target="_blank" rel="noopener noreferrer"`) after the body. `.lk{display:inline-block;margin:6px 14px 0 0;font:400 12px var(--mono);letter-spacing:.1em;text-transform:uppercase;border-bottom:1px solid var(--signal)}`.
- **Neighbours** `nav.pn[aria-label="Neighbouring notes"]`: `display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:12vh;border-top:1px solid var(--line)`. Two buttons: left `Earlier` (previous note chronologically) and right `Later` (next), each showing a `small` label and a `b` title (Instrument Serif `clamp(24px,3vw,40px)`/1.05). The right button is right-aligned. When there is no neighbour, an empty `span` holds the cell. Hover: the button's padding shifts 12px toward the inside (`padding-left:12px` for left; `padding-right:12px` for right) over `.6s var(--ease)`. At 600px and below the grid is one column and the right button is left-aligned. Clicking a neighbour calls `openNote` while open (no circle animation, content swaps, scroll resets, reveals replay).

### Chronology
`chrono()` = all notes sorted by date ascending then id ascending. A note's **number** is its 1-based position in that list, zero-padded to two digits. Previous and next are its neighbours in that list.

## 4. Preview mode (from Write)

`openNote(-1, tmpNote)` shows an unsaved draft: the same layout, number equal to `count + 1`, **no** neighbours, **no** edit link. Nothing is added to the archive. A blank title shows `Untitled`.

## 5. Accessibility

- `role="dialog" aria-modal="true" aria-label="Note"`; the title is also visible as `h2`.
- Focus moves to the close button on open and returns to the opener on close.
- Esc closes. `Tab` order: close button, shelf pills, edit/link, neighbour buttons.
- All decorative effects are CSS only; no information is conveyed by the circle animation.

## 6. Reader checklist

- [ ] Clicking a Home row near the left expands the sheet from that point; the top-right close collapses it to the button.
- [ ] Progress line tracks scroll; resets when switching notes.
- [ ] Prev/next switch content without the circle animation; reveals replay.
- [ ] Shelves in the side column filter the Index; Edit loads the note into Write.
- [ ] Preview from Write has no neighbours and no Edit.
- [ ] Reduced motion: opens and closes instantly; reveals not animated.
