'use client';

import { useEffect, useRef, useState } from 'react';

type EngineSizeRange = { min: string; max: string };

type Props =
    | {
        mode: 'single';
        value: string;
        onChange: (value: string) => void;
    }
    | {
        mode?: 'range';
        value: EngineSizeRange;
        onChange: (value: EngineSizeRange) => void;
    };

export default function FilterEngineSize(props: Props) {
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
            <h1 className="w-full text-center">Obujam motora (cc)</h1>

            {props.mode === 'single' ? (
                <div className="relative w-full ">
                    <input
                        type="text"
                        placeholder="Obujam motora (cc)"
                        value={props.value}
                        onChange={(e) => props.onChange(e.currentTarget.value)}
                        className="w-full border border-(--border-color) pl-4 pr-10 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-(--color-navbar) focus:border-(--color-navbar) cursor-pointer"
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
                            placeholder="Od (cc)"
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
                                placeholder="Do (cc)"
                                className="flex w-full items-center justify-between border-2 border-[var(--border-color)] px-3 py-2 text-left text-sm"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
