# 06 Write

> **Production build:** the `mg.*` storage keys named on this page describe the reference. In the real project the same data is saved through the API to the database (`11-stack-and-backend.md`); debounce times, shapes and behavior stay as written here.

Reference: `<section class="view" id="write">`, CSS section `/* write */`, script section `/* write */` (`W`, `blank`, `fillWrite`, `drawChips`, `placeKnob`, `draftSave`, `draftNote`, `fileIt`, `editNote`, `msg`, `flash`, `grow`, `words`, `addTag`).

Write is a single distraction-free column with a floating action dock. No toolbar, no preview pane.

```
section#write
  .wr
    input.titlein#wt
    .wrow  .seg#wkinds (buttons + span.knob#knob)  |  .chips (span#wchips, input.mini#wti)
    .wrow#wurlrow (hidden unless Link)  input.mini#wurl
    textarea.wtext#wbody
    .marg-in  label.lbl | input#wm
  .dock  (only visible while Write is the current view)
     span.st: #wcount, #wsaved   | button#wsee | button#wclear | button#wfile.go
  #wmsg  (toast, role=status, aria-live=polite)
```

## 1. Layout

`.wr{max-width:900px;margin:0 auto;padding:18vh var(--pad) 220px}`. The large bottom padding keeps content clear of the dock.

### Title
`input.titlein#wt`: borderless, transparent, no outline, Instrument Serif `clamp(46px,9vw,128px)`/.98, tracking -.02em, caret `--signal`, placeholder `Untitled` in ink at opacity .18, `aria-label="Title"`.

### Kind and shelves row
`.wrow{display:flex;flex-wrap:wrap;align-items:center;gap:14px 22px;margin:5vh 0 4vh}`.

1. **Segmented control** `.seg#wkinds` (`role="group" aria-label="Kind"`): options `Essay`, `Snippet`, `Note`, `Link`. `.seg{position:relative;display:inline-flex;border:1px solid var(--line);border-radius:99px;padding:3px}`. Buttons: DM Mono 12px, tracking .08em, uppercase, `padding:8px 16px`, radius 99px, `position:relative;z-index:1`, `transition:color .4s`; pressed button text is `--bone`.
   - **Sliding knob** `span.knob#knob`: absolutely positioned (`top:3px;bottom:3px;left:0;width:0;border-radius:99px;background:var(--ink)`), `transition:left .6s var(--ease),width .6s var(--ease)`. `placeKnob(instant)` sets `left` and `width` from the pressed button's `offsetLeft` and `offsetWidth`. When `instant` is true, temporarily set `transition:none`, apply, force reflow, then clear the inline transition (used on initial fill, window resize, and font load so it never animates from 0).
   - Default kind: Essay.
2. **Shelves** `.chips{display:flex;flex-wrap:wrap;align-items:center;gap:8px}`:
   - `span#wchips` (`display:contents`) holds one `button.chip` per tag, text `#tag`, `title="Click to remove"`, `data-rm="index"`. `.chip`: DM Mono 12px, tracking .06em, uppercase, `padding:7px 12px`, `border:1px solid var(--ink)`, radius 99px; hover turns background and border to `--signal` and adds `text-decoration:line-through`.
   - `input.mini#wti` placeholder `add a shelf` (uppercase placeholder), `aria-label="Add a shelf"`. `.mini`: transparent, `border-bottom:1px solid var(--line)`, DM Mono 12px, tracking .06em, `padding:6px 2px`, `min-width:170px`, caret `--signal`; focus border `--signal`.
   - **Tag entry:** `Enter` or `,` commits the typed text; `Backspace` on an empty input removes the last tag; `blur` commits pending text. Committed text is slugified: lowercase, replace runs of non `[a-z0-9]` with `-`, trim leading and trailing `-`. Empty slugs and duplicates are ignored.

### Link address row
`.wrow#wurlrow` (hidden unless kind is Link) containing `input.mini#wurl` with `min-width:min(100%,440px)`, placeholder `https://`, `aria-label="Link address"`.

### Body
`textarea.wtext#wbody`: block, full width, `min-height:46vh`, transparent, no border or outline, `resize:none;overflow:hidden`, Newsreader `clamp(19px,1.7vw,22px)`/1.75, caret `--signal`, placeholder `Begin anywhere.` (italic, `--mute`, opacity .6), `aria-label="Body"`.
- **Auto-grow:** on every input and on fill, set `height:auto` then `height = scrollHeight + 4px`.
- Each non-empty line becomes a paragraph when filed.

### Margin note
`.marg-in{margin-top:6vh;border-top:1px solid var(--line);padding-top:18px;display:grid;gap:6px}`: `label.lbl[for="wm"]` text `In the margin · optional, keep it rare`, and `input#wm` (Instrument Serif italic `clamp(26px,3vw,38px)`/1.15, `--signal`, transparent, placeholder `a thought for the side of the page` in `--mute` at .5 opacity).

## 2. Dock and toast

