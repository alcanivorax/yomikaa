# 07 Journal

> **Production build:** the `mg.*` storage keys named on this page describe the reference. In the real project the same data is saved through the API to the database (`11-stack-and-backend.md`); debounce times, shapes and behavior stay as written here.

Reference: `<section class="view" id="journal">`, CSS sections `/* journal */` and `/* journal month browser */`, script section `/* journal */` (`jd`, `jm`, `jOpen`, `renderBrowse`, `renderJournal`, `stepDay`, `stepMonth`, `pickDay`, `has`, `snip`, `mname`, and the entry editor: `E`, `PART`, `toMin`, `spanMin`, `fmtDur`, `partMin`, `used`, `sortPart`, `loadDay`, `entHTML`, `drawPart`, `updTot`, `addEntry`, `saveDay`, `queueSave`, `flushSave`, `normPart`, `J`).

One page per calendar day, two parts: **Life** and **Work**. Each part is a **list of timed entries**: a start time, an end time and a line of text ("from this to this"), not one plain text box. Entries are private: they never appear in the Index, the Random action, or anywhere public.

```
section#journal
  .col.jh
    .jtop   h2.jdate#jdate  |  .steps (Earlier, Today#jtoday, Later#jnext)
    .jb
      .jbh  .jm (‹ , button#jmlabel, › #jmnext)  |  .months#jmonths
      .jbody#jbody  .cal#jcal  |  .ml#jmlist
  .jsplit
    .jp.life  .jph (h3 "Life" | span.tot#jlt), .sub, .ents#jl (role=list), button.addent[data-add="life"]
    .jp.work  .jph (h3 "Work" | span.tot#jwt), .sub, .ents#jw (role=list), button.addent[data-add="work"]
  .jmeta  span#jsaved | span#jcount
```

## 1. State

```ts
jd: string        // selected day, "YYYY-MM-DD", starts today (local)
jm: string        // browsed month, "YYYY-MM", starts as the month of jd
jOpen: boolean    // month browser expanded; starts true when viewport > 900px wide, otherwise false
```
Storage key `mg.journal`: an object keyed by date: `{ "2026-10-11": { life: Entry[], work: Entry[] } }` where `Entry = { from: "HH:MM" | "", to: "HH:MM" | "", text: string }`. A day with no used entries in either part is deleted (see section 4 for `used`). **Migration:** old data stored `life` and `work` as plain strings; `normPart` converts a non-empty string to one entry `{from:"",to:"",text:string}` and an empty string to `[]`, on every read (`J()`), so old data keeps working and is rewritten in the new shape on the next save.

`has(day)` is true when `life.length>0` or `work.length>0` (used for dots, chip counts, list, footer counts). Local-date helper: `date.toLocaleDateString("en-CA")` gives `YYYY-MM-DD` in local time. Never use UTC (`toISOString`) for day keys.

## 2. Header

`.jh{padding-top:128px;padding-bottom:5vh;display:grid;gap:26px}` inside `.col`.

- `.jtop{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}`.
- **Date heading** `h2.jdate#jdate`: two lines. First line the weekday and a comma (`Sunday,`), second line (an `em`, display block, italic) the month and day (`October 11`). Format via `toLocaleDateString("en", ...)`.
- **Steps** `.steps{display:flex;gap:22px;font:400 12px var(--mono);letter-spacing:.1em;text-transform:uppercase}`: buttons `Earlier` (`data-step="-1"`), `Today` (`data-step="0"`, `#jtoday`), `Later` (`data-step="1"`, `#jnext`). Each has `padding:6px 0;border-bottom:1px solid var(--ink)`; hover turns text and border `--signal` (`transition:color .3s,border-color .3s,opacity .3s`); disabled is opacity .25 with no pointer events.
- Disabled logic: `Later` is disabled when `jd >= today`; `Today` is disabled when `jd === today`.
- `stepDay(s)`: `0` sets `jd` to today; otherwise add `s` days to `jd` and apply only if the result is not after today. Always set `jm` to the month of the new `jd`, then re-render.

## 3. Month browser

### Month bar (`.jbh`)
`display:flex;flex-wrap:wrap;align-items:center;gap:14px 28px`.
- `.jm{display:flex;align-items:center;gap:6px}` containing:
  - `button.ar[data-mstep="-1"]` `‹` (aria-label "Previous month").
  - `button.mlabel#jmlabel[data-mtoggle]` showing `October 2026` (italic display `clamp(28px,3.4vw,44px)`/1, `padding:0 10px`, flex with `gap:12px`), `aria-expanded` reflects `jOpen`, `aria-controls="jbody"`. A small chevron (`::after`, 8px box with right and bottom 1px borders, rotated 45deg and nudged up 3px) rotates to -45deg when collapsed (`transform .5s var(--ease)`).
  - `button.ar#jmnext[data-mstep="1"]` `›`, disabled when `jm >= current month`.
  - `.ar`: 40px circle, 1px `--line` border, DM Mono 18px, centered; hover fills `--ink` with `--bone` text and `--ink` border (`.4s var(--ease)`); disabled opacity .25.
