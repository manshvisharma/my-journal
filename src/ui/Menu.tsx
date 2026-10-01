import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  checked?: boolean;
  dividerAbove?: boolean;
  onClick: () => void;
}

interface MenuProps {
  trigger: (open: boolean) => React.ReactNode;
  items: MenuItem[];
  headerContent?: React.ReactNode;
  align?: 'left' | 'right';
}

export const Menu: React.FC<MenuProps> = ({ trigger, items, headerContent, align = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 256; // w-64
    const estimatedMenuHeight = 320;

    let top = rect.bottom + 8;
    let left = align === 'right' ? rect.right - menuWidth : rect.left;

    // Prevent going off right edge
    if (left + menuWidth > viewportWidth - 8) {
      left = viewportWidth - menuWidth - 8;
    }
    // Prevent going off left edge
    if (left < 8) left = 8;

    // Flip upward if not enough space below
    if (top + estimatedMenuHeight > viewportHeight - 16) {
      top = rect.top - estimatedMenuHeight - 8;
      if (top < 8) top = 8;
    }

    setMenuStyle({ top, left, width: menuWidth });
  }, [align]);

  useEffect(() => {
    if (isOpen) {
      computePosition();
    }
  }, [isOpen, computePosition]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleScroll = () => {
      if (isOpen) computePosition();
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('scroll', handleScroll, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, computePosition]);

  const menuPortal = isOpen
    ? createPortal(
        <AnimatePresence>
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.9, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            style={{ position: 'fixed', zIndex: 9999, ...menuStyle }}
            className={`rounded-[20px] bg-app-card/95 backdrop-blur-2xl border border-app-card-border shadow-2xl p-1.5 focus:outline-none`}
          >
            {headerContent && (
              <div className="p-2 border-b border-app-hairline mb-1">
                {headerContent}
              </div>
            )}

            {items.map((item, idx) => (
              <React.Fragment key={item.id || idx}>
                {item.dividerAbove && <div className="my-1.5 border-t border-app-hairline" />}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    item.onClick();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
                    item.destructive
                      ? 'text-app-destructive hover:bg-red-500/10 active:bg-red-500/20'
                      : 'text-app-text-primary hover:bg-black/5 dark:hover:bg-white/10 active:scale-[0.99]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {item.icon && <span className="shrink-0 opacity-80">{item.icon}</span>}
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.checked !== undefined && item.checked && (
                    <span className="text-app-accent text-base font-bold ml-2">✓</span>
                  )}
                </button>
              </React.Fragment>
            ))}
          </motion.div>
        </AnimatePresence>,
        document.body,
      )
    : null;

  return (
    <>
      <div className="relative inline-block text-left" ref={triggerRef}>
        <div onClick={() => setIsOpen((prev) => !prev)}>{trigger(isOpen)}</div>
      </div>
      {menuPortal}
    </>
  );
};
