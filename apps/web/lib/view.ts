export type View = "home" | "search" | "write" | "journal" | "tickets";

export const VIEW_LABEL: Record<View, string> = {
  home: "Marginalia",
  search: "Index",
  write: "Write",
  journal: "Journal",
  tickets: "Tickets",
};

export const VIEW_PATH: Record<View, string> = {
  home: "/",
  search: "/index",
  write: "/write",
  journal: "/journal",
  tickets: "/tickets",
};

export function viewFromPath(pathname: string): View {
  switch (pathname) {
    case "/index":
      return "search";
    case "/write":
      return "write";
    case "/journal":
      return "journal";
    case "/tickets":
      return "tickets";
    default:
      return "home";
  }
}

export function viewFromSlug(slug: string[] | undefined): View {
  if (!slug || slug.length === 0) return "home";
  return viewFromPath("/" + slug.join("/"));
}
