import type { Note } from "./types";

/**
 * The 12 sample notes, verbatim from 08-data-and-storage.md section 3.
 * Order matters: seeded ids ascend with it.
 */
export const SAMPLE_NOTES: Omit<Note, "id">[] = [
  {
    title: "The case for boring infrastructure",
    kind: "Essay",
    tags: ["engineering", "opinion"],
    date: "2026-09-28",
    ex: "Notes on why the least exciting stack usually ships the most. Postgres, a queue, and patience.",
    body: [
      "Every project I have regretted started with something exciting. Every project I'm proud of started with Postgres, one queue, and a cron job.",
      "Boring tools have boring failure modes, and boring failure modes are the ones you've already read about. That is most of the argument.",
    ],
    m: "remember this at 2am",
  },
  {
    title: "Binary search, off-by-one cheatsheet",
    kind: "Snippet",
    tags: ["algorithms", "interview"],
    date: "2026-09-24",
    ex: "The three loop invariants I actually trust, and how to pick the right bounds every time.",
    body: [
      "Pick the invariant first: the answer always lives inside [lo, hi].",
      "While lo < hi, take mid = lo + (hi - lo) / 2. Too small, lo = mid + 1. Otherwise hi = mid. Never mix the two styles.",
    ],
    m: "lo < hi, not <=",
  },
  {
    title: "On keeping a commonplace book",
    kind: "Essay",
    tags: ["writing", "habits"],
    date: "2026-09-19",
    ex: "Why copying other people's sentences by hand changed how I read.",
  },
  {
    title: "Debounce, throttle, and when each one lies",
    kind: "Snippet",
    tags: ["javascript", "engineering"],
    date: "2026-09-12",
    ex: "Small implementations plus the bug each one hides in production.",
  },
  {
    title: "System design: rate limiter",
    kind: "Note",
    tags: ["interview", "systems"],
    date: "2026-09-05",
    ex: "Token bucket versus sliding window, with the numbers I use to justify the choice.",
    body: [
      "Token bucket: cheap, allows bursts, easy to explain. Sliding window: smoother, but costs memory per user.",
      "Default to token bucket unless the product promises a strict per-minute limit.",
    ],
    m: "ask about bursts first",
  },
  {
    title: "A good reading list on typography",
    kind: "Link",
    tags: ["design", "writing"],
    date: "2026-08-30",
    ex: "Books and articles I return to, annotated with one line each.",
    body: [
      "Bringhurst for the rules. Butterick for the shortcuts. A long afternoon with any good specimen book for the taste.",
    ],
    m: "reread",
  },
  {
    title: "Easing curves worth memorizing",
    kind: "Note",
    tags: ["design", "animation"],
    date: "2026-08-22",
    ex: "Four curves that cover almost every interface motion I have needed.",
  },
  {
    title: "Notes on Designing Data-Intensive Applications",
    kind: "Note",
    tags: ["systems", "books"],
    date: "2026-08-14",
    ex: "Chapter by chapter, only the parts I had to reread.",
  },
  {
    title: "Git commands I keep forgetting",
    kind: "Snippet",
    tags: ["tools", "engineering"],
    date: "2026-08-03",
    ex: "Reflog, bisect, worktree, and the one-liner to undo a bad rebase.",
  },
  {
    title: "Why paper feels fast",
    kind: "Essay",
    tags: ["design", "opinion"],
    date: "2026-07-27",
    ex: "A short argument about latency, texture, and the absence of loading states.",
    body: [
      "A pen has no loading state. The mark appears where the hand is, at the speed of the hand.",
      "I think that is what fast means: no gap between the thought and its trace. Most software puts an interface in that gap.",
    ],
    m: "is this the whole point?",
  },
  {
    title: "Dynamic programming patterns, grouped",
    kind: "Note",
    tags: ["algorithms", "interview"],
    date: "2026-07-18",
    ex: "Knapsack, intervals, grids, strings. The shape of each state and its transition.",
  },
  {
    title: "Morning pages, month three",
    kind: "Essay",
    tags: ["habits", "writing"],
    date: "2026-07-09",
    ex: "What changed, what did not, and the format I settled on.",
  },
];
