import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicShareView } from "@/features/share/PublicShareView";
import { ToastContainer } from "@/ui/Toast";

export const Route = createFileRoute("/s/$shareId")({
  component: SharedEntryPage,
});

function SharedEntryPage() {
  const { shareId } = Route.useParams();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) {
    return <main className="min-h-screen bg-app-bg" />;
  }

  return (
    <div className="min-h-screen w-screen overflow-y-auto bg-app-bg font-sans antialiased">
      <PublicShareView shareId={shareId} />
      <ToastContainer />
    </div>
  );
}