- `.dock`: `position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:55;display:none;align-items:center;gap:6px;background:var(--ink);color:var(--bone);border-radius:99px;padding:8px 8px 8px 22px;box-shadow:0 18px 40px -14px rgba(18,17,16,.55);font:400 11px var(--mono);letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;max-width:calc(100vw - 24px)`. Shown only while Write is current: `#write.on .dock{display:flex}`.
- Contents, left to right: `span.st` (opacity .7, `margin-right:12px`) containing `#wcount` (`N words`) a middle dot and `#wsaved` (the word `saved`, hidden until flashed); `button.g#wsee` "Preview"; `button.g#wclear` "Start over"; `button.go#wfile` "File it".
- `.g`: `padding:10px 14px;border-radius:99px`, hover background `rgba(255,255,255,.14)` (`transition:background .3s`).
- `.go`: `background:var(--signal);color:var(--ink);padding:12px 22px;border-radius:99px`, hover `scale(1.05)` (`transition:transform .4s var(--ease)`).
- At 600px and below the `.st` span is hidden and the dock's left padding is 10px.
- **Toast** `#wmsg` (`role="status" aria-live="polite"`): `position:fixed;left:50%;bottom:calc(88px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:55;font:italic 400 30px/1.1 var(--disp);text-align:center;pointer-events:none;opacity:0;transition:opacity .4s;width:max-content;max-width:90vw`. `msg(text)` sets the text, fades in, and fades out after 2600ms (clearing any previous timer); `msg("")` hides it at once.
- **Saved flash** (`flash`): sets the element's opacity to 1, then back to 0 after 1300ms (`.saved{opacity:0;transition:opacity .4s}`).

## 3. State and autosave

```ts
W = { id: number|null, title: string, kind: Kind, tags: string[], body: string, m: string, url: string }
```
- On load, `W` = blank merged with any saved draft from storage key `mg.draft`.
- Every input event writes the field into `W`, clears the toast, and schedules a draft save **700ms** after the last keystroke (debounced): store `W` under `mg.draft` and flash "saved". Body input also updates the word count (`N words`, counting whitespace-separated words of the trimmed body; 0 for empty) and auto-grows.
- Changing kind, adding or removing a tag also schedules a draft save.
- `fillWrite()` runs on entering the view: renders the kind buttons plus knob, chips, shows or hides the URL row, writes all field values from `W`, updates the word count, and grows the textarea (via `setTimeout 0`).

## 4. Actions

### File it (button, or `Cmd/Ctrl+S` or `Cmd/Ctrl+Enter`)
Validate in this order and stop at the first failure, showing the toast and focusing the offending field:
1. Title is empty after trim: `Give it a title first.` (focus title)
2. Body is empty after trim, unless kind is Link with a non-empty URL: `Write something first.` (focus body)
3. Kind is Link and the URL does not start with `http://` or `https://`: `A link needs a full address, starting with http.` (focus URL)

Then build the note (`draftNote`):
- `title`: trimmed, or `Untitled`.
- `kind`, `tags` (copy).
- `date`: today (local `YYYY-MM-DD`), or the original date when editing an existing note.
- `body`: the trimmed body split on newlines into trimmed non-empty paragraphs.
- `m`: trimmed margin note or undefined.
- `url`: trimmed URL only for Link, otherwise undefined.
- `ex` (excerpt): the paragraphs joined with a space (or the URL if there is no body), first **140** characters, plus `...` if it was longer.

Then: if `W.id` is set, update that note in place (delete `m` or `url` if now empty); otherwise assign `id = notes.length`, push, and create its Index row node. Persist all user-written notes (everything after the 12 samples, without ids) under `mg.notes`. Reset `W` to blank, clear the draft key, re-render the form, rebuild Home data (counts, recent list, marquee), show the toast `Filed.`, and after **500ms** open the new note in the Reader.

### Preview
Opens the Reader in preview mode with the current draft (`05`). Nothing is saved to the archive.

### Start over
Resets `W` to blank, removes `mg.draft`, re-renders the form, clears the toast. No confirmation.

### Edit (from the Reader)
`editNote(id)`: close the reader instantly, set `W` from the note (`body` is the paragraphs joined with a blank line `\n\n`; missing fields become empty strings), and show the Write view (if already on Write, just re-fill). Filing then updates the existing note.

## 5. Rules

- Sample notes (the first 12) are never editable (no Edit link in the Reader).
- No delete, no image upload, no markdown, no scheduling. Not built.
- Writing is plain text; paragraphs are line-based.

## 6. Write checklist

- [ ] Knob slides between kinds; no animation on first paint or resize.
- [ ] Tags: Enter and comma commit, Backspace removes the last, blur commits, duplicates ignored.
- [ ] Draft survives reload and view changes; "saved" flashes after typing stops.
- [ ] Validation messages are exact and focus the right field.
- [ ] Filing shows `Filed.` then opens the Reader; the note is immediately in Home, Index, and the marquee counts.
- [ ] Editing a filed note updates it in place and keeps its date.
- [ ] Dock only appears on Write; on phones the status text is hidden.
