'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';

type YearOption = { label: string; value: string };

type YearRange = { min: string; max: string };

type Props =
    | {
        mode: 'single';
        value: string;
        onChange: (value: string) => void;
    }
    | {
        mode?: 'range';
        value: YearRange;
        onChange: (value: YearRange) => void;
    };

function buildYearOptions(): YearOption[] {
    const steps: number[] = []
    for (let year = 2026; year >= 1990; year--) {
        steps.push(year);
    }
    return steps.map((year) => ({ label: `${year}`, value: String(year) }));
}

const YEAR_OPTIONS = buildYearOptions();

export default function FilterYears(props: Props) {
    const [openMin, setOpenMin] = useState(false);
    const [openMax, setOpenMax] = useState(false);
    const rootMin = useRef<HTMLDivElement>(null);
    const rootMax = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const closeOutside = (event: MouseEvent) => {
            if (rootMin.current && !rootMin.current.contains(event.target as Node)) {
                setOpenMin(false);
            }
            if (rootMax.current && !rootMax.current.contains(event.target as Node)) {
                setOpenMax(false);
            }
        };
        document.addEventListener('mousedown', closeOutside);
        return () => document.removeEventListener('mousedown', closeOutside);
    }, []);

    const toggleDropdownMIN = () => {
        setOpenMin((prev) => !prev);
        setOpenMax(false);
    };

    const toggleDropdownMAX = () => {
        setOpenMax((prev) => !prev);
        setOpenMin(false);
    };

    const selectYearMIN = (option: YearOption) => {
        if (props.mode !== 'single') {
            props.onChange({ ...props.value, min: option.value });
        }
        setOpenMin(false);
    };

    const selectYearMAX = (option: YearOption) => {
        if (props.mode !== 'single') {
            props.onChange({ ...props.value, max: option.value });
        }
        setOpenMax(false);
    };

    const focusOutside = () => {
        setOpenMin(false);
        setOpenMax(false);
    };



    return (
        <div className="span-2 flex flex-col gap-3">
            <h1 className="w-full text-center">Godina proizvodnje</h1>

            {props.mode === 'single' ? (
                <div className="relative w-full ">
                    <input
                        type="text"
                        placeholder="Godina proizvodnje"
                        value={props.value}
                        onChange={(e) => props.onChange(e.currentTarget.value)}
                        className="flex w-full items-center justify-between border-2 border-[var(--border-color)] px-3 py-2 text-left text-sm"
                    />
                </div>
            ) : (
                <div className="flex gap-3">
                    {/* GODINA OD */}
                    <div ref={rootMin} className="relative w-full">
                        {/*-----------PLAIN BUTTON (FIRST THING USER SEES)-----------*/}
                        <button type="button"
                                onClick={() => setOpenMin(!openMin)}
                                className="flex w-full items-center justify-between border-2 border-[var(--border-color)] px-3 py-2 text-left text-sm"
                        >
                          <span className="flex flex-wrap items-center gap-1">
                              {props.value.min == "" && <span className="text-(--border-color)">Od</span>}
                          </span>

                            {/*----ICON----*/}
                            <ChevronDownIcon aria-hidden="true" className="h-4 w-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {openMin && (
                            <div className="absolute z-10 mt-1 w-full bg-(--color-surface) border border-(--border-color) shadow-lg max-h-60 overflow-y-auto">
                                {YEAR_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => selectYearMIN(option)}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-(--color-accent-soft) hover:text-(--color-navbar)"
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* GODINA DO */}
                    <div ref={rootMax} className="relative w-full">
                        <div className="flex">
                            {/*-----------PLAIN BUTTON (FIRST THING USER SEES)-----------*/}
                            <button type="button"
                                    onClick={() => setOpenMax(!openMax)}
                                    className="flex w-full items-center justify-between border-2 border-[var(--border-color)] px-3 py-2 text-left text-sm"
                            >
                          <span className="flex flex-wrap items-center gap-1">
                              {props.value.min == "" && <span className="text-(--border-color)">Do</span>}
                          </span>

                                {/*----ICON----*/}
                                <ChevronDownIcon aria-hidden="true" className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Dropdown Menu */}
                        {openMax && (
                            <div className="absolute z-10 mt-1 w-full bg-(--color-surface) border border-(--border-color) shadow-lg max-h-60 overflow-y-auto">
                                {YEAR_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => selectYearMAX(option)}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-(--color-accent-soft) hover:text-(--color-navbar)"
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
