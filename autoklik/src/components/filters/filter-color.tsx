'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';

type ColorOption = { label: string; value: string };
type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  mode?: 'single' | 'multi';
  title?: string;
  placeholder?: string;
};

const colors: ColorOption[] = [
  { label: 'White', value: 'var(--color-surface)' },
  { label: 'Silver', value: '#9ca3af' },
  { label: 'Gray', value: '#6b7280' },
  { label: 'Black', value: '#111827' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Yellow', value: '#facc15' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Brown', value: '#92400e' },
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Pink', value: '#ec4899' },
];

export default function FilterColor({ value, onChange, mode = 'multi', title = 'Boja', placeholder = title }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, []);

  const selectColor = (color: string) => {
    if (mode === 'single') {
      onChange(value[0] === color ? [] : [color]);
      setOpen(false);
    } else {
      onChange(value.includes(color) ? value.filter(selected => selected !== color) : [...value, color]);
    }
  };

  return (
    <div ref={root} className="flex min-w-0 flex-col gap-3">
      <h2 className="text-center">{title}</h2>
      <div className="relative">
        {/*-----------PLAIN BUTTON (FIRST THING USER SEES)-----------*/}
        <button type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between border-2 border-[var(--border-color)] px-3 py-2 text-left text-sm"
        >          <span className="flex flex-wrap items-center gap-1">
            {/*----NO COLORS----*/}
            {value.length === 0 && <span>{placeholder}</span>}

            {/*----CHOSEN COLORS----*/}
            {value.map(selectedColor => {
              const color = colors.find(option => option.label === selectedColor);
              return <span key={selectedColor} className="flex items-center gap-1 bg-(--color-selectedListItem) px-2 py-0.5 text-xs text-[var(--color-text)]">
                {color && <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: color.value }} />}
                <span>{selectedColor}</span>
                <button type="button" aria-label={`Ukloni boju ${selectedColor}`} onClick={event => { event.stopPropagation(); onChange(value.filter(item => item !== selectedColor)); }}>
                  &#x2715;
                </button>
              </span>;
            })}
          </span>

          {/*----ICON----*/}
          <ChevronDownIcon aria-hidden="true" className="h-4 w-4" />
        </button>

        {/*-----------DROPDOWN-----------*/}
        {open && <div className="absolute z-20 mt-1 grid max-h-60 w-full grid-cols-6 gap-2 overflow-y-auto border bg-[var(--color-surface)] p-3 shadow-lg">
          {/*-----------ITEMS-----------*/}
          {colors.map(color => <button
            key={color.label}
            type="button"
            onClick={() => selectColor(color.label)}
            className="relative h-7 w-7 rounded-full border-2 transition-transform hover:scale-105"
            style={{
              borderColor: value.includes(color.label) ? 'var(--color-navbar)' : 'var(--border-color)',
              backgroundColor: color.value,
            }}
            aria-label={color.label}
            title={color.label}
            aria-pressed={value.includes(color.label)}
          >
            {value.includes(color.label) && <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold" aria-hidden="true">✓</span>}
          </button>)}
        </div>}
      </div>
    </div>
  );
}
