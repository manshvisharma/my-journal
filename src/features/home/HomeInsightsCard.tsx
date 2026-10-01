import React from "react";
import { CalendarDays, Quote } from "lucide-react";
import { useStats } from "../../store/selectors";
import { haptics } from "../../lib/haptics";

interface HomeInsightsCardProps {
  onOpen: () => void;
}

export const HomeInsightsCard: React.FC<HomeInsightsCardProps> = ({ onOpen }) => {
  const stats = useStats();

  return (
    <button
      type="button"
      onClick={() => {
        haptics.light();
        onOpen();
      }}
      className="w-full text-left rounded-[22px] p-5 text-white shadow-md bg-gradient-to-br from-[#6D7BF0] via-[#7B86F4] to-[#A78BFA] active:scale-[0.99] transition"
    >
      <div className="text-[15px] font-medium text-white/90 mb-4">Insights</div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[64px] leading-none font-semibold tracking-tight">{stats.entriesThisYear}</div>
          <div className="text-[13px] text-white/80 mt-1">Entries This Year</div>
        </div>
        <div className="flex flex-col gap-3 pb-1">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-white/85" />
            <div>
              <div className="text-[20px] font-semibold leading-none">{stats.daysJournaled}</div>
              <div className="text-[12px] text-white/80">Days Journaled</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Quote className="w-4 h-4 text-white/85" />
            <div>
              <div className="text-[20px] font-semibold leading-none">{stats.wordsAllTime.toLocaleString()}</div>
              <div className="text-[12px] text-white/80">Words All Time</div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};
