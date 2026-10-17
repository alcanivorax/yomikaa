# 01 Design system

Everything visual in Marginalia comes from the values on this page. Copy the stylesheet from `reference/marginalia-reference.html` (the `<style>` block) as your starting point; this page explains it and lists every value so you can verify.

## 1. Tokens

```css
:root{
  --bone:#eeebe3;   /* page background */
  --paper:#f7f5ef;  /* lighter sheet: reader, Life half, peek card */
  --ink:#121110;    /* text, borders, dark surfaces */
  --mute:#66635b;   /* secondary text (about 5.0:1 on bone) */
  --line:rgba(18,17,16,.16);   /* hairlines and quiet borders */
  --signal:#ff4a1c; /* the only accent */
  --ease:cubic-bezier(.16,1,.3,1);   /* expo out: all interaction motion */
  --ease2:cubic-bezier(.7,0,.2,1);   /* in-out: curtain and reader clip animations */
  --disp:"Instrument Serif",Georgia,"Times New Roman",serif;
  --read:"Newsreader",Georgia,serif;
  --mono:"DM Mono",ui-monospace,Menlo,monospace;
  --pad:clamp(20px,4vw,56px);   /* page side gutter, used everywhere */
  box-sizing:border-box;
  padding-top:env(safe-area-inset-top,0px);
  padding-bottom:env(safe-area-inset-bottom,0px);
}
*{box-sizing:border-box}
html{scroll-padding-top:env(safe-area-inset-top,0px);-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bone);color:var(--ink);font:400 18px/1.5 var(--read);-webkit-font-smoothing:antialiased;overflow-x:hidden}
::selection{background:var(--signal);color:var(--ink)}
```

Resets: `button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;text-align:inherit}`, `a{color:inherit;text-decoration:none}`. Focus ring everywhere: `:focus-visible{outline:2px solid var(--signal);outline-offset:4px}`.

## 2. Fonts

Load exactly these (Google Fonts, `display=swap`):

- Instrument Serif: regular and italic (it has only one weight).
- Newsreader: optical size axis `6..72`, weights `300..500`, normal and italic.
- DM Mono: weights 400 and 500.

| Variable | Role | Where it appears |
|---|---|---|
| `--disp` Instrument Serif | Display: headlines, note titles, big numerals, journal date, margin notes, marquee shelves, empty states, toast messages | anything large or expressive |
| `--read` Newsreader | Reading text: excerpts, note body, Write textarea, Journal textareas, peek card text | anything meant to be read as a paragraph |
| `--mono` DM Mono | Labels, nav, dates, counts, chips, buttons, hints, kind labels | anything small and structural, usually uppercase with letter-spacing |

Rule of thumb: if it is a sentence a person reads, it is Newsreader; if it is large or characterful, it is Instrument Serif; if it is a label or metadata, it is DM Mono uppercase.

## 3. The surface: canvas grain and vignette

Grain overlay (fixed, covers everything, does not intercept the pointer):

```css
body::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:95;opacity:.32;mix-blend-mode:multiply;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .07 0 0 0 0 .06 0 0 0 0 .05 0 0 0 .6 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
```

It is a static 200px tile. Do not animate it.

There is **no vignette** in this build and no SVG filter elements in the DOM. The only decorative glow is the cursor-following orb on Home (`03-home.md`).

## 4. Text styles (complete table)

Format: font / size / line-height / weight or style / letter-spacing / color / transform.

