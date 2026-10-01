import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import JournalApp from "@/journal-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-app-bg text-app-text-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-app-accent" />
          <p className="text-sm font-semibold tracking-wide">Reverie</p>
        </div>
      </main>
    );
  }

  return <JournalApp />;
}
