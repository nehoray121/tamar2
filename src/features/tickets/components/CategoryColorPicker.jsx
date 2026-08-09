import React, { useMemo, useRef } from 'react';

const DEFAULT_CUSTOM_COLOR = '#2563EB';
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

const normalizeHexColor = (value) => value.toUpperCase();

const CategoryColorPicker = ({ color, shortcuts = [], onColorPick }) => {
    const inputRef = useRef(null);
    const normalizedColor = HEX_COLOR_PATTERN.test(color) ? normalizeHexColor(color) : DEFAULT_CUSTOM_COLOR;
    const normalizedShortcuts = useMemo(() => shortcuts.map(normalizeHexColor), [shortcuts]);
    const isCustomColor = !normalizedShortcuts.includes(normalizedColor);

    return (
        <div className="flex flex-wrap items-center gap-2">
            {shortcuts.map((shortcut) => {
                const normalizedShortcut = normalizeHexColor(shortcut);
                const isActive = normalizedShortcut === normalizedColor;

                return (
                    <button
                        key={shortcut}
                        type="button"
                        onClick={() => onColorPick(normalizedShortcut)}
                        className={`h-8 w-8 rounded-full border-2 transition ${isActive ? 'border-slate-900 dark:border-white' : 'border-transparent hover:border-blue-200 dark:hover:border-blue-400/40'}`}
                        style={{ backgroundColor: shortcut }}
                        aria-label={`בחירת צבע ${shortcut}`}
                    />
                );
            })}

            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className={`relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 transition ${isCustomColor ? 'border-slate-900 dark:border-white' : 'border-transparent hover:border-blue-200 dark:hover:border-blue-400/40'}`}
                style={isCustomColor ? { backgroundColor: normalizedColor } : { backgroundImage: 'conic-gradient(from 180deg at 50% 50%, #2563EB, #8B5CF6, #EC4899, #F97316, #22C55E, #2563EB)' }}
                aria-label="בחירת צבע חופשי"
            >
                {!isCustomColor && <span className="text-sm font-black text-white drop-shadow-sm">+</span>}
                <input
                    ref={inputRef}
                    type="color"
                    value={normalizedColor}
                    onChange={(event) => onColorPick(normalizeHexColor(event.target.value))}
                    className="pointer-events-none absolute h-0 w-0 opacity-0"
                    tabIndex={-1}
                    aria-hidden="true"
                />
            </button>
        </div>
    );
};

export { normalizeHexColor };
export default CategoryColorPicker;