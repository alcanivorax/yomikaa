# 02 Shell and motion

The shell is everything that persists across views: the top bar, the page curtain, the custom cursor, the peek card, the grain overlay (see `01`), scroll reveals, and global keyboard handling.

Reference locations: markup at the top of `<body>` (`.curtain`, `.cur`, `.peek`, `header.bar`); script sections "reveal on scroll", "router with curtain", "cursor, peek card, orb", "clock" and "events".

## 1. DOM order

```
body
  .curtain#curtain  (aria-hidden)  > span#cl
  .cur#cur          (hidden until enabled)
  .peek#peek        (aria-hidden)  > .k, p
  header.bar > button.wm | span.clock#clock | nav
  main > section.view#home | #search | #write | #journal | #tickets
  .reader#reader (hidden, role=dialog)
  script
```

## 2. Top bar

- `.bar{position:fixed;top:0;left:0;right:0;z-index:60;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:calc(16px + env(safe-area-inset-top,0px)) var(--pad) 16px;color:#fff;mix-blend-mode:difference;pointer-events:none}`
- `.bar>*{pointer-events:auto}` so only the controls catch clicks.
- **The inversion trick:** the bar is white text with `mix-blend-mode:difference`, so it appears dark over the bone page and light over the black Work half, the black random band and the black curtain. Do not give any ancestor `isolation`, `transform`, `opacity < 1` or `filter` or the blend breaks. The bar must be a direct child of `body`.
- Left: `button.wm` "Yomikaa" (italic display 28px, 18px at 600px and below) with `data-go="home"` and `aria-label="Yomikaa, home"`.
- Center: `span.clock` showing `Sun · 19:52` (short weekday, middle dot, 24-hour `HH:MM`, local time). Refreshes every 20 seconds. Hidden at 600px and below.
- Right: `nav` with five buttons in this order: **Index** (`data-go="search"`), **Write** (`data-go="write"`), **Journal** (`data-go="journal"`), **Tickets** (`data-go="tickets"`), **Random** (`data-random`). Gap 26px.
- **At 600px and below** the bar tightens so all five items fit at 360px without clipping: `.bar{gap:10px}`, wordmark 18px, nav `gap:9px;font-size:9.5px;letter-spacing:.02em` (the clock is already hidden). Verify at 360 and 390 that the nav's right edge sits at the page gutter (`--pad`) and does not overlap the wordmark.
- Nav button underline: each has a 1px `currentColor` line at `bottom:2px`, `transform:scaleX(0)` with `transform-origin:right`, `transition:transform .5s var(--ease)`. On hover and on the active page (`aria-current="page"`) it becomes `scaleX(1)` with `transform-origin:left`, so it draws in from the left and retracts to the right.
- Home has no nav item; the wordmark goes home.

## 3. View switching and the curtain

State: `cur` (current view id, starts `home`), `busy` (boolean).

`go(view)`:
1. If `busy`, return.
2. If `view === cur`, smooth-scroll to top and return (`behavior:"auto"` under reduced motion).
3. If reduced motion, call `swap(view)` immediately and return.
4. Otherwise: `busy = true`; set the curtain label (`#cl`) to the view name (`Yomikaa`, `Index`, `Write`, `Journal`, `Tickets`).
5. Animate `#curtain` with the Web Animations API: `translateY(100%)` to `translateY(0)`, **560ms**, easing `cubic-bezier(.7,0,.2,1)`, `fill:"forwards"`.
6. When finished: call `swap(view)`, then animate `translateY(0)` to `translateY(-100%)`, **680ms**, **delay 140ms**, same easing, `fill:"forwards"`.
7. When finished: `busy = false` and cancel all animations on the curtain (it returns to its CSS resting position `translateY(100%)`, off-screen below).

Curtain styling: `position:fixed;inset:0;z-index:110;background:var(--ink);color:var(--bone);display:flex;align-items:center;justify-content:center;transform:translateY(100%);pointer-events:none`. Label: Instrument Serif italic `clamp(54px,12vw,190px)`/1, tracking -.02em.

`swap(view)` does, in order:
1. Toggle `.on` so only the target section has it.
2. Set `aria-current="page"` on the matching nav button, remove it from the others.
3. `cur = view`; `scrollTo(0,0)`.
4. Per-view init: Home runs `buildHome()` then `playHero()`; Index runs `render()`; Write runs `fillWrite()`; Journal runs `renderJournal()`; Tickets runs `renderTickets()`.
5. `revealAll(section)` (scroll reveals restart, see section 4).
6. Focus: Index focuses `#q2`, Write focuses `#wt`, after **900ms** (0 under reduced motion), with `preventScroll:true`. Home, Journal and Tickets do not take focus.

Any click on a `[data-go]` element first closes the reader instantly (if open), then calls `go`.

## 4. Scroll reveals

One `IntersectionObserver` with `threshold:.12`. Callback adds `.vis` to intersecting targets and unobserves them. `revealAll(root)` finds every `.rv` inside `root`, removes `.vis`, and observes it again. It is called on initial load for Home, on every `swap`, and whenever the reader opens or switches notes. Rows built by `buildHome()` get `--d` equal to their index so they cascade in 60ms apart.

