'use client';

import { useEffect, useRef, useState } from 'react';

type EnginePowerRange = { min: string; max: string };

type Props =
    | {
        mode: 'single';
        value: string;
        onChange: (value: string) => void;
    }
    | {
        mode: 'range';
        value: EnginePowerRange;
        onChange: (value: EnginePowerRange) => void;
    };

export default function FilterEnginePower(props: Props) {
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

    const focusOutside = () => {
        setOpenMin(false);
        setOpenMax(false);
    };

    return (
        <div className="span-2 flex flex-col gap-3">
            <h1 className="w-full text-center">Snaga motora (kW)</h1>

            {props.mode === 'single' ? (
                <div className="relative w-full ">
                    <input
                        type="text"
                        placeholder="Snaga motora (kW)"
                        value={props.value}
                        onChange={(e) => props.onChange(e.currentTarget.value)}
                        className="flex w-full items-center justify-between border-2 border-[var(--border-color)] px-3 py-2 text-left text-sm"
                    />
                </div>
            ) : (
                <div className="flex gap-3">
                    <div ref={rootMin} className="relative w-full">
                        <input
                            type="text"
                            onClick={toggleDropdownMIN}
                            onFocus={focusOutside}
                            value={props.value.min}
                            onChange={(e) => props.onChange({ ...props.value, min: e.currentTarget.value })}
                            placeholder="Od (kW)"
                            className="flex w-full items-center justify-between border-2 border-[var(--border-color)] px-3 py-2 text-left text-sm"
                        />
                    </div>

                    <div ref={rootMax} className="relative w-full">
                        <div className="flex">
                            <input
                                type="text"
                                onClick={toggleDropdownMAX}
                                onFocus={focusOutside}
                                value={props.value.max}
                                onChange={(e) => props.onChange({ ...props.value, max: e.currentTarget.value })}
                                placeholder="Do (kW)"
                                className="flex w-full items-center justify-between border-2 border-[var(--border-color)] px-3 py-2 text-left text-sm"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
