# 10 Tickets

> **Production build:** the `mg.*` storage keys named on this page describe the reference. In the real project the same data is saved through the API to the database (`11-stack-and-backend.md`); debounce times, shapes and behavior stay as written here.

Reference: `<section class="view" id="tickets">`, CSS section `/* tickets */`, script section `/* tickets */` (`TS`, `TN`, `uid`, `normT`, `usedT`, `T`, `tf`, `saveT`, `queueT`, `flushT`, `drawTFil`, `tRow`, `drawTList`, `renderTickets`, `addTicket`, `tUpdate`).

A log of the tickets the owner worked on and where each one stands. It is private (like the Journal): tickets never appear in the Index, Random, or any search. It reuses the Journal's header, button and footer styles so the two feel like one family.

```
section#tickets
  .col.th
    .ttop.rv   h2.thead ("Tickets," + em "and where they stand")  |  .steps > button#tadd "Add ticket"
    .tfil.rv#tfil (role=group, aria-label="Filter by status")   button.pill[data-tfil] x6
    .tlist#tlist (role=list, aria-label="Tickets")   .tk x N   (or .tempty)
  .jmeta   span.saved#tsaved "Saved" | span#tcount
```
The nav item is `Tickets` (`data-go="tickets"`), between Journal and Random (`02`). The curtain label for this view is `Tickets`.

## 1. Data

```ts
type Status = "todo" | "prog" | "rev" | "block" | "done";
interface Ticket { id: string; key: string; title: string; status: Status; date: string /* YYYY-MM-DD, local */; note: string; }
```
- Status labels, in this order: `todo` To do, `prog` In progress, `rev` In review, `block` Blocked, `done` Done.
- `id`: `Date.now().toString(36) + Math.random().toString(36).slice(2,6)`, generated once and never shown.
- `key`: the ticket number as typed (`PROJ-123`). It is shown uppercase by CSS only; the stored value is what was typed.
- Storage key `mg.tickets`: `Ticket[]`, newest-added first. Read through `normT` on every entry to the view: non-arrays become `[]`; missing fields become empty strings; an unknown status becomes `todo`; a date that is not `YYYY-MM-DD` becomes today; a missing `id` gets a new one.
- A ticket is **used** (saved and counted) when its key, title or note is non-empty after trim: `usedT = t => !!(t.key.trim() || t.title.trim() || t.note.trim())`. Unused rows (a freshly added blank row) are dropped when saving.
- No sorting is applied; the stored order is the display order, so rows never jump while editing. New tickets go to the top.

## 2. Header

`.th{padding-top:128px;padding-bottom:5vh;display:grid;gap:28px}` inside `.col`.

- `.ttop{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}` with class `rv`.
- Heading `h2.thead`: Instrument Serif 400 `clamp(44px,8vw,120px)`/.95, tracking -.02em, margin 0; two lines: `Tickets,` then an `em` (display block, italic) `and where they stand`. Same recipe as `.jdate`.
- `Add ticket` is a `button` inside a `.steps` container, so it uses the exact Journal step-button style (DM Mono 12px, tracking .1em, uppercase, `padding:6px 0`, 1px `--ink` bottom border, hover color and border `--signal`, `transition:color .3s,border-color .3s,opacity .3s`).

## 3. Status filter

`.tfil{display:flex;flex-wrap:wrap;gap:8px}` with class `rv` and `--d:1` (one 60ms step after the header). Six `.pill` buttons: `All` then the five statuses in the order above, each `data-tfil="all|todo|prog|rev|block|done"`, `aria-pressed` true for the active one. Each label is followed by a `<sup>` count (`.tfil .pill sup{font-size:9px;margin-left:4px;opacity:.7}`), counting **used** tickets in that status (All counts every used ticket). Pills are the shared `.pill` (see `01`). Default filter is All; it is not stored.
- Clicking a pill sets the filter and re-renders the pills and the list.
- The footer `#tcount` shows `N tickets` / `1 ticket` (count of used tickets, regardless of filter) and is empty at zero.

## 4. List and rows

`.tlist{border-top:1px solid var(--ink)}`.

