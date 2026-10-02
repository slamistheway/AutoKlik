'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';

type Option = { label: string; value: string };

type Props = {
    filterType: FilterType;
    value: string;
    onChange: (value: string) => void;
    title?: string;
    placeholder?: string;
};

type FilterType = 'condition' | 'buyOrLease' | 'sellerType' | 'fuel' | 'gear' | 'doorNumber';

const filters: Record<FilterType, { title: string; options: Option[] }> = {
    condition: {
        title: 'Stanje',
        options: [
            { label: 'Novo', value: 'Novo' },
            { label: 'Rabljeno', value: 'Rabljeno' },
            { label: 'Oštećeno', value: 'Oštećeno' },
        ],
    },
    buyOrLease: {
        title: 'Buy or lease',
        options: [
            { label: 'Buy', value: 'buy' },
            { label: 'Lease', value: 'lease' },
        ],
    },
    sellerType: {
        title: 'Vrsta prodavača',
        options: [
            { label: 'Privatni', value: 'privatni' },
            { label: 'Trgovac', value: 'trgovac' },
        ],
    },
    fuel: {
        title: 'Gorivo',
        options: [
            { label: 'Petrol', value: 'petrol' },
            { label: 'Diesel', value: 'diesel' },
            { label: 'Electric', value: 'electric' },
            { label: 'Hybrid', value: 'hybrid' },
        ],
    },
    gear: {
        title: 'Mjenjač',
        options: [
            { label: 'Manual', value: 'manual' },
            { label: 'Automatic', value: 'automatic' },
            { label: 'Semi-Automatic', value: 'semi_automatic' },
        ],
    },
    doorNumber: {
        title: 'Broj vrata',
        options: ['2', '3', '4', '5+'].map(value => ({ label: value, value })),
    },
};

export default function FilterChoose({ filterType, value, onChange, title = filters[filterType].title, placeholder = title }: Props) {
    const { options } = filters[filterType];
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const closeOutside = (event: MouseEvent) => {
            if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', closeOutside);
        return () => document.removeEventListener('mousedown', closeOutside);
    }, []);

    const selectOption = (option: Option) => {
        onChange(value === option.value ? '' : option.value);
        setOpen(false);
    };

    return (
        <div ref={root} className="flex min-w-0 flex-col gap-3">
            <h2 className="text-center">{title}</h2>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between border-2 border-[var(--border-color)] px-3 py-2 text-left text-sm"
                >
                    <span className={value === '' ? 'text-gray-400' : ''}>{options.find(option => option.value === value)?.label || placeholder}</span>
                    <ChevronDownIcon aria-hidden="true" className="h-4 w-4" />
                </button>
                {open && (
                    <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto border bg-[var(--color-surface)] shadow-lg">
                        {options.map(option => (
                            <button
                                key={option.value}
                                type="button"
                                className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-navbar)]"
                                onClick={() => selectOption(option)}
                            >
                                <span>{option.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
