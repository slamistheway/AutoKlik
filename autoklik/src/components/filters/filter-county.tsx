'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, SearchIcon } from 'lucide-react';

type CountyOption = { label: string; value: string };
type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  mode?: 'single' | 'multi';
  title?: string;
  placeholder?: string;
  showSearch?: boolean;
};

const counties: CountyOption[] = [
  { label: 'Bjelovarsko-bilogorska', value: 'bjelovarsko_bilogorska' },
  { label: 'Brodsko-posavska', value: 'brodsko_posavska' },
  { label: 'Dubrovačko-neretvanska', value: 'dubrovačko_neretvanska' },
  { label: 'Istarska', value: 'istarska' },
  { label: 'Karlovačka', value: 'karlovačka' },
  { label: 'Koprivničko-križevačka', value: 'koprivničko_križevačka' },
  { label: 'Krapinsko-zagorska', value: 'krapinsko_zagorska' },
  { label: 'Ličko-senjska', value: 'ličko_senjska' },
  { label: 'Međimurska', value: 'međimurska' },
  { label: 'Osječko-baranjska', value: 'osječko_baranjska' },
  { label: 'Požeško-slavonska', value: 'požeško_slavonska' },
  { label: 'Primorsko-goranska', value: 'primorsko_goranska' },
  { label: 'Sisačko-moslavačka', value: 'sisačko_moslavačka' },
  { label: 'Splitsko-dalmatinska', value: 'splitsko_dalmatinska' },
  { label: 'Varaždinska', value: 'varaždinska' },
  { label: 'Virovitičko-podravska', value: 'virovitičko_podravska' },
  { label: 'Vukovarsko-srijemska', value: 'vukovarsko_srijemska' },
  { label: 'Zadarska', value: 'zadarska' },
  { label: 'Zagrebačka', value: 'zagrebačka' },
  { label: 'Grad Zagreb', value: 'grad_zagreb' },
];

export default function FilterCounty({ value, onChange, mode = 'multi', title = 'Županija', placeholder = title, showSearch = true }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, []);

  const filteredCounties = counties.filter(county => county.label.toLowerCase().includes(search.trim().toLowerCase()));
  const selectCounty = (county: string) => {
    if (mode === 'single') {
      onChange(value[0] === county ? [] : [county]);
      setOpen(false);
    } else {
      onChange(value.includes(county) ? value.filter(selected => selected !== county) : [...value, county]);
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
            {/*----NO COUNTIES----*/}
            {value.length === 0 && <span className="text-gray-400">{placeholder}</span>}

            {/*----CHOSEN COUNTIES----*/}
            {value.map((county) => (
                mode === 'multi' ? (
                    <span key={county} className="bg-(--color-selectedListItem) px-2 py-0.5 text-xs text-[var(--color-text)]">
                      {county}
                    </span>
                ) : (
                    <span key={county}>{county}</span>
                )
            ))}
          </span>

          {/*----ICON----*/}
          <ChevronDownIcon aria-hidden="true" className="h-4 w-4" />
        </button>

        {/*-----------DROPDOWN-----------*/}
        {open && <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto border bg-[var(--color-surface)] shadow-lg">
          {/*-----------SEARCHBAR-----------*/}
          {showSearch && <div className="relative m-2">
            <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Pretraži županiju" value={search} onChange={event => setSearch(event.currentTarget.value)} className="w-full border-2 py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-(--color-navbar) focus:border-[var(--color-navbar)]" />
          </div>}

          {/*-----------ITEMS-----------*/}
          {filteredCounties.map(county => <button key={county.value} type="button" className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-navbar)]" onClick={() => selectCounty(county.label)}>
            <input type="checkbox" checked={value.includes(county.label)} readOnly />
            <span>{county.label}</span>
          </button>)}
        </div>}
      </div>
    </div>
  );
}
