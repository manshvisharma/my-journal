import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Share2,
  Copy,
  Check,
  ChevronDown,
  UserPlus,
  Trash2,
  ExternalLink,
  Lock,
  Globe,
  MessageCircle,
  Send,
  Mail,
  X,
} from 'lucide-react';
import type { Entry } from '../../types';
import type { ShareDoc, ShareMediaDoc } from '../../types/share';
import { useAuthStore } from '../../store/useAuthStore';
import { shareRepository, generateShareId, generateRecipientCode } from './shareRepository';
import { tiptapJsonToHtml } from './sanitize';
import { repository } from '../../data/repository';
import { Switch } from '../../ui/Switch';
import { Sheet } from '../../ui/Sheet';
import { toast } from '../../ui/Toast';
import { haptics } from '../../lib/haptics';

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  entry: Entry;
  onOpenActivity?: (shareId: string) => void;
}

export const ShareSheet: React.FC<ShareSheetProps> = ({
  isOpen,
  onClose,
  entry,
  onOpenActivity,
}) => {
  const user = useAuthStore((state) => state.user);
  const ownerUid = user?.uid || 'demo-local-user';

  const [shareDoc, setShareDoc] = useState<ShareDoc | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [includePhotos, setIncludePhotos] = useState<boolean>(true);
  const [includeMood, setIncludeMood] = useState<boolean>(false);
  const [expiresOption, setExpiresOption] = useState<'never' | '24h' | '7d' | '30d'>('never');
  const [allowNamePrompt, setAllowNamePrompt] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Send to one person
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientMap, setRecipientMap] = useState<Record<string, string>>({});

  const shareUrl = typeof window !== 'undefined' && shareDoc
    ? `${window.location.origin}/s/${shareDoc.id}`
    : '';

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    (async () => {
      const existing = await shareRepository.getShareByEntryId(ownerUid, entry.id);
      if (!mounted) return;

      if (existing) {
        setShareDoc(existing);
        setIsActive(existing.active);
        setIncludePhotos(existing.includePhotos);
        setIncludeMood(Boolean(existing.mood));
        setRecipientMap(existing.recipientMap || {});
        setAllowNamePrompt(Boolean(existing.allowNamePrompt));

        if (!existing.expiresAt) {
          setExpiresOption('never');
        } else {
          const diff = existing.expiresAt - Date.now();
          if (diff <= 25 * 3600 * 1000) setExpiresOption('24h');
          else if (diff <= 8 * 24 * 3600 * 1000) setExpiresOption('7d');
          else setExpiresOption('30d');
        }
      } else {
        // Prepare new inactive share template
        const newId = generateShareId();
        const placeholder: ShareDoc = {
          id: newId,
          ownerUid,
          entryId: entry.id,
          title: entry.title || 'Untitled Entry',
          bodyHtml: tiptapJsonToHtml(entry.bodyJson, entry.plainText),
          snippet: entry.snippet || '',
          entryDate: entry.entryDate,
          wordCount: entry.wordCount || 0,
          mood: null,
          includePhotos: true,
          active: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiresAt: null,
          viewsTotal: 0,
          recipientMap: {},
          allowNamePrompt: false,
        };
        setShareDoc(placeholder);
        setIsActive(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen, entry, ownerUid]);

  if (!isOpen || !shareDoc) return null;

  // Calculate expiration epoch
  const calculateExpiresAt = (option: string): number | null => {
    const now = Date.now();
    if (option === '24h') return now + 24 * 3600 * 1000;
    if (option === '7d') return now + 7 * 24 * 3600 * 1000;
    if (option === '30d') return now + 30 * 24 * 3600 * 1000;
    return null;
  };

  const syncShareToStore = async (activeState: boolean) => {
    if (saving) return;
    setSaving(true);
    try {
      const expiresAt = calculateExpiresAt(expiresOption);
      const bodyHtml = tiptapJsonToHtml(entry.bodyJson, entry.plainText);

      // Collect photos if included
      const mediaDocs: ShareMediaDoc[] = [];
      if (includePhotos && entry.media && entry.media.length > 0) {
        for (let i = 0; i < Math.min(12, entry.media.length); i++) {
          const ref = entry.media[i];
          const mDoc = await repository.getMedia(ref.id);
          if (mDoc) {
            mediaDocs.push({
              id: `media-${i}`,
              shareId: shareDoc.id,
              index: i,
              full: mDoc.full,
              thumb: mDoc.thumb,
              w: mDoc.w,
              h: mDoc.h,
              createdAt: Date.now(),
            });
          }
        }
      }

      const updated: ShareDoc = {
        ...shareDoc,
        title: entry.title || 'Untitled Entry',
        bodyHtml,
        snippet: entry.snippet || '',
        entryDate: entry.entryDate,
        wordCount: entry.wordCount || 0,
        mood: includeMood ? entry.mood : null,
        location: entry.location || null,
        songs: entry.songs || [],
        includePhotos,
        active: activeState,
        expiresAt,
        recipientMap,
        allowNamePrompt,
        updatedAt: Date.now(),
      };

      await shareRepository.saveShare(updated, mediaDocs);
      setShareDoc(updated);
      setIsActive(activeState);
    } catch (e) {
      toast.error('Failed to update share link');
      console.warn(e);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (checked: boolean) => {
    haptics.selection();
    setIsActive(checked);
    await syncShareToStore(checked);
    if (checked) {
      toast.success('Public link is active');
    } else {
      toast.info('Public link deactivated');
    }
  };

  const handleCopyLink = async (customUrl?: string) => {
    const urlToCopy = customUrl || shareUrl;
    if (!urlToCopy) return;

    if (!isActive) {
      await handleToggleActive(true);
    }

    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      haptics.success();
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleNativeShare = async () => {
    if (!isActive) {
      await handleToggleActive(true);
    }

    haptics.light();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: entry.title || 'Journal Entry',
          text: 'A journal entry for you',
          url: shareUrl,
        });
        haptics.success();
      } catch {
        // User closed native sheet
      }
    } else {
      handleCopyLink();
    }
  };

  const handleAddRecipient = async () => {
    const name = recipientName.trim();
    if (!name) return;

    const code = generateRecipientCode();
    const updatedMap = { ...recipientMap, [code]: name };
    setRecipientMap(updatedMap);
    setRecipientName('');
    haptics.selection();

    await shareRepository.updateShareDoc(shareDoc.id, {
      recipientMap: updatedMap,
    });
    toast.success(`Personal link created for ${name}`);
  };

  const handleRemoveRecipient = async (code: string) => {
    const updatedMap = { ...recipientMap };
    delete updatedMap[code];
    setRecipientMap(updatedMap);
    haptics.light();

    await shareRepository.updateShareDoc(shareDoc.id, {
      recipientMap: updatedMap,
    });
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} showCloseButton={false}>
      <div className="flex flex-col gap-4 text-app-text-primary select-none max-h-[85vh] overflow-y-auto pr-0.5">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-app-hairline">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-app-text-secondary hover:text-app-text-primary"
          >
            <X className="w-5 h-5" />
          </button>

          <h3 className="text-base font-bold text-app-text-primary">Share Entry</h3>

          {shareDoc && onOpenActivity && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenActivity(shareDoc.id);
              }}
              className="text-xs font-semibold text-app-accent hover:underline"
            >
              Activity ({shareDoc.viewsTotal})
            </button>
          )}
        </div>

        {/* 1. Preview Card */}
        <div className="p-4 rounded-2xl bg-app-card border border-app-card-border shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-app-accent">
            <Globe className="w-3.5 h-3.5" />
            <span>Public Web Link</span>
          </div>

          <h4 className="text-[17px] font-bold text-app-text-primary tracking-tight line-clamp-1">
            {entry.title || 'Untitled Entry'}
          </h4>

          <p className="text-xs text-app-text-secondary line-clamp-2 leading-relaxed">
            {entry.snippet || 'No text preview'}
          </p>

          <div className="pt-2 border-t border-app-hairline text-[11px] text-app-text-tertiary">
            Anyone with the link can view · no sign-in needed
          </div>
        </div>

        {/* 2. Link ON/OFF Switch */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-app-card border border-app-card-border">
          <div>
            <span className="text-sm font-semibold block">Public Link</span>
            <span className="text-xs text-app-text-secondary">
              {isActive ? 'Active and accessible' : 'Disabled · link is private'}
            </span>
          </div>
          <Switch checked={isActive} onChange={handleToggleActive} />
        </div>

        {/* 3. Primary Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleNativeShare}
            className="py-3 rounded-2xl bg-app-accent hover:bg-app-accent-light text-white text-[15px] font-semibold flex items-center justify-center gap-2 shadow-md transition active:scale-98"
          >
            <Share2 className="w-4 h-4 stroke-[2.5]" />
            <span>Share…</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopyLink()}
            className="py-3 rounded-2xl bg-app-card hover:bg-black/5 dark:hover:bg-white/10 text-app-text-primary text-[15px] font-semibold border border-app-card-border flex items-center justify-center gap-2 transition active:scale-98"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500 stroke-[3]" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy Link'}</span>
          </button>
        </div>

        {/* Quick App Fallbacks for Desktop */}
        <div className="flex items-center justify-around py-2 bg-app-bg rounded-xl border border-app-hairline">
          <button
            type="button"
            onClick={() => {
              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`A journal entry for you: ${shareUrl}`)}`, '_blank');
            }}
            className="flex flex-col items-center gap-1 text-[11px] font-medium text-app-text-secondary hover:text-app-text-primary"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => {
              window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('A journal entry for you')}`, '_blank');
            }}
            className="flex flex-col items-center gap-1 text-[11px] font-medium text-app-text-secondary hover:text-app-text-primary"
          >
            <div className="w-8 h-8 rounded-full bg-sky-500/15 text-sky-600 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <span>Telegram</span>
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = `mailto:?subject=${encodeURIComponent(entry.title || 'A journal entry for you')}&body=${encodeURIComponent(`Read this reflection: ${shareUrl}`)}`;
            }}
            className="flex flex-col items-center gap-1 text-[11px] font-medium text-app-text-secondary hover:text-app-text-primary"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-500/15 text-indigo-600 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <span>Email</span>
          </button>
        </div>

        {/* 4. Advanced Settings Accordion */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-app-text-secondary px-1 py-1"
          >
            <span>Advanced Options</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 pt-3 overflow-hidden"
              >
                {/* Include Photos */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-app-card border border-app-card-border">
                  <span className="text-xs font-semibold">Include Photos ({entry.media?.length || 0})</span>
                  <Switch
                    checked={includePhotos}
                    onChange={(val) => {
                      setIncludePhotos(val);
                      syncShareToStore(isActive);
                    }}
                  />
                </div>

                {/* Include Mood */}
                {entry.mood && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-app-card border border-app-card-border">
                    <span className="text-xs font-semibold">Include Mood Flower & State</span>
                    <Switch
                      checked={includeMood}
                      onChange={(val) => {
                        setIncludeMood(val);
                        syncShareToStore(isActive);
                      }}
                    />
                  </div>
                )}

                {/* Expiration */}
                <div className="p-3 rounded-xl bg-app-card border border-app-card-border space-y-2">
                  <span className="text-xs font-semibold block">Expires</span>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {(['never', '24h', '7d', '30d'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setExpiresOption(opt);
                          syncShareToStore(isActive);
                        }}
                        className={`py-1.5 rounded-lg font-medium capitalize transition ${
                          expiresOption === opt
                            ? 'bg-app-accent text-white font-semibold shadow-xs'
                            : 'bg-app-bg text-app-text-secondary hover:text-app-text-primary'
                        }`}
                      >
                        {opt === 'never' ? 'Never' : opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* "Send to one person" Personalized Links */}
                <div className="p-3 rounded-xl bg-app-card border border-app-card-border space-y-2.5">
                  <div>
                    <span className="text-xs font-semibold block">Send to one person</span>
                    <span className="text-[11px] text-app-text-secondary">
                      Create a personalized link to know when this specific person reads it.
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. Aman"
                      className="flex-1 bg-app-bg border border-app-card-border rounded-xl px-3 py-1.5 text-xs text-app-text-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddRecipient}
                      className="px-3 py-1.5 rounded-xl bg-app-accent text-white text-xs font-semibold shadow-xs hover:opacity-90"
                    >
                      Add Link
                    </button>
                  </div>

                  {/* List of personalized links */}
                  {Object.entries(recipientMap).length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {Object.entries(recipientMap).map(([code, name]) => {
                        const personalUrl = `${shareUrl}?r=${code}`;
                        return (
                          <div
                            key={code}
                            className="flex items-center justify-between p-2 rounded-lg bg-app-bg text-xs border border-app-hairline"
                          >
                            <span className="font-semibold text-app-text-primary">{name}</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleCopyLink(personalUrl)}
                                className="text-app-accent hover:underline font-medium text-[11px]"
                              >
                                Copy Link
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveRecipient(code)}
                                className="text-red-400 hover:text-red-500 p-1"
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Sheet>
  );
};
