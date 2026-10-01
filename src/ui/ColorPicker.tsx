import React, { useRef } from 'react';

const SWATCHES = [
  '#B5609A',
  '#F55A5A',
  '#E58AD8',
  '#EE8F8F',
  '#DBA08C',
  '#FF9F6B',
  '#00C896',
  '#38B8DC',
  '#3F5FD0',
  '#7FA6C9',
  '#7B96FF',
  '#8A7BD8',
  '#FFFFFF',
];

interface ColorPickerProps {
  selectedColor: string;
  onChange: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onChange }) => {
  const customInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-3">
        {SWATCHES.map((color) => {
          const isSelected = selectedColor.toLowerCase() === color.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              className={`w-9 h-9 rounded-full transition-transform flex items-center justify-center ${
                isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1C1A24] scale-110' : 'hover:scale-105 active:scale-95'
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Color ${color}`}
            >
              {isSelected && (
                <span className={`text-xs font-bold ${color === '#FFFFFF' ? 'text-black' : 'text-white'}`}>
                  ✓
                </span>
              )}
            </button>
          );
        })}

        {/* Custom Color Wheel swatch */}
        <div className="relative">
          <input
            ref={customInputRef}
            type="color"
            value={selectedColor}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            aria-label="Custom color picker"
          />
          <button
            type="button"
            onClick={() => customInputRef.current?.click()}
            className="w-9 h-9 rounded-full hover:scale-105 active:scale-95 transition-transform flex items-center justify-center shadow"
            style={{
              background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
            }}
            title="Custom color"
          >
            <div className="w-3 h-3 rounded-full bg-white/80" />
          </button>
        </div>
      </div>
    </div>
  );
};
