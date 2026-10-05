import React, { useEffect, useMemo, useState } from "react";
import { PanelLeft } from "lucide-react";
import { useAuthStore } from "./store/useAuthStore";
import { useJournalStore } from "./store/useJournalStore";
import { useLockStore } from "./store/useLockStore";
import { useSearchStore } from "./store/useSearchStore";
import { HomeView } from "./features/home/HomeView";
import { EntryListView } from "./features/list/EntryListView";
import { EntryEditorView } from "./editor/EntryEditorView";
import { SettingsView } from "./features/settings/SettingsView";
import { InsightsView } from "./features/insights/InsightsView";
import { SearchOverlay } from "./features/search/SearchOverlay";
import { LockScreen } from "./features/lock/LockScreen";
import { AuthModal } from "./features/auth/AuthModal";
import { ToastContainer, toast } from "./ui/Toast";
import { UpdateToast } from "./pwa/UpdateToast";
import { OfflineIndicator } from "./pwa/OfflineIndicator";
import { CONFIG } from "./config";
import type { Entry, LastNavState, NavScreen } from "./types";
import { loadLastNav, saveLastNav } from "@/lib/nav-memory";
import { haptics } from "./lib/haptics";

export default function JournalApp() {
  const { user, initAuth } = useAuthStore();
  const { subscribe } = useJournalStore();
  const { initLock } = useLockStore();
  const { openSearch } = useSearchStore();
  const theme = useJournalStore((state) => state.settings.theme || "system");

  const [showAuthModal, setShowAuthModal] = useState(false);

  const initialNav = useMemo(() => loadLastNav(), []);
  const [screen, setScreen] = useState<NavScreen>(initialNav.screen === "editor" ? "list" : initialNav.screen);
  const [activeView, setActiveView] = useState<string>(initialNav.activeView);
  const [viewTitle, setViewTitle] = useState<string>(initialNav.viewTitle);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [isNewEntryMode, setIsNewEntryMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialNav.sidebarCollapsed);

  useEffect(() => {
    const applyTheme = (isDark: boolean) => {
      const root = document.documentElement;
      const metaThemeColor = document.getElementById("theme-color-meta");
      if (isDark) {
        root.classList.add("dark");
        root.classList.remove("light");
        if (metaThemeColor) metaThemeColor.setAttribute("content", "#000000");
      } else {
        root.classList.add("light");
        root.classList.remove("dark");
        if (metaThemeColor) metaThemeColor.setAttribute("content", "#F2F2F7");
      }
    };

    if (theme === "light") applyTheme(false);
    else if (theme === "dark") applyTheme(true);
    else {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mql.matches);
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
  }, [theme]);

  useEffect(() => {
    const unsubAuth = initAuth();
    initLock();
    return () => unsubAuth();
  }, [initAuth, initLock]);

  useEffect(() => {
    const uid = user?.uid || "demo-local-user";
    const unsubData = subscribe(uid);
    return () => unsubData();
  }, [user?.uid, subscribe]);

  useEffect(() => {
    const nav: LastNavState = {
      screen: screen === "editor" ? "list" : screen,
      activeView,
      viewTitle,
      entryId: null,
      sidebarCollapsed,
    };
    saveLastNav(nav);
  }, [screen, activeView, viewTitle, sidebarCollapsed]);

  const activeEntry: Entry | undefined = useJournalStore((state) =>
    activeEntryId ? state.entries.get(activeEntryId) : undefined,
  );

  const { smartView, folderId } = useMemo(() => {
    if (activeView === "all") return { smartView: "all" as const };
    if (activeView === "bookmarks") return { smartView: "bookmarks" as const };
    if (activeView === "unsorted") return { smartView: "unsorted" as const };
    if (activeView === "trash") return { smartView: "trash" as const };
    return { folderId: activeView };
  }, [activeView]);

  const handleSelectView = (view: string, title: string) => {
    haptics.selection();
    setActiveView(view);
    setViewTitle(title);
    setScreen("list");
    setActiveEntryId(null);
    setIsNewEntryMode(false);
  };

  const handleNewEntry = async () => {
    if (!user) {
      haptics.warning();
      toast.info("Please sign in or create an account to start journaling");
      setShowAuthModal(true);
      return;
    }
    haptics.medium();
    const now = Date.now();
    const newId = `entry-${now}-${Math.random().toString(36).substring(2, 7)}`;
    const targetFolderId = folderId && folderId !== "all" ? folderId : CONFIG.defaultFolderId;
    const newDraft: Entry = {
      id: newId,
      title: "",
      bodyJson: "",
      plainText: "",
      snippet: "",
      entryDate: now,
      createdAt: now,
      updatedAt: now,
      folderIds: [targetFolderId],
      tags: [],
      bookmarked: false,
      pinned: false,
      pinnedAt: null,
      mood: null,
      media: [],
      coverThumb: null,
      songs: [],
      location: null,
      attachmentOrder: [],
      wordCount: 0,
      deletedAt: null,
      source: "app",
      importKey: null,
      schemaVersion: 1,
    };
    await useJournalStore.getState().saveEntry(newDraft);
    setActiveEntryId(newId);
    setIsNewEntryMode(true);
    setScreen("editor");
  };

  const handleOpenEntry = (id: string) => {
    haptics.light();
    setActiveEntryId(id);
    setIsNewEntryMode(false);
    setScreen("editor");
  };

  const handleBackFromEditor = () => {
    setActiveEntryId(null);
    setIsNewEntryMode(false);
    setScreen("list");
  };

  // Handle OS back button for PWA
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // The user pressed back.
      if (screen === "editor") {
        setActiveEntryId(null);
        setIsNewEntryMode(false);
        setScreen("list");
      } else if (screen === "list") {
        setScreen("home");
      } else if (screen === "settings" || screen === "insights") {
        setScreen("home");
      }
      
      // Push a dummy state forward again so the next 'back' press can be trapped
      // without closing the PWA
      history.pushState(null, "");
    };

    window.addEventListener("popstate", handlePopState);
    
    // Ensure there is at least one history entry ahead of us initially
    if (!history.state || history.state.app !== "journal") {
      history.replaceState({ app: "journal" }, "");
      history.pushState(null, "");
    }
    
    return () => window.removeEventListener("popstate", handlePopState);
  }, [screen]);

  const showHomePane = screen !== "settings" && screen !== "insights";
  const showListPane = showHomePane;
  const showEditorPane = showHomePane;

  const isLocked = useLockStore((state) => state.isLocked);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-app-bg text-app-text-primary flex flex-col font-sans select-none antialiased">
      <OfflineIndicator />

      <div
        className={`flex-1 flex w-full h-full overflow-hidden transition-opacity duration-150 ${
          isLocked ? "opacity-0 pointer-events-none invisible" : "opacity-100 visible"
        }`}
        aria-hidden={isLocked}
      >
        {screen === "settings" ? (
          <div className="w-full h-full z-40">
            <SettingsView onBack={() => setScreen("home")} onOpenAuthModal={() => setShowAuthModal(true)} />
          </div>
        ) : screen === "insights" ? (
          <div className="w-full h-full z-40">
            <InsightsView
              onBack={() => setScreen("home")}
              onSelectDateFilter={() => {
                setActiveView("all");
                setViewTitle("All Entries");
                setScreen("list");
              }}
            />
          </div>
        ) : (
          <>
            <aside
              className={`${
                sidebarCollapsed
                  ? "hidden"
                  : screen === "home"
                  ? "flex"
                  : "hidden md:flex"
              } w-full md:w-[340px] lg:w-[380px] h-full shrink-0 border-r border-app-hairline bg-app-bg z-20`}
            >
              <HomeView
                onSelectView={handleSelectView}
                onOpenSearch={openSearch}
                onOpenSettings={() => setScreen("settings")}
                onNewEntry={handleNewEntry}
                onSelectEntries={() => {
                  setActiveView("all");
                  setViewTitle("All Entries");
                  setScreen("list");
                  useJournalStore.getState().setSelectMode(true);
                }}
                onOpenInsights={() => setScreen("insights")}
                hideFab={false}
              />
            </aside>

            <section
              className={`${
                screen === "list"
                  ? "flex flex-1"
                  : screen === "home"
                  ? "hidden md:flex flex-1"
                  : screen === "editor"
                  ? "hidden lg:flex lg:w-[360px] xl:w-[400px]"
                  : "hidden"
              } w-full h-full shrink-0 border-r border-app-hairline min-w-0 bg-app-bg`}
            >
              {showListPane ? (
                <EntryListView
                  viewTitle={viewTitle}
                  folderId={folderId}
                  smartView={smartView}
                  onBack={() => setScreen("home")}
                  onOpenEntry={handleOpenEntry}
                  onNewEntry={handleNewEntry}
                  onOpenSearch={openSearch}
                  hideBack={false}
                  hideFab={screen === "editor"}
                />
              ) : null}
            </section>

            <main
              className={`${
                screen === "editor" ? "flex" : "hidden lg:flex"
              } flex-1 h-full min-w-0 bg-app-bg`}
            >
              {showEditorPane && activeEntry ? (
                <EntryEditorView
                  key={activeEntry.id}
                  entry={activeEntry}
                  initialEditMode={isNewEntryMode}
                  onBack={handleBackFromEditor}
                />
              ) : screen === "editor" ? (
                <div className="flex flex-col items-center justify-center w-full h-full text-app-text-tertiary p-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-app-accent border-t-transparent mb-3" />
                  <p className="text-sm font-medium text-app-text-secondary">Opening entry...</p>
                </div>
              ) : (
                <div className="hidden lg:flex flex-col items-center justify-center w-full h-full text-app-text-tertiary p-8">
                  <p className="text-base font-semibold text-app-text-secondary mb-1">Select an entry</p>
                  <p className="text-sm text-app-text-tertiary mb-4 text-center max-w-xs">
                    Pick something from the list, or start a new page.
                  </p>
                  <button
                    type="button"
                    onClick={handleNewEntry}
                    className="mt-2 px-5 py-2.5 rounded-full bg-app-accent text-white text-xs font-bold"
                  >
                    + New Entry
                  </button>
                </div>
              )}
            </main>
          </>
        )}
      </div>

      {screen !== "settings" && screen !== "insights" && (
      <button
        type="button"
        onClick={() => {
          haptics.light();
          setSidebarCollapsed((v) => !v);
        }}
        className="hidden md:flex fixed left-3 bottom-[calc(1.2rem+env(safe-area-inset-bottom,0px))] z-40 w-11 h-11 rounded-full bg-app-card border border-app-card-border items-center justify-center text-app-text-secondary shadow-md"
        aria-label="Toggle journals sidebar"
      >
        <PanelLeft className="w-4 h-4" />
      </button>
      )}

      <SearchOverlay onSelectEntry={handleOpenEntry} />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <LockScreen />
      <UpdateToast />
      <ToastContainer />
    </div>
  );
}