| Class or element | Spec |
|---|---|
| Body default | Newsreader 18px/1.5, 400, ink |
| `.wm` wordmark | Instrument Serif italic 28px/1 (24px at 600px and below) |
| `.clock` | DM Mono 11px, 400, tracking .1em, uppercase, opacity .8 |
| `nav` buttons | DM Mono 12px, 400, tracking .1em, uppercase (11px at 600px and below) |
| `.eyebrow` | DM Mono 12px, tracking .1em, uppercase, `--mute`, margin `0 0 3vh` |
| `.big` (home headline) | Instrument Serif 400 `clamp(46px,12.4vw,210px)`/.9, tracking -.025em |
| `.lbl` | DM Mono 11px, tracking .12em, uppercase, `--mute` |
| `.megain` (big search input) | Instrument Serif 400 `clamp(30px,5.4vw,84px)`/1.1 |
| `.hint` | DM Mono 12px, tracking .06em, `--mute` |
| `.mq` (marquee shelf) | Instrument Serif italic `clamp(34px,5vw,64px)`/1; `sup` DM Mono 11px non-italic `--mute` |
| `.sec h2` (section title) | Instrument Serif italic `clamp(34px,5vw,64px)`/1 |
| `.no` (row number) | DM Mono 12px, tracking .08em, `--mute` |
| `.tt` (row and result title) | Instrument Serif 400 `clamp(28px,4.6vw,64px)`/1.04, tracking -.01em |
| `.mt` (row meta) | DM Mono 11px, tracking .1em, uppercase, `--mute`, no wrap |
| `.pull span` | Instrument Serif italic `clamp(46px,10vw,160px)`/.95, tracking -.02em |
| `.foot` | DM Mono 11px, tracking .1em, uppercase, `--mute` |
| `.num` (index count) | Instrument Serif `clamp(70px,13vw,190px)`/.8, transparent fill with `-webkit-text-stroke:1px var(--ink)`, tracking -.03em; its `small` is DM Mono 11px uppercase `--mute` with no stroke |
| `.item p` (excerpt) | Newsreader 300 17px/1.55 `--mute`, max 58ch |
| `.item .tg` | DM Mono 11px, tracking .08em, uppercase, `--mute` |
| `.empty` | Instrument Serif italic 40px/1.1 `--mute` |
| `.pill` | DM Mono 12px, tracking .06em, uppercase |
| `.rtop` | DM Mono 12px, tracking .1em, uppercase |
| `.rt` (reader title) | Instrument Serif `clamp(44px,8vw,120px)`/.96, tracking -.02em |
| `.rb p` (reader body) | Newsreader `clamp(19px,1.7vw,22px)`/1.7, max 60ch, margin-bottom 1.2em |
| drop cap | `.rb p:first-child::first-letter`: float left, Instrument Serif 5.4em/.78, padding `.06em .1em 0 0` |
| `.side` | DM Mono 12px/1.5, tracking .06em; `dt` 11px uppercase `--mute`, tracking .12em |
| margin note in reader | Instrument Serif italic 28px/1.15, `--signal`, no uppercase, no tracking |
| `.titlein` (Write title) | Instrument Serif `clamp(46px,9vw,128px)`/.98, tracking -.02em; placeholder ink at opacity .18 |
| `.wtext` (Write body) | Newsreader `clamp(19px,1.7vw,22px)`/1.75 |
| `.marg-in input` | Instrument Serif italic `clamp(26px,3vw,38px)`/1.15, `--signal` |
| `.dock` | DM Mono 11px, tracking .1em, uppercase |
| `#wmsg` toast | Instrument Serif italic 30px/1.1 |
| `.jdate` | Instrument Serif `clamp(44px,8vw,120px)`/.95, tracking -.02em; `em` is display block (second line) |
| `.steps` | DM Mono 12px, tracking .1em, uppercase |
| `.mlabel` | Instrument Serif italic `clamp(28px,3.4vw,44px)`/1 |
| `.cd` (calendar day) | DM Mono 13px; weekday header `.wd` 10px uppercase `--mute` |
| `.me .pp` | Newsreader 300 16px/1.5, 2-line clamp; its `b` DM Mono 10px uppercase `--signal` |
| `.jp h3` (Life, Work) | Instrument Serif italic `clamp(64px,10vw,150px)`/.9, tracking -.02em |
| `.ent textarea` (journal entry text) | Newsreader `clamp(19px,1.6vw,21px)`/1.6 |
| `.rng` (time range) and `.tm` (time inputs) | DM Mono 13px, tracking .06em; `.dur` 12px uppercase, tracking .1em |
| `.tot` (part total) | DM Mono 12px, tracking .1em, uppercase, opacity .7 |
| `.thead` (Tickets heading) | Instrument Serif `clamp(44px,8vw,120px)`/.95, tracking -.02em; `em` is display block |
| `.tkt` (ticket title) | Instrument Serif `clamp(26px,3vw,40px)`/1.1, tracking -.01em |
| `.tkn` (ticket notes) | Newsreader `clamp(17px,1.4vw,19px)`/1.6 |
| `.tkk`, `.tks`, `.tkd` (ticket key, status, date) | DM Mono 13px (key) and 12px (status, date), tracking .1em, uppercase |
| `.jp .sub` | DM Mono 11px, tracking .12em, uppercase, opacity .55 |
| `.jmeta` | DM Mono 11px, tracking .1em, uppercase, `--mute` |

## 5. Shared components

**Gutter container** `.col`: `width:100%;max-width:1480px;margin:0 auto;padding-left:var(--pad);padding-right:var(--pad)`.

