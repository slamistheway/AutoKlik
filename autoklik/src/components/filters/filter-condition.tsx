'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, SearchIcon } from 'lucide-react';

type ConditionOption = { label: string; value: string };

type Props = {
 value: string;
 onChange: (value: string) => void;
 mode?: 'single' | 'multi';
 title?: string;
 placeholder?: string;
};

const conditions: ConditionOption[] = [
 { label: 'Novo', value: 'condition_new' },
 { label: 'Rabljeno', value: 'condition_used' },
 { label: 'Oštećeno', value: 'condition_damaged' },
];

export default function FilterCounty({ value, onChange, mode = 'single', title = 'Stanje', placeholder = title }: Props) {
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

 const selectCondition = (condition: string) => {
   onChange(value === condition ? '' : condition);
   setOpen(false);
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
           {value.length === 0 && <span>{placeholder}</span>}

           {/*----CHOSEN CONDITION----*/}
           <span>{value}</span>
          </span>

        {/*----ICON----*/}
        <ChevronDownIcon aria-hidden="true" className="h-4 w-4" />
       </button>

       {/*-----------DROPDOWN-----------*/}
       {open && <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto border bg-[var(--color-surface)] shadow-lg">

        {/*-----------ITEMS-----------*/}
        {conditions.map(condition =>
            <button
              key={condition.value}
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-navbar)]"
              onClick={() => selectCondition(condition.label)}
            >
             <span>{condition.label}</span>
            </button>
        )}
       </div>}
      </div>
     </div>
 );
}