- **Month chips** `.months#jmonths` (`role="group" aria-label="Months of this year"`): `display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 0;min-width:0` (WebKit scrollbar hidden). Twelve `.pill` buttons `data-m="YYYY-MM"` for the year of `jm`: short month name (`Jan` to `Dec`) plus, when that month has written days, a `<sup>` count (9px, margin-left 4px, opacity .7). Chips: `flex:none`. The pressed chip is `jm`. Months after the current month are `disabled` (opacity .3, no pointer events). Hidden entirely (`hidden`) while the browser is collapsed.
- `stepMonth(s)`: add `s` months to `jm`; apply only if not after the current month; re-render the browser only (not the editor).
- Month label click toggles `jOpen`, which shows or hides `.months` and `#jbody` (via the `hidden` attribute).

### Body (`.jbody#jbody`)
`display:grid;grid-template-columns:minmax(280px,360px) 1fr;gap:clamp(28px,5vw,72px);align-items:start;padding-top:8px`. At 900px and below: one column, and the list loses its max-height.

**Calendar** `.cal#jcal`: `display:grid;grid-template-columns:repeat(7,1fr);gap:4px`.
- Header row: seven `.wd` cells `M T W T F S S` (Monday first), DM Mono 10px uppercase `--mute`, centered, `padding-bottom:6px`.
- Leading blanks: `(firstWeekdayOfMonth + 6) % 7` empty `span` cells (JS `getDay()` is Sunday = 0).
- Day buttons `button.cd[data-day="YYYY-MM-DD"]`: `aspect-ratio:1;display:grid;align-content:center;justify-items:center;gap:4px;border:1px solid transparent;border-radius:10px;font:400 13px var(--mono)`; transition `background .35s var(--ease),color .35s,border-color .3s,transform .35s var(--ease)`. Hover: border `--ink` and `translateY(-2px)`. Today: border `--signal` (class `td`). Selected (`aria-pressed="true"`, matches `jd`): background `--ink`, color `--bone`, border `--ink`. Future days: `disabled` (opacity .25).
- Each day contains the number and two 6px dots (`i > b, b`): first is Life, second is Work. Dots are 1px-bordered circles at opacity .45; a dot that has text gets class `f` (filled `--signal`, border `--signal`, opacity 1).
- `aria-label` per day: full date (`Sunday, October 11`) plus `, has an entry` when it has text.

**Entries list** `.ml#jmlist`: `border-top:1px solid var(--line);max-height:min(60svh,460px);overflow-y:auto;scrollbar-width:thin`.
- Heading `h5` (DM Mono 11px, tracking .12em, uppercase, `--mute`, `margin:14px 0 6px`): `3 days written in October` (singular `1 day`), empty string when there are none.
- Rows `button.me[data-day]`, newest day first: `display:grid;grid-template-columns:70px 1fr;gap:0 16px;width:100%;padding:14px 0;border-bottom:1px solid var(--line)`. Left `span.dy`: `Sun 11` (short weekday and date, DM Mono 12px, tracking .06em, uppercase, `--mute`). Right: up to two `span.pp` previews, Life first then Work, each only if that part has text. `.pp`: Newsreader 300 16px/1.5, clamped to 2 lines, `margin:0 0 4px`; a `b` prefix (`Life` or `Work`, DM Mono 10px, tracking .12em, uppercase, `--signal`, `margin-right:8px`). Preview content for a part is: the part's **total duration** (`fmtDur` of the summed spans, omitted when 0), then ` · ` if there is also text, then the part's entry texts (trimmed, non-empty) joined with ` · `, whitespace-collapsed, cut at 110 characters plus `...`. Example: `Work 3h 30m · Fixed redirect · Code review`. A part appears only if it has at least one stored entry (`list.length>0`), even if its preview is just a duration.
- Hover: siblings dim to .4 (`.ml:hover .me`), hovered row returns to 1.
- Empty month: `Nothing written in October yet.` (Instrument Serif italic 28px/1.1 `--mute`, `padding:24px 0`).
- Month browser re-renders on: view entry, any day pick, month step, chip click, toggle, and after every autosave, so dots, chip counts and the list stay current.
- `#jcount` (in the footer line) shows `N days written` (`1 day written`) across all months, empty at zero.

