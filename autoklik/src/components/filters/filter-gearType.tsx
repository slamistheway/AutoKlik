'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';

type Option = { label: string; value: string };

type Props = {
    value: string;
    onChange: (value: string) => void;
    title?: string;
    placeholder?: string;
};

const options: Option[] = [
    { label: 'Manual', value: 'manual' },
    { label: 'Automatic', value: 'automatic' },
    { label: 'Semi-Automatic', value: 'semi_automatic' },
];

export default function FilterGearType({ value, onChange, title = 'Mjenjač', placeholder = title }: Props) {
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
                    className="flex w-full items-center justify-between border-2 border-[var(--border-color)] px-3 py-2 text-left text-sm"
                >
                    <span>{options.find(option => option.value === value)?.label || placeholder}</span>
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
