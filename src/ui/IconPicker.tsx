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
  return (
    <div className="grid grid-cols-7 sm:grid-cols-9 gap-2.5 max-h-56 overflow-y-auto p-1">
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
                ? 'ring-2 ring-white/50 border-2 scale-105'
                : 'bg-white/6 hover:bg-white/12 text-white/80 active:scale-95'
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
