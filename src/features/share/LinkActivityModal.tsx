import React, { useState, useEffect, useMemo } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Eye,
  Users,
  Clock,
  Timer,
  ChevronDown,
  Trash2,
  Power,
  RotateCcw,
  Sparkles,
  Smartphone,
  Laptop,
  Globe,
  Radio,
  X,
} from 'lucide-react';
import type { ShareDoc, ShareVisitorDoc, ShareSessionDoc } from '../../types/share';
import { shareRepository } from './shareRepository';
import { Sheet } from '../../ui/Sheet';
import { ConfirmSheet } from '../../ui/ConfirmSheet';
import { toast } from '../../ui/Toast';
import { haptics } from '../../lib/haptics';

interface LinkActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareId: string;
}

export const LinkActivityModal: React.FC<LinkActivityModalProps> = ({
  isOpen,
  onClose,
  shareId,
}) => {
  const [share, setShare] = useState<ShareDoc | null>(null);
  const [visitors, setVisitors] = useState<ShareVisitorDoc[]>([]);
  const [sessions, setSessions] = useState<ShareSessionDoc[]>([]);
  const [expandedVisitorId, setExpandedVisitorId] = useState<string | null>(null);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen || !shareId) return;

    const unsubShare = shareRepository.subscribeShare(shareId, (data) => {
      setShare(data);
    });

    const unsubVisitors = shareRepository.subscribeShareVisitors(shareId, (vList) => {
      setVisitors(vList);
    });

    const unsubSessions = shareRepository.subscribeShareSessions(shareId, (sList) => {
      setSessions(sList);
    });

    return () => {
      unsubShare();
      unsubVisitors();
      unsubSessions();
    };
  }, [isOpen, shareId]);

  if (!isOpen) return null;

  // Format seconds to human string (e.g. "3m 42s", "45s", "1h 12m")
  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    if (mins < 60) {
      return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
    }
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m`;
  };

  // Compute summary stats
  const totalTimeSeconds = visitors.reduce((sum, v) => sum + (v.totalSeconds || 0), 0);
  const totalOpens = visitors.reduce((sum, v) => sum + (v.opens || 1), 0);
  const avgTimePerVisit = totalOpens > 0 ? Math.round(totalTimeSeconds / totalOpens) : 0;

  const lastOpenedTime = visitors.length > 0
    ? Math.max(...visitors.map((v) => v.lastOpenedAt || 0))
    : share?.createdAt || 0;

  // Check if viewing now (heartbeat within 15 seconds)
  const isViewingNow = (lastBeat: number) => {
    return Date.now() - lastBeat < 15 * 1000;
  };

  const handleToggleActive = async () => {
    if (!share) return;
    const nextState = !share.active;
    await shareRepository.setShareActive(share.id, nextState);
    haptics.selection();
    toast.info(nextState ? 'Link activated' : 'Link turned off');
  };

  const handleResetStats = async () => {
    await shareRepository.resetShareStats(shareId);
    setShowResetConfirm(false);
    haptics.success();
    toast.success('Stats reset to zero');
  };

  const handleDeleteShare = async () => {
    await shareRepository.deleteShare(shareId);
    setShowDeleteConfirm(false);
    haptics.warning();
    toast.info('Shared link deleted');
    onClose();
  };

  return (
    <>
      <Sheet isOpen={isOpen} onClose={onClose} showCloseButton={false}>
        <div className="flex flex-col gap-5 text-app-text-primary select-none max-h-[85vh] overflow-y-auto pr-0.5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-app-hairline">
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-app-text-secondary hover:text-app-text-primary"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h3 className="text-base font-bold text-app-text-primary">Link Activity</h3>
              <p className="text-[11px] text-app-text-secondary truncate max-w-[200px]">
                {share?.title || 'Shared Entry'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleActive}
              className={`p-1.5 rounded-full border transition ${
                share?.active
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600'
                  : 'bg-black/5 dark:bg-white/10 border-app-hairline text-gray-400'
              }`}
              title={share?.active ? 'Turn off link' : 'Turn on link'}
            >
              <Power className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* 1. Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Total Views */}
            <div className="p-3 rounded-2xl bg-app-card border border-app-card-border shadow-xs">
              <div className="flex items-center gap-1.5 text-xs text-app-text-secondary mb-1">
                <Eye className="w-3.5 h-3.5 text-app-accent" />
                <span>Views</span>
              </div>
              <div className="text-2xl font-bold text-app-text-primary">
                {share?.viewsTotal || totalOpens}
              </div>
            </div>

            {/* Unique Viewers */}
            <div className="p-3 rounded-2xl bg-app-card border border-app-card-border shadow-xs">
              <div className="flex items-center gap-1.5 text-xs text-app-text-secondary mb-1">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span>Viewers</span>
              </div>
              <div className="text-2xl font-bold text-app-text-primary">
                {visitors.length}
              </div>
            </div>

            {/* Total Time */}
            <div className="p-3 rounded-2xl bg-app-card border border-app-card-border shadow-xs">
              <div className="flex items-center gap-1.5 text-xs text-app-text-secondary mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Total Time</span>
              </div>
              <div className="text-lg font-bold text-app-text-primary truncate">
                {formatDuration(totalTimeSeconds)}
              </div>
            </div>

            {/* Avg Time / Visit */}
            <div className="p-3 rounded-2xl bg-app-card border border-app-card-border shadow-xs">
              <div className="flex items-center gap-1.5 text-xs text-app-text-secondary mb-1">
                <Timer className="w-3.5 h-3.5 text-teal-500" />
                <span>Avg. Visit</span>
              </div>
              <div className="text-lg font-bold text-app-text-primary truncate">
                {formatDuration(avgTimePerVisit)}
              </div>
            </div>
          </div>

          {/* 2. Viewer Breakdown List */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-app-text-secondary mb-2.5 px-1">
              <span>Viewers & Reading Time</span>
              {lastOpenedTime > 0 && (
                <span className="text-[11px] font-normal normal-case">
                  Last seen {formatDistanceToNow(lastOpenedTime, { addSuffix: true })}
                </span>
              )}
            </div>

            {visitors.length === 0 ? (
              <div className="text-center py-10 bg-app-card rounded-2xl border border-app-card-border">
                <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-2 text-app-text-tertiary">
                  <Eye className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-app-text-primary mb-1">No views yet</h4>
                <p className="text-xs text-app-text-secondary max-w-xs mx-auto">
                  Share this link with someone. As soon as they open it, you will see their reading time and sessions here live.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {visitors.map((v, idx) => {
                  const isExpanded = expandedVisitorId === v.visitorId;
                  const isLive = isViewingNow(v.lastOpenedAt);
                  const visitorSessions = sessions.filter((s) => s.visitorId === v.visitorId);

                  const displayName = v.label || `Viewer ${visitors.length - idx}`;
                  const locationStr = [v.city, v.country].filter(Boolean).join(', ') || v.tz;

                  return (
                    <div
                      key={v.visitorId}
                      className="rounded-2xl bg-app-card border border-app-card-border overflow-hidden shadow-xs transition"
                    >
                      <div
                        onClick={() => {
                          haptics.light();
                          setExpandedVisitorId(isExpanded ? null : v.visitorId);
                        }}
                        className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-black/4 dark:hover:bg-white/4"
                      >
                        {/* Avatar and Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                              {displayName.slice(0, 1).toUpperCase()}
                            </div>
                            {isLive && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[var(--color-card-bg)] rounded-full animate-pulse" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-app-text-primary truncate">
                                {displayName}
                              </span>
                              {isLive && (
                                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                                  Viewing now
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-app-text-secondary truncate">
                              {v.device} · {v.browser} · {locationStr}
                            </div>
                          </div>
                        </div>

                        {/* Stats & Chevron */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-bold text-app-text-primary">
                              {formatDuration(v.totalSeconds)}
                            </div>
                            <div className="text-[10px] text-app-text-secondary">
                              {v.opens} {v.opens === 1 ? 'open' : 'opens'}
                              {v.maxScrollPct > 0 ? ` · ${v.maxScrollPct}% read` : ''}
                            </div>
                          </div>

                          <ChevronDown
                            className={`w-4 h-4 text-app-text-tertiary transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </div>

                      {/* Expandable Session Timeline */}
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 border-t border-app-hairline bg-app-bg/50 space-y-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-app-text-secondary block">
                            Session History
                          </span>
                          {visitorSessions.length === 0 ? (
                            <div className="text-xs text-app-text-secondary py-1">
                              1 visit · First seen {format(new Date(v.firstOpenedAt), 'd MMM, h:mm a')}
                            </div>
                          ) : (
                            visitorSessions.map((session, sIdx) => (
                              <div
                                key={session.id || sIdx}
                                className="flex items-center justify-between text-xs py-1 border-b border-app-hairline last:border-none"
                              >
                                <div>
                                  <span className="font-medium text-app-text-primary block">
                                    {format(new Date(session.startedAt), 'EEE, d MMM · h:mm a')}
                                  </span>
                                  {session.referrer && (
                                    <span className="text-[10px] text-app-text-secondary truncate block max-w-[200px]">
                                      via {session.referrer}
                                    </span>
                                  )}
                                </div>
                                <span className="font-semibold text-app-accent">
                                  {formatDuration(session.seconds)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Bottom Actions */}
          <div className="pt-2 border-t border-app-hairline flex items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1 text-app-text-secondary hover:text-app-text-primary p-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset stats</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1 text-red-500 hover:text-red-600 p-2 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete link</span>
            </button>
          </div>
        </div>
      </Sheet>

      {/* Reset Stats Confirmation */}
      <ConfirmSheet
        isOpen={showResetConfirm}
        title="Reset Link Stats?"
        description="This will clear all views, viewer history, and durations back to zero."
        confirmLabel="Reset Stats"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleResetStats}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* Delete Share Confirmation */}
      <ConfirmSheet
        isOpen={showDeleteConfirm}
        title="Delete Shared Link?"
        description="The link will be permanently removed and will stop working immediately for all viewers."
        confirmLabel="Delete Link"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteShare}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};