## 5. Custom cursor (fine-pointer, no reduced motion only)

Enabled when `matchMedia("(hover:hover) and (pointer:fine)").matches` and the user has not requested reduced motion. Variable `FX` holds that boolean. Otherwise nothing in this section runs, the native cursor is used and `#cur` stays hidden.

- Add class `has-cur` to `<html>`. CSS: `.has-cur,.has-cur a,.has-cur button{cursor:none}` and `.has-cur input,.has-cur textarea{cursor:text}`.
- `.cur`: fixed, 14px white circle, `margin:-7px 0 0 -7px`, `mix-blend-mode:difference`, `pointer-events:none`, `z-index:120`, transition on width, height, margin (.35s `--ease`) and opacity (.3s).
- States: `.hov` (64px, margin -32px) when the pointer is over `a, button, .row, .item, .cd, .me, .pill, select` and not over a text field; `.txt` (opacity 0) over `input, textarea`.
- Position: one `requestAnimationFrame` loop eases toward the pointer: `c += (target - c) * .22` each frame, applied as `translate3d`.

## 6. Peek card (Home list only)

`#peek`: fixed, 300px wide, `background:var(--paper)`, 1px `--line` border, radius 6px, padding `16px 18px 18px`, opacity 0 by default, `.on` opacity 1 (transition .3s), shadow `0 24px 50px -20px rgba(18,17,16,.35)`, `pointer-events:none`, z-index 70. Contents: `.k` (DM Mono 11px uppercase `--mute`, `Kind · Sep 28`) and `p` (Newsreader 15px/1.5, clamped to 5 lines).

Behavior (inside the same rAF loop):
- Target position: pointer + 26px on both axes, clamped to `x <= innerWidth - 324` and `y <= innerHeight - 190`.
- Position eases `+= delta * .14`.
- Rotation: `clamp(horizontalVelocity * .12, -9, 9)` degrees, eased with factor .2. Horizontal velocity is `targetX - currentX` each frame.
- Scale eases (factor .2) toward 1 when shown and .92 when hidden.
- Applied as `translate3d(px,py,0) rotate(r) scale(s)`.
- Shown on `pointerover` of a `.row` inside `#recent`; hidden on `pointerleave` of `#recent`. Excerpt text is the note's excerpt (`ex`).

## 7. Orb (Home hero only)

See `03-home.md`. It lives in the same loop: when the current view is Home, `offset += ((pointer - viewportCenter) * .08 - offset) * .05` per axis, applied as `translate3d`.

## 8. Keyboard (global)

Single `keydown` listener on `document`. `inField` is true when the focused element is `INPUT` or `TEXTAREA`.

| Key | Condition | Action |
|---|---|---|
| `Enter` | not in a field; focused element is inside `.row` or `.item` | set the reader origin to the element's center, click it |
| `/` | not in a field, reader closed | `preventDefault`; Home focuses `#q1`, Index focuses `#q2`, any other view navigates to Index |
| `Escape` | reader open | close reader (animated) |
| `Escape` | reader closed | blur the focused element |
| `Cmd/Ctrl + S` or `Cmd/Ctrl + Enter` | current view is Write | `preventDefault`, file the note |

## 9. Global click delegation

One `click` listener on `document` routes by the nearest matching ancestor, in this priority order: `[data-go]`, `[data-shelf]`, `[data-open]`, `.item`, `[data-close]`, `[data-edit]`, `[data-random]`, `[data-wk]`, `[data-rm]`, `[data-step]`, `[data-day]`, `[data-mstep]`, `[data-m]`, `[data-mtoggle]`. Each is described in the page for its view. The journal entry editor (`data-add`, `data-erm`, `data-f`) and the Tickets view (`data-tfil`, `data-tdel`, `data-tf`, `#tadd`) use their own listeners attached to their sections and are **not** part of this list; do not reuse `data-rm` (Write chips) or any name above. The reader tracks the last `pointerdown` position in the capture phase to know where to expand from (`05-note-reader.md`).

## 10. Reduced motion

If `prefers-reduced-motion: reduce`:
- No curtain: views swap instantly. CSS `display:none` on `.curtain` and `.orb`.
- No custom cursor, no peek card movement.
- Headline letters are visible immediately (`.ch{transform:none!important;animation:none!important}`).
- `.rv` elements are always visible with no transition.
- Marquee does not scroll (`animation:none`).
- Reader opens and closes without the circle animation.
- Index rows do not run FLIP or entry animations; the count numeral jumps to its value.
- Scroll behavior is `auto`.

## 11. Pitfalls specific to the shell

- `position:fixed` children inside any element with `transform` (including `.rv`) become positioned against that ancestor. Keep the Write dock, toast and reader outside transformed ancestors.
- `100svh` (not `100vh`) for full-height sections so mobile browser bars do not cause jumps.
- The `:root` carries `padding-top/bottom: env(safe-area-inset-*)`. The fixed bar and dock add their own safe-area padding because fixed elements ignore root padding.
- Set `document.body.style.overflow = "hidden"` while the reader is open, and restore `""` when it closes (including the instant-close path).
