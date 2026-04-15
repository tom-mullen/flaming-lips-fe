import type { Work } from "./types";

export type SortDir = "asc" | "desc";

export type SortableWork = Pick<Work, "canonical_title" | "canonical_artist">;

export function compareWorks(
  field: string,
  dir: SortDir,
): (a: SortableWork, b: SortableWork) => number {
  return (a, b) => {
    let aVal = "";
    let bVal = "";

    if (field === "title") {
      aVal = (a.canonical_title ?? "").toLowerCase();
      bVal = (b.canonical_title ?? "").toLowerCase();
    } else if (field === "artist") {
      aVal = (a.canonical_artist ?? "").toLowerCase();
      bVal = (b.canonical_artist ?? "").toLowerCase();
    }

    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return dir === "asc" ? cmp : -cmp;
  };
}

export function compareWorkEntries(
  field: string,
  dir: SortDir,
  workMap: Map<string, Work>,
): (a: [string, unknown], b: [string, unknown]) => number {
  return ([aId], [bId]) => {
    const aWork = workMap.get(aId);
    const bWork = workMap.get(bId);
    let aVal = "";
    let bVal = "";

    if (field === "title") {
      aVal = (aWork?.canonical_title ?? aId).toLowerCase();
      bVal = (bWork?.canonical_title ?? bId).toLowerCase();
    } else if (field === "artist") {
      aVal = (aWork?.canonical_artist ?? "").toLowerCase();
      bVal = (bWork?.canonical_artist ?? "").toLowerCase();
    }

    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return dir === "asc" ? cmp : -cmp;
  };
}
