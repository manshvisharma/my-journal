import React from 'react';
import {
  Smile,
  Layers,
  Home,
  Bed,
  Key,
  Library,
  Phone,
  Lightbulb,
  Flower,
  Plane,
  MapPin,
  Pin,
  Globe,
  Car,
  Bike,
  Ship,
  Briefcase,
  Tent,
  Camera,
  Umbrella,
  Bus,
  Train,
  Backpack,
  Utensils,
  Coffee,
  Wine,
  Apple,
  Cake,
  Popcorn,
  ShoppingBasket,
  Mountain,
  Sun,
  Snowflake,
  Zap,
  Moon,
  CloudRain,
  Flame,
  Rainbow,
  Leaf,
  Trees,
  Binoculars,
  Atom,
  Dog,
  Cat,
  Bird,
  Users,
  Heart,
  Star,
  Crown,
  BookOpen,
  PenLine,
  Music,
  Film,
  Gamepad2,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  Sparkles,
} from 'lucide-react';

export const FOLDER_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  'book-open': BookOpen,
  sparkles: Sparkles,
  lightbulb: Lightbulb,
  heart: Heart,
  star: Star,
  sun: Sun,
  moon: Moon,
  smile: Smile,
  coffee: Coffee,
  music: Music,
  'pen-line': PenLine,
  flower: Flower,
  mountain: Mountain,
  leaf: Leaf,
  trees: Trees,
  plane: Plane,
  camera: Camera,
  backpack: Backpack,
  bike: Bike,
  car: Car,
  home: Home,
  briefcase: Briefcase,
  'graduation-cap': GraduationCap,
  'heart-pulse': HeartPulse,
  dumbbell: Dumbbell,
  gamepad: Gamepad2,
  film: Film,
  crown: Crown,
  users: Users,
  key: Key,
  library: Library,
  tent: Tent,
  globe: Globe,
  map: MapPin,
  pin: Pin,
  flame: Flame,
  zap: Zap,
  'cloud-rain': CloudRain,
  snowflake: Snowflake,
  rainbow: Rainbow,
  utensils: Utensils,
  wine: Wine,
  apple: Apple,
  cake: Cake,
  popcorn: Popcorn,
  basket: ShoppingBasket,
  bed: Bed,
  phone: Phone,
  umbrella: Umbrella,
  bus: Bus,
  train: Train,
  ship: Ship,
  binoculars: Binoculars,
  atom: Atom,
  dog: Dog,
  cat: Cat,
  bird: Bird,
  layers: Layers,
};

export function renderFolderIcon(
  iconName: string,
  className = 'w-5 h-5',
  style?: React.CSSProperties
): React.ReactNode {
  if (iconName && (iconName.startsWith('emoji:') || /\p{Extended_Pictographic}/u.test(iconName))) {
    const emoji = iconName.startsWith('emoji:') ? iconName.slice(6) : iconName;
    return (
      <span
        className="inline-flex items-center justify-center leading-none select-none text-[1.2em]"
        style={style}
      >
        {emoji}
      </span>
    );
  }
  const IconComp = FOLDER_ICONS[iconName] || BookOpen;
  return <IconComp className={className} style={style} />;
}

interface IconPickerProps {
  selectedIcon: string;
  onSelect: (iconName: string) => void;
  accentColor?: string;
}

export const IconPicker: React.FC<IconPickerProps> = ({
  selectedIcon,
  onSelect,
  accentColor = '#6B74F5',
}) => {
  const emojiInputRef = React.useRef<HTMLInputElement>(null);
  const isEmojiSelected = selectedIcon.startsWith('emoji:') || /\p{Extended_Pictographic}/u.test(selectedIcon);
  const currentEmoji = isEmojiSelected
    ? selectedIcon.startsWith('emoji:')
      ? selectedIcon.slice(6)
      : selectedIcon
    : null;

  return (
    <div className="grid grid-cols-7 sm:grid-cols-9 gap-2.5 max-h-56 overflow-y-auto p-1 scrollbar-thin">
      {/* 1st option: Smartphone Native Emoji Picker */}
      <div className="relative w-10 h-10">
        <button
          type="button"
          onClick={() => {
            emojiInputRef.current?.focus();
          }}
          style={{
            borderColor: isEmojiSelected ? accentColor : undefined,
            backgroundColor: isEmojiSelected ? `${accentColor}25` : undefined,
          }}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            isEmojiSelected
              ? 'ring-2 ring-app-accent border-2 scale-105 shadow-md'
              : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 border border-black/5 dark:border-white/10 active:scale-95'
          }`}
          title="Choose Emoji"
          aria-label="Choose Emoji"
        >
          <span className="text-[19px] leading-none select-none">
            {currentEmoji || '😀'}
          </span>
        </button>
        {/* Hidden input to trigger native iOS / Android Emoji Keyboard */}
        <input
          ref={emojiInputRef}
          type="text"
          className="absolute inset-0 opacity-0 cursor-pointer pointer-events-auto"
          aria-label="Type or select emoji"
          onChange={(e) => {
            const val = e.target.value.trim();
            if (val) {
              // Extract the last emoji character
              const chars = Array.from(val);
              const lastChar = chars[chars.length - 1];
              onSelect(`emoji:${lastChar}`);
            }
          }}
        />
      </div>

      {/* SVG Folder Icons */}
      {Object.entries(FOLDER_ICONS).map(([name, Comp]) => {
        const isSelected = selectedIcon === name;
        return (
          <button
            key={name}
            type="button"
            onClick={() => onSelect(name)}
            style={{
              borderColor: isSelected ? accentColor : undefined,
              backgroundColor: isSelected ? `${accentColor}25` : undefined,
              color: isSelected ? accentColor : undefined,
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isSelected
                ? 'ring-2 ring-app-accent border-2 scale-105 shadow-md'
                : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-app-text-primary dark:text-white/80 border border-black/5 dark:border-white/10 active:scale-95'
            }`}
            title={name}
            aria-label={name}
          >
            <Comp className="w-5 h-5" />
          </button>
        );
      })}
    </div>
  );
};