### Row `.tk`
```
div.tk[role=listitem][data-id][data-s=status]
  input.tkk[data-tf=key]  (placeholder "PROJ-123", aria-label "Ticket number", autocomplete off, spellcheck false)
  div
    textarea.tkt[data-tf=title][rows=1]   (placeholder "What was the ticket?", aria-label "Ticket title")
    textarea.tkn[data-tf=note][rows=1]    (placeholder "What you did, what is left", aria-label "Notes")
  div.tkr
    span.tsw   span.dot[data-s]   select.tks[data-tf=status] (aria-label "Status", five options)
    input.tkd[type=date][data-tf=date][max=today]  (aria-label "Date worked")
    button.tdel[data-tdel] "Remove"
```
- Row: `display:grid;grid-template-columns:150px 1fr auto;gap:10px 24px;align-items:start;padding:22px 0 24px;border-bottom:1px solid var(--line);transition:opacity .4s`.
- Done rows: `.tk[data-s="done"]{opacity:.55}`, back to 1 on `:hover` and `:focus-within`.
- Shared reset for the inputs (`.tkk,.tkt,.tkd,.tks`): `font:inherit;color:inherit;background:none;border:0;border-bottom:1px solid transparent;border-radius:0;outline:0;caret-color:var(--signal);appearance:none;min-width:0;transition:border-color .3s`. On `:focus` the bottom border becomes `--signal`.
- Key `.tkk`: width 100%, DM Mono 13px, tracking .1em, uppercase, `padding:10px 2px`, bottom border `--line`; placeholder opacity .4.
- Title `.tkt` (a textarea so long titles wrap): block, width 100%, `resize:none;overflow:hidden`, Instrument Serif 400 `clamp(26px,3vw,40px)`/1.1, tracking -.01em, `padding:2px 0 6px`. Placeholder `--mute`, opacity .5, italic.
- Notes `.tkn`: block, width 100%, transparent, no border or outline, `resize:none;overflow:hidden`, Newsreader 400 `clamp(17px,1.4vw,19px)`/1.6, caret `--signal`, `padding:2px 0 0`; same placeholder style.
- Both textareas auto-grow like the Write body (`height:auto`, then `scrollHeight + 4px`), on input, on render, on window resize and when fonts finish loading.
- Right column `.tkr{display:grid;justify-items:end;gap:10px;font:400 12px var(--mono);letter-spacing:.1em;text-transform:uppercase}`.
- Status `.tsw{display:flex;align-items:center;gap:10px}`: a status dot and the native `select.tks` (DM Mono 12px, tracking .1em, uppercase, `padding:4px 2px`, `cursor:pointer`). The cursor loop treats `select` as hoverable.
- Dot `.dot`: 9px circle, 1px `--mute` border, `transition:background .3s,border-color .3s`. By status: **To do** hollow; **In progress** filled `--signal` (border too); **In review** ring (`--signal` border with the center showing bone: `box-shadow:inset 0 0 0 2px var(--bone),inset 0 0 0 9px var(--signal)`); **Blocked** filled `--ink`; **Done** filled `--mute`.
- Date `.tkd`: native date input, DM Mono 12px, tracking .1em, uppercase, `--mute`, `padding:4px 2px`, `max` is today so future dates cannot be picked.
- Remove `.tdel`: opacity .35, `padding:6px 0`, `transition:opacity .3s,color .3s`; opacity 1 on row hover, on keyboard focus and when armed; hover and armed color `--signal`; on `(hover:none)` opacity .7.

### Empty states
`.tempty` Instrument Serif italic `clamp(28px,3.4vw,44px)`/1.1, `--mute`, `padding:36px 0`:
- No used tickets at all: `No tickets yet. Add the first one.`
- A status filter with no match: `Nothing marked In progress.` (uses the status label).

## 5. Behavior

- **Entering the view** (`renderTickets`): flush any pending save, reload `T` from storage through `normT`, draw the pills and the list. The view does not take focus.
- **Add ticket** (`addTicket`): puts a blank ticket at the top (`status` is the active filter's status, or `todo` when the filter is All; `date` today), re-renders the list and focuses the new row's key input. The blank row is not saved until it has content.
- **Keyboard:** `Enter` in the key field moves to the title; `Enter` in the title moves to the notes (both `preventDefault`; Shift+Enter and IME composition are ignored). `Enter` in the notes inserts a newline as normal. There is no other shortcut.
- **Typing and changing fields:** one delegated `input` and `change` listener on `#tickets` writes the field into the ticket (matched by `data-id`), auto-grows text areas, and queues a save. Rows are **not** re-rendered while typing. Changing the status updates that row's `data-s` and its dot immediately (the row stays visible even if it no longer matches the active filter until the next re-render).
- **Autosave:** `queueT()` saves **500ms** after the last change. `saveT()` writes `T.filter(usedT)` to `mg.tickets`, flashes `Saved` (`#tsaved`, the shared `flash`) and refreshes the pill counts and footer count. `flushT()` saves immediately when a save is pending; it runs on re-entering the view and when the tab becomes hidden.
- **Remove (two steps):** the first click arms the button (class `arm`, text becomes `Sure?`) and it disarms itself after **2800ms**; a second click while armed deletes the ticket, re-renders the list and saves at once.
- **Filtering** never changes stored data.
- Event wiring: this view has its own listener on `#tickets` using `data-tfil`, `data-tdel`, `data-tf`, and `#tadd`. These names do not collide with the global `document` click priority list in `02`, which must stay untouched.

## 6. Responsive

- 900px and below: `.tk{grid-template-columns:1fr auto;gap:10px 20px}` and the key input spans the full row (`grid-column:1/-1;max-width:220px`).
- 600px and below: `.tk{grid-template-columns:1fr}` (everything stacked) and `.tkr` becomes a wrapping flex row (`display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px 16px`) holding status, date and Remove.
- The top bar nav shrinks to make room for five items (`02`).

## 7. Tickets checklist

- [ ] Nav shows Tickets between Journal and Random; the curtain label reads `Tickets`; no horizontal scroll at 360px.
- [ ] Heading and pills reveal with the shared stagger; header matches the Journal's proportions.
- [ ] Add ticket focuses the key input; Enter flows key, title, notes.
- [ ] Status dot colors match section 4; Done rows dim and restore on hover and focus.
- [ ] Pill and footer counts update as soon as the autosave runs (500ms).
- [ ] Filter pills filter; the right empty message shows for each case.
- [ ] Long titles wrap instead of truncating (including on a phone).
- [ ] Two-step Remove arms, shows `Sure?`, disarms after 2800ms, deletes on the second click.
- [ ] Reload keeps tickets; blank rows are not saved; bad stored data does not break the view; it works when storage throws.
- [ ] Future dates cannot be chosen.