**Scroll reveal** `.rv`: starts `opacity:0;transform:translateY(30px)`; becomes `.rv.vis` with `opacity:1;transform:none`. `transition:opacity 1s var(--ease),transform 1s var(--ease);transition-delay:calc(var(--d,0)*60ms)`. The per-element `--d` index staggers items 60ms each.

**Pill** `.pill`: border 1px `--line`, radius 99px, padding `7px 13px`, transition `background .4s var(--ease),color .4s,border-color .4s,transform .4s var(--ease)`. Hover: border `--ink`, `translateY(-2px)`. Pressed (`aria-pressed="true"`): background `--ink`, color `--bone`, border `--ink`. Container `.pills`: flex wrap, gap 8px.

**Search highlight** `mark`: background `--signal`, color `--ink`, padding `0 .06em`, radius 2px.

**Big input** `.megain`: full width, transparent, no border except `border-bottom:1px solid var(--ink)`, radius 0, `padding:0 0 .12em`, caret `--signal`, `-webkit-appearance:none`, `transition:border-color .4s`; placeholder `--mute` at .45 opacity italic; focus makes the border `--signal`. The native search-cancel button is hidden.

**Row hover pattern** (used in the Home list, Index list, Journal month list): the container dims all rows when hovered and the hovered row returns to full opacity:
- Home `.idx:hover .row{opacity:.32}`, `.idx .row:hover{opacity:1}`
- Index `#list:hover .item{opacity:.4}`, `#list .item:hover{opacity:1}`
- Journal `.ml:hover .me{opacity:.4}`, `.ml .me:hover{opacity:1}`
Row opacity transition `.5s var(--ease)` (journal `.4s`).

**Title shift** on row hover: `.row:hover .tt,.item:hover .tt{transform:translateX(16px)}` with `.tt{transition:transform .7s var(--ease)}`; the `.no` turns `--signal` (transition `color .3s`).

## 6. Layout primitives

- Views: `.view{display:none;min-height:100svh}`, `.view.on{display:block}`. Exactly one is `.on`.
- Borders are always 1px `--line` (except the big input underline, 1px `--ink`).
- Radius vocabulary: 99px for pills and dock; 10px for calendar days; 6px for the peek card; 4px for `kbd`; 2px for `mark`; 50% for round arrows and dots (including the 9px ticket status dot). No other radii.
- Shadows exist only on: the Write dock (`0 18px 40px -14px rgba(18,17,16,.55)`) and the peek card (`0 24px 50px -20px rgba(18,17,16,.35)`).

## 7. Z-index map

| Layer | z-index |
|---|---|
| Write dock and toast | 55 |
| Top bar | 60 |
| Peek card | 70 |
| Reader overlay | 80 |
| Grain overlay | 95 |
| Curtain | 110 |
| Custom cursor | 120 |

## 8. Motion tokens

| Use | Duration | Easing |
|---|---|---|
| Hover and state changes on pills, chips, links | .3s to .5s | `--ease` or default for color |
| Row title shift | .7s | `--ease` |
| Scroll reveal | 1s, 60ms stagger | `--ease` |
| Headline letter rise | 1.2s, 26ms per letter plus .1s | `--ease` |
| Result list FLIP (moved rows) | 700ms | `--ease` |
| New result rows | 800ms, delay `min(i,8)*45`ms | `--ease` |
| Index count numeral tween | 600ms cubic ease-out | custom (1 - (1-p)^3) |
| Segmented knob | .6s | `--ease` |
| Curtain cover | 560ms | `--ease2` |
| Curtain uncover | 680ms, 140ms delay | `--ease2` |
| Reader open | 900ms | `--ease2` |
| Reader close | 700ms | `--ease2` |
| Random band flood | .8s | `--ease` |
| Marquee | 80s linear infinite | linear |

Reduced motion rules are in `02-shell-and-motion.md`.

## 7. Tailwind mapping

In the real project these tokens are declared once in Tailwind's `@theme` (`--color-bone`, `--color-paper`, `--color-ink`, `--color-mute`, `--color-signal`, `--color-line`, `--font-disp`, `--font-read`, `--font-mono`, `--ease-expo` for `--ease`, `--ease-inout` for `--ease2`) with `--pad` on `:root`, exactly as listed in `11-stack-and-backend.md` section 7. Every number on this page still applies; express them with utilities and arbitrary values (for example `text-[clamp(44px,8vw,120px)]`), never with Tailwind's default scale.
