import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Globe,
  Trash2,
  Copy,
  Check,
  Eye,
  ExternalLink,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react';
import type { ShareDoc } from '../../types/share';
import { useAuthStore } from '../../store/useAuthStore';
import { shareRepository } from './shareRepository';
import { Switch } from '../../ui/Switch';
import { Sheet } from '../../ui/Sheet';
import { ConfirmSheet } from '../../ui/ConfirmSheet';
import { toast } from '../../ui/Toast';
import { haptics } from '../../lib/haptics';

interface SharedLinksListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenActivity: (shareId: string) => void;
}

export const SharedLinksListModal: React.FC<SharedLinksListModalProps> = ({
  isOpen,
  onClose,
  onOpenActivity,
}) => {
  const user = useAuthStore((state) => state.user);
  const ownerUid = user?.uid || 'demo-local-user';

  const [shares, setShares] = useState<ShareDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareToDelete, setShareToDelete] = useState<ShareDoc | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadShares = async () => {
    setLoading(true);
    const list = await shareRepository.listUserShares(ownerUid);
    setShares(list);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadShares();
    }
  }, [isOpen, ownerUid]);

  if (!isOpen) return null;

  const handleToggle = async (share: ShareDoc, active: boolean) => {
    haptics.selection();
    await shareRepository.setShareActive(share.id, active);
    setShares((prev) =>
      prev.map((s) => (s.id === share.id ? { ...s, active } : s))
    );
    toast.info(active ? 'Link enabled' : 'Link disabled');
  };

  const handleCopy = async (shareId: string) => {
    const url = `${window.location.origin}/s/${shareId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(shareId);
      haptics.success();
      toast.success('Link copied');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!shareToDelete) return;
    await shareRepository.deleteShare(shareToDelete.id);
    setShares((prev) => prev.filter((s) => s.id !== shareToDelete.id));
    setShareToDelete(null);
    haptics.warning();
    toast.info('Shared link deleted');
  };

  return (
    <>
      <Sheet isOpen={isOpen} onClose={onClose} title="Shared Links">
        <div className="flex flex-col gap-4 text-app-text-primary select-none max-h-[85vh] overflow-y-auto pr-0.5">
          <p className="text-xs text-app-text-secondary">
            Manage your active and private public journal links. Viewers can read without an account.
          </p>

          {loading ? (
            <div className="py-12 text-center text-xs text-app-text-tertiary animate-pulse">
              Loading shared links…
            </div>
          ) : shares.length === 0 ? (
            <div className="text-center py-12 bg-app-card rounded-2xl border border-app-card-border">
              <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-2 text-app-text-tertiary">
                <Globe className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-app-text-primary mb-1">No shared links</h4>
              <p className="text-xs text-app-text-secondary max-w-xs mx-auto">
                Open any journal entry and tap Share to create a public link.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {shares.map((share) => {
                const dateStr = format(new Date(share.entryDate), 'd MMM yyyy');
                return (
                  <div
                    key={share.id}
                    className="p-3.5 rounded-2xl bg-app-card border border-app-card-border shadow-xs flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-app-text-primary truncate">
                          {share.title || 'Untitled Entry'}
                        </h4>
                        <div className="text-[11px] text-app-text-secondary flex items-center gap-2 mt-0.5">
                          <span>{dateStr}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1 font-semibold text-app-accent">
                            <Eye className="w-3 h-3" />
                            {share.viewsTotal || 0} views
                          </span>
                        </div>
                      </div>

                      <Switch
                        checked={share.active}
                        onChange={(checked) => handleToggle(share, checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-app-hairline text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(share.id)}
                          className="flex items-center gap-1 text-app-accent font-medium hover:underline"
                        >
                          {copiedId === share.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedId === share.id ? 'Copied' : 'Copy'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenActivity(share.id);
                          }}
                          className="flex items-center gap-1 text-app-text-secondary hover:text-app-text-primary px-2"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Activity</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShareToDelete(share)}
                        className="text-red-400 hover:text-red-500 p-1 rounded-md"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Sheet>

      {/* Delete Confirmation Sheet */}
      <ConfirmSheet
        isOpen={Boolean(shareToDelete)}
        title="Delete Shared Link?"
        description="The link will stop working immediately for all viewers."
        confirmLabel="Delete Link"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShareToDelete(null)}
      />
    </>
  );
};
