'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, SearchIcon } from 'lucide-react';

type BrandOption = { label: string; value: string };
type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  selectedVehicle_type: string;
  mode?: 'single' | 'multi';
  title?: string;
  placeholder?: string;
  showSearch?: boolean;
};

export default function FilterBrands({ value, onChange, selectedVehicle_type, mode = 'multi', title = 'Marka', placeholder = title, showSearch = true }: Props) {
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    if (!['cars', 'motorcycle', 'van'].includes(selectedVehicle_type)) {
      Promise.resolve().then(() => { if (active) setBrands([]); });
      return () => { active = false; };
    }
    const file = selectedVehicle_type === 'motorcycle' ? 'motorcycles' : selectedVehicle_type === 'van' ? 'vans' : 'cars';
    fetch(`/${file}_brandsAndModels.json`)
      .then(response => response.ok ? response.json() : [])
      .then((data: unknown) => {
        if (!active || !Array.isArray(data)) return;
        const rows = data as ({ brand?: string } | string)[];
        const labels = rows.map(row => typeof row === 'string' ? row : row.brand).filter((brand): brand is string => Boolean(brand));
        setBrands([...new Set(labels)].map(label => ({ label, value: label })));
      })
      .catch(() => { if (active) setBrands([]); });
    return () => { active = false; };
  }, [selectedVehicle_type]);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, []);

  const filteredBrands = brands.filter(brand => brand.label.toLowerCase().includes(search.trim().toLowerCase()));
  const selectBrand = (brand: string) => {
    if (mode === 'single') {
      onChange(value[0] === brand ? [] : [brand]);
      setOpen(false);
    } else {
      onChange(value.includes(brand) ? value.filter(selected => selected !== brand) : [...value, brand]);
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
        >
          <span className="flex flex-wrap items-center gap-1">
            {/*----NO BRANDS----*/}
            {value.length === 0 && <span className="text-gray-400">{placeholder}</span>}

            {/*----CHOSEN BRANDS----*/}
            {value.map((brand) => (
                mode === 'multi' ? (
                    <span key={brand} className="bg-(--color-selectedListItem) px-2 py-0.5 text-xs text-[var(--color-text)]">
                      {brand}
                    </span>
                ) : (
                    <span key={brand}>{brand}</span>
                )
            ))}
          </span>

          {/*----ICON----*/}
          <ChevronDownIcon aria-hidden="true" className="h-4 w-4" />
        </button>

        {/*-----------DROPDOWN-----------*/}
        {open &&
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto border bg-[var(--color-surface)] shadow-lg">
            {/*-----------SEARCHBAR-----------*/}
            {showSearch && <div className="relative m-2">
              <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Pretraži marku"
                value={search}
                onChange={event => setSearch(event.currentTarget.value)}
                className="w-full border-2 py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-(--color-navbar) focus:border-[var(--color-navbar)]"
              />
            </div>}

            {/*-----------ITEMS-----------*/}
            {filteredBrands.map(brand =>
              <button
                key={brand.value}
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-navbar)]"
                onClick={() => selectBrand(brand.label)}
              >
                {mode == 'multi' && (
                    <input type="checkbox" checked={value.includes(brand.label)} readOnly />
                )}
                <span>{brand.label}</span>
              </button>
            )}
          </div>
        }
      </div>
    </div>
  );
}
