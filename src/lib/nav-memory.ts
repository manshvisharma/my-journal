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
    const activeView = parsed.activeView || "all";
    const viewTitle = parsed.viewTitle || "All Entries";

    // Directly open into list view for the last visited folder or smart view
    let screen: "home" | "list" | "settings" | "insights" = "list";
    if (parsed.screen === "home" && (!parsed.activeView || parsed.activeView === "home")) {
      screen = "home";
    } else if (parsed.screen === "settings" || parsed.screen === "insights") {
      screen = parsed.screen;
    } else {
      screen = "list";
    }

    return {
      screen,
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
