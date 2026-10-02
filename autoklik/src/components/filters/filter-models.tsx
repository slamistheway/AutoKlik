'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, SearchIcon } from 'lucide-react';

type ModelOption = { label: string; value: string };
type BrandModels = { brand: string; models: ModelOption[] };
type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  selectedVehicle_type: string;
  selectedBrands?: string[];
  mode?: 'single' | 'multi';
  title?: string;
  placeholder?: string;
  showSearch?: boolean;
  showSelectedBrandLabel?: boolean;
};

export default function FilterModels({ value, onChange, selectedVehicle_type, selectedBrands = [], mode = 'multi', title = 'Model', placeholder = title, showSearch = true, showSelectedBrandLabel = true }: Props) {
  const [modelsByBrand, setModelsByBrand] = useState<BrandModels[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    if (!['cars', 'motorcycle', 'van'].includes(selectedVehicle_type)) {
      Promise.resolve().then(() => { if (active) setModelsByBrand([]); });
      return () => { active = false; };
    }

    const file = selectedVehicle_type === 'motorcycle' ? 'motorcycles' : selectedVehicle_type === 'van' ? 'vans' : 'cars';
    fetch(`/${file}_brandsAndModels.json`)
      .then(response => response.ok ? response.json() : [])
      .then((data: unknown) => {
        if (!active || !Array.isArray(data)) return;
        const rows = data as { brand?: string; models?: string[] }[];
        setModelsByBrand(rows.filter(row => row.brand).map(row => ({
          brand: row.brand!,
          models: (row.models ?? []).map(label => ({ label, value: label })),
        })));
      })
      .catch(() => { if (active) setModelsByBrand([]); });
    return () => { active = false; };
  }, [selectedVehicle_type]);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, []);

  const getFilteredModelsForBrand = (brand: string) => modelsByBrand
    .find(item => item.brand === brand)?.models
    .filter(model => model.label.toLowerCase().includes(search.trim().toLowerCase())) ?? [];
  const hasFilteredModels = selectedBrands.some(brand => getFilteredModelsForBrand(brand).length > 0);
  const selectModel = (model: string) => {
    if (mode === 'single') {
      onChange(value[0] === model ? [] : [model]);
      setOpen(false);
    } else {
      onChange(value.includes(model) ? value.filter(selected => selected !== model) : [...value, model]);
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
            {/*----NO MODELS----*/}
            {value.length === 0 && <span className="text-gray-400">{placeholder}</span>}

            {/*----CHOSEN MODELS----*/}
            {value.map((model) => (
                mode === 'multi' ? (
                    <span key={model} className="bg-(--color-selectedListItem) px-2 py-0.5 text-xs text-[var(--color-text)]">
                      {model}
                    </span>
                ) : (
                    <span key={model}>{model}</span>
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
              <input type="text" placeholder="Pretraži model" value={search} onChange={event => setSearch(event.currentTarget.value)} className="w-full border-2 py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-(--color-navbar) focus:border-[var(--color-navbar)]" />
            </div>}

            {/*-----------ITEMS-----------*/}
            {selectedBrands.length === 0 ? (
              <p className="px-2 py-2 text-sm text-gray-500">Prvo odaberite marku.</p>
            ) : (
              <>
                {selectedBrands.map((brand, index) => (
                  <div key={brand}>
                    {showSelectedBrandLabel && selectedBrands[0] && (
                      <p className="px-2 py-2 text-sm text-gray-500">{selectedBrands[index]}</p>
                    )}
                    {getFilteredModelsForBrand(brand).map(model => (
                      <button
                        key={`${brand}-${model.value}`}
                        type="button"
                        className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-navbar)]"
                        onClick={() => selectModel(model.label)}
                      >
                        {mode == 'multi' && (
                            <input type="checkbox" checked={value.includes(model.label)} readOnly />
                        )}
                        <span>{model.label}</span>
                      </button>
                    ))}
                  </div>
                ))}
                {!hasFilteredModels && <p className="px-2 py-2 text-sm text-gray-500">Nema rezultata za pretragu.</p>}
              </>
            )}
          </div>
        }
      </div>
    </div>
  );
}
