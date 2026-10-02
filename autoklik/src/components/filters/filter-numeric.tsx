'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';

type FilterType = 'year' | 'enginePower' | 'kilometrage' | 'price' | 'engineSize';
type RangeValue = { min: string; max: string };
type Props = { filterType: FilterType } & (
    | {
        mode: 'single';
        value: string;
        onChange: (value: string) => void;
    }
    | {
        mode?: 'range';
        value: RangeValue;
        onChange: (value: RangeValue) => void;
    }
);

const filters = {
    year: { title: 'Godina proizvodnje', placeholder: 'Godina proizvodnje', unit: '' },
    enginePower: { title: 'Snaga motora (kW)', placeholder: 'Snaga motora (kW)', unit: 'kW' },
    kilometrage: { title: 'Kilometraža (km)', placeholder: 'Kilometraža (km)', unit: 'km' },
    price: { title: 'Cijena (€)', placeholder: 'Cijena', unit: '€' },
    engineSize: { title: 'Obujam motora (cc)', placeholder: 'Obujam motora (cc)', unit: 'cc' },
};
const yearOptions = Array.from({ length: 37 }, (_, index) => String(2026 - index));
const fieldClass = 'flex w-full items-center justify-between border-2 border-[var(--border-color)] px-3 py-2 text-left text-sm placeholder:text-gray-400';



export default function FilterNumeric(props: Props) {
    const { title, placeholder, unit } = filters[props.filterType];
    const [openSide, setOpenSide] = useState<'min' | 'max' | null>(null);
    const root = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const closeOutside = (event: MouseEvent) => {
            if (root.current && !root.current.contains(event.target as Node)) {
                setOpenSide(null);
            }
        };
        document.addEventListener('mousedown', closeOutside);
        return () => document.removeEventListener('mousedown', closeOutside);
    }, []);

    return (
        <div ref={root} className="span-2 flex flex-col gap-3">
            <h1 className="w-full text-center">{title}</h1>

            {props.mode === 'single' ? (
                <div className="relative w-full ">
                    <input
                        type="text"
                        placeholder={placeholder}
                        value={props.value}
                        onChange={(e) => props.onChange(e.currentTarget.value)}
                        className={props.filterType === 'engineSize'
                            ? 'w-full border border-(--border-color) pl-4 pr-10 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-(--color-navbar) focus:border-(--color-navbar) cursor-pointer placeholder:text-gray-400'
                            : fieldClass}
                    />
                </div>
            ) : (
                <div className="flex gap-3">
                    {(['min', 'max'] as const).map((side) => (
                        <div key={side} className="relative w-full">
                            {props.filterType === 'year' ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setOpenSide(openSide === side ? null : side)}
                                        aria-expanded={openSide === side}
                                        className={fieldClass}
                                    >
                                        <span className={props.value[side] === '' ? 'text-gray-400' : ''}>
                                            {props.value[side] || (side === 'min' ? 'Od' : 'Do')}
                                        </span>
                                        <ChevronDownIcon aria-hidden="true" className="h-4 w-4" />
                                    </button>
                                    {openSide === side && (
                                        <div className="absolute z-10 mt-1 w-full bg-(--color-surface) border border-(--border-color) shadow-lg max-h-60 overflow-y-auto">
                                            {yearOptions.map((year) => (
                                                <button
                                                    key={year}
                                                    type="button"
                                                    onClick={() => {
                                                        props.onChange({ ...props.value, [side]: year });
                                                        setOpenSide(null);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-(--color-accent-soft) hover:text-(--color-navbar)"
                                                >
                                                    {year}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <input
                                    type="text"
                                    value={props.value[side]}
                                    onChange={(e) => props.onChange({ ...props.value, [side]: e.currentTarget.value })}
                                    placeholder={`${side === 'min' ? 'Od' : 'Do'} (${unit})`}
                                    className={fieldClass}
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
