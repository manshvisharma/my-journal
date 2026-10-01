import type { LastNavState } from "../types";

const KEY = "reverie_last_nav";

const DEFAULT_NAV: LastNavState = {
  screen: "home",
  activeView: "all",
  viewTitle: "All Entries",
  entryId: null,
  sidebarCollapsed: false,
};

export function loadLastNav(): LastNavState {
  if (typeof window === "undefined") return DEFAULT_NAV;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_NAV;
    const parsed = JSON.parse(raw) as Partial<LastNavState>;
    // Always resolve editor state back to list
    const screen = parsed.screen === "editor" ? "list" : (parsed.screen || "home");
    const activeView = parsed.activeView || "all";
    const viewTitle = parsed.viewTitle || "All Entries";
    // If activeView is a folder (not a smart view), start on list screen
    const smartViews = new Set(["all", "bookmarks", "unsorted", "trash"]);
    const isFolder = activeView !== "home" && !smartViews.has(activeView);
    return {
      screen: isFolder ? "list" : screen,
      activeView,
      viewTitle,
      entryId: null,
      sidebarCollapsed: Boolean(parsed.sidebarCollapsed),
    };
  } catch {
    return DEFAULT_NAV;
  }
}

export function saveLastNav(state: LastNavState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore quota
  }
}
