import React from 'react';

interface ChipProps {
  label: string;
  icon?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  color?: string;
  size?: 'sm' | 'md';
}

export const Chip: React.FC<ChipProps> = ({
  label,
  icon,
  selected = false,
  onClick,
  onRemove,
  color,
  size = 'md',
}) => {
  const isClickable = Boolean(onClick);

  return (
    <span
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      style={{
        backgroundColor: color ? `${color}20` : undefined,
        borderColor: color ? `${color}50` : undefined,
        color: color || undefined,
      }}
      className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-all ${
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      } ${
        selected
          ? 'bg-[#6B74F5] text-white border border-[#6B74F5]'
          : !color
          ? 'bg-white/8 hover:bg-white/12 text-neutral-200 border border-white/10'
          : 'border'
      } ${isClickable ? 'cursor-pointer active:scale-95' : ''}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 -mr-1 p-0.5 rounded-full hover:bg-black/20 focus:outline-none"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
};