### Picking a day
Clicking a calendar day or a list row (`pickDay`): set `jd`, set `jm` to its month, re-render the editor and browser, then `scrollIntoView({behavior:"smooth", block:"start"})` on `.jsplit` (`auto` under reduced motion).

## 4. The split editor

`.jsplit{display:grid;grid-template-columns:1fr 1fr;min-height:78svh}`. At 900px and below: one column (Life above Work).

- **Life** `.jp.life{background:var(--paper);--jl:var(--line);color-scheme:light}` and **Work** `.jp.work{background:var(--ink);color:var(--bone);--jl:rgba(238,235,227,.2);color-scheme:dark}`. `--jl` is the hairline color used inside each half (so time inputs and rules read on both backgrounds); `color-scheme` makes the native time picker match the half. Both: `padding:clamp(28px,5vw,64px) var(--pad) 140px`.
- Head `.jph{display:flex;align-items:baseline;justify-content:space-between;gap:4px 16px;flex-wrap:wrap}` containing the title `h3` (`Life` or `Work`, italic display `clamp(64px,10vw,150px)`/.9, tracking -.02em, `margin:0 0 6px`) and the **total** `span.tot` (`#jlt`, `#jwt`): DM Mono 12px, tracking .1em, uppercase, opacity .7, `white-space:nowrap`, `min-height:1em`.
- `.sub` captions: Life `how the day felt, who you saw`; Work `what moved, what stuck, what is next` (DM Mono 11px, uppercase, tracking .12em, opacity .55, `margin-bottom:28px`).
- Entries box `.ents#jl` / `#jw` (`role="list"`, `aria-label` "Life entries" / "Work entries"): `border-top:1px solid var(--jl)`.
- **Add button** `button.addent[data-add="life|work"]` "Add entry" under each list: `display:inline-block;margin-top:20px;font:400 12px var(--mono);letter-spacing:.1em;text-transform:uppercase;padding:8px 0;border-bottom:1px solid currentColor;transition:color .3s,border-color .3s`; hover color `--signal`.

### Entry row (`.ent`)

```
div.ent[role=listitem][data-p="life|work"][data-i="index"]
  div.rng   input.tm[type=time][data-f=from]  span.to "to"  input.tm[type=time][data-f=to]  span.dur
  button.rmv[data-erm=index][data-p]   span.rt "Remove"   span.rx "x" (the multiplication sign)
  textarea[data-f=text][rows=1]
```

- `.ent{display:grid;grid-template-columns:1fr auto;gap:6px 12px;align-items:center;padding:16px 0 18px;border-bottom:1px solid var(--jl)}`. The textarea spans both columns on its own row (`grid-column:1/-1`).
- `.rng{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;font:400 13px var(--mono);letter-spacing:.06em}`; `.rng .to{opacity:.5;aria-hidden}`.
- Time inputs `.tm`: native `type="time"` (24-hour value `HH:MM`), `font:inherit;letter-spacing:inherit;color:inherit`, transparent, no border except `border-bottom:1px solid var(--jl)`, radius 0, `padding:4px 2px`, `min-width:0`, caret `--signal`, `appearance:none`, `transition:border-color .3s`; focus border `--signal`. `aria-label` "From time" and "To time".
- Duration `.dur`: DM Mono 12px, uppercase, tracking .1em, opacity .7, shows `fmtDur(spanMin(entry))` or nothing.
- Remove `.rmv`: DM Mono 12px, uppercase, tracking .1em, opacity .35, `padding:6px 0`, `transition:opacity .3s,color .3s`. Opacity 1 on row hover and on keyboard focus; hover color `--signal`. On touch devices (`@media (hover:none)`) opacity .7. `aria-label` "Remove this entry". At 600px and below the word is hidden (`.rt{display:none}`) and only `x` shows (`.rx{display:inline;font-size:24px;letter-spacing:0;line-height:1}`, `padding:8px 0 8px 12px`) so the duration never wraps under the times.
- Textarea: block, full width, transparent, no border, no outline, `resize:none;overflow:hidden`, `color:inherit`, Newsreader `clamp(19px,1.6vw,21px)`/1.6, caret `--signal`, `padding:2px 0 0`; placeholder inherits color at opacity .35 italic. Placeholders: Life `What filled this time?`; Work `What did you work on?`. Auto-grow like the Write body (`height:auto` then `scrollHeight + 4px`).

### Time math (pure functions)

