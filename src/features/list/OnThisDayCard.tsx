import React from 'react';
import { format } from 'date-fns';
import { Sparkles, Calendar } from 'lucide-react';
import type { Entry } from '../../types';

interface OnThisDayCardProps {
  entries: Entry[];
  onOpenEntry: (id: string) => void;
}

export const OnThisDayCard: React.FC<OnThisDayCardProps> = ({ entries, onOpenEntry }) => {
  if (!entries || entries.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-[#8F97FF]">
        <Sparkles className="w-3.5 h-3.5" />
        <span>On This Day</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
        {entries.map((entry) => {
          const entryYear = new Date(entry.entryDate).getFullYear();
          const yearsAgo = new Date().getFullYear() - entryYear;

          return (
            <div
              key={entry.id}
              onClick={() => onOpenEntry(entry.id)}
              className="min-w-[260px] max-w-[280px] p-4 rounded-2xl bg-gradient-to-br from-[#6B74F5]/25 via-white/5 to-white/5 border border-[#6B74F5]/30 hover:border-[#6B74F5]/50 shadow-md cursor-pointer transition snap-start shrink-0 select-none group"
            >
              <div className="flex items-center justify-between text-xs text-white/70 mb-2">
                <span className="font-bold text-[#8F97FF]">
                  {yearsAgo} {yearsAgo === 1 ? 'year' : 'years'} ago
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(entry.entryDate), 'MMM yyyy')}
                </span>
              </div>

              <h4 className="text-base font-bold text-white mb-1 line-clamp-1 group-hover:text-[#8F97FF] transition">
                {entry.title || 'Untitled Entry'}
              </h4>

              <p className="text-xs text-neutral-300/80 line-clamp-2 leading-relaxed">
                {entry.snippet || 'No preview available'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