```ts
const toMin = (t: string) => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ""); return m ? +m[1] * 60 + +m[2] : null };
const spanMin = (e: Entry) => { const a = toMin(e.from), b = toMin(e.to); if (a === null || b === null) return 0; let d = b - a; if (d < 0) d += 1440; return d };   // an end before the start means it crossed midnight
const fmtDur = (m: number) => { if (m <= 0) return ""; const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m` };
const partMin = (list: Entry[]) => list.reduce((s, e) => s + spanMin(e), 0);
const used = (e: Entry) => !!(e.text.trim() || (e.from && e.to));
```
- Spans and totals ignore entries missing either time. Overlapping entries are allowed and are simply summed.
- `used`: an entry counts, is saved and is counted in totals when it has text, or when both times are set. A row with only a start time is a draft: it is not saved and not counted.

### Total line (`updTot(part)`)
`N entry` / `N entries` (counting `used` entries) followed by ` · ` and the summed duration when above zero, for example `3 entries · 5h 15m`. Empty string when there are no used entries.

### Behavior
- **State:** `E = { life: Entry[], work: Entry[] }` is the working copy of the selected day; `jDraw` is true while a list is being re-rendered; `jPend` marks an unsaved change.
- **Loading a day (`loadDay`):** copy the stored entries, sort each part (below), and if a part is empty add one blank entry `{from:"",to:"",text:""}` so there is always a row to type into. Then `drawPart` renders both parts.
- **Add entry (`addEntry(part, after?)`):** inserts a new entry after row `after` (or at the end for the button). The new entry's `from` is pre-filled with the previous entry's `to` when it has one (so consecutive blocks chain), and focus moves to its `to` input if `from` was pre-filled, otherwise to `from`.
- **Typing:** a delegated `input` listener on the journal section writes the field into `E`; text fields auto-grow; time fields refresh that row's `.dur`; the part total updates; autosave is queued. Rows are **not** re-rendered while typing.
- **Enter in a textarea** (without Shift, not during IME composition): if the row has text, add a new entry after it; otherwise do nothing. Shift+Enter inserts a newline.
- **Remove:** `data-erm` splices the entry out; if the part is now empty a blank entry is added; re-render the part and queue a save. No confirmation.
- **Sorting (`sortPart`):** entries sort by start time ascending; entries without a valid start sink to the bottom; ties keep their original order (stable). Sorting happens on load and on **focusout from a part's list**, never while typing, and only when focus actually leaves the list (`relatedTarget` is outside the box) and no re-render is in progress (`jDraw` false). When the order changed, re-render the part and queue a save.
- **Autosave:** `queueSave()` sets `jPend` and saves **600ms** after the last change. `saveDay()` keeps only `used` entries (`{from,to,text}`), writes `{life,work}` for `jd` (deleting the day when both lists are empty), flashes `Saved` and refreshes the month browser.
- **Flushing:** `flushSave()` saves immediately if a save is pending. It runs before changing day, month-pick, re-entering the view, and when the tab becomes hidden (`visibilitychange`), so nothing is lost.

## 5. Footer line

`.jmeta{display:flex;justify-content:space-between;gap:12px;padding:20px var(--pad) 40px}` with DM Mono 11px uppercase `--mute`: `span#jsaved` (the word `Saved`, a `.saved` span that flashes) and `span#jcount`.

## 6. Initial state notes

- On first open, `jd` is today and `jm` is the current month; the browser is expanded on screens wider than 900px and collapsed on narrower ones.
- The cursor treats `.cd`, `.me` and `.pill` as hoverable (large ring).
- `Later` and the next-month arrow never navigate into the future.
- Click delegation for this view uses `data-add` and `data-erm` on a listener attached to `#journal`, separate from the `document` listener. The Write view's tag chips use `data-rm`, so the journal must not reuse that name.

## 7. Journal checklist

- [ ] Date heading, steps, Earlier/Today/Later disable rules behave exactly.
- [ ] Calendar starts on Monday, blanks are correct for every month, future days disabled, today ringed.
- [ ] Dots fill as soon as a part has a stored entry (after the autosave tick).
- [ ] Month chips show counts; chips for future months are disabled; arrows cross year boundaries.
- [ ] List shows newest first; previews show duration and text; clicking loads the day and scrolls to the editor.
- [ ] Collapse toggle hides chips, calendar and list; chevron rotates.
- [ ] Life half is light, Work half is black; top bar text inverts correctly over the Work half; the time pickers look right on both.
- [ ] Each part: Add entry chains the previous end time; duration shows per row; the total line sums used entries.
- [ ] An end earlier than the start counts as crossing midnight (22:00 to 01:30 is 3h 30m).
- [ ] A row with only a start time is not saved and not counted.
- [ ] Entries re-sort by start time only after focus leaves the list, never mid-typing; focus is not lost.
- [ ] Enter in a filled textarea adds a row; Shift+Enter adds a newline; Remove works and always leaves one row to type in.
- [ ] Reload keeps entries; empty days are removed; data stored in the old plain-text shape still loads.
- [ ] At 600px and below Remove shows as an x and the duration stays on the time line.
