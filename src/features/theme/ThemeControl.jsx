import React, { useEffect, useRef, useState } from 'react';
import Icon from '../../components/common/Icon.jsx';
import { useTheme } from './ThemeContext.jsx';

const options = [
    { value: 'light', label: 'בהיר', icon: 'sun' },
    { value: 'dark', label: 'כהה', icon: 'moon' },
    { value: 'system', label: 'לפי המערכת', icon: 'monitor' }
];

const ThemeControl = () => {
    const { preference, resolvedTheme, setPreference, toggleTheme } = useTheme();
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);
    const isDark = resolvedTheme === 'dark';

    useEffect(() => {
        if (!open) return undefined;

        const handlePointerDown = (event) => {
            if (!wrapperRef.current?.contains(event.target)) setOpen(false);
        };
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    return (
        <div ref={wrapperRef} className="theme-control" dir="rtl">
            <div className="theme-control__buttons">
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="theme-control__toggle"
                    aria-label={isDark ? 'מעבר למצב בהיר' : 'מעבר למצב כהה'}
                    title={isDark ? 'מעבר למצב בהיר' : 'מעבר למצב כהה'}
                >
                    <Icon name={isDark ? 'sun' : 'moon'} className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => setOpen((value) => !value)}
                    className="theme-control__menu-button"
                    aria-haspopup="menu"
                    aria-expanded={open}
                    aria-label="בחירת ערכת נושא"
                    title="בחירת ערכת נושא"
                >
                    <Icon name="chevronDown" className={`h-3 w-3 transition ${open ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {open && (
                <div className="theme-control__menu" role="menu">
                    {options.map((option) => {
                        const selected = preference === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="menuitemradio"
                                aria-checked={selected}
                                className={`theme-control__option ${selected ? 'theme-control__option--selected' : ''}`}
                                onClick={() => {
                                    setPreference(option.value);
                                    setOpen(false);
                                }}
                            >
                                <Icon name={option.icon} className="h-4 w-4" />
                                <span>{option.label}</span>
                                {selected && <Icon name="check" className="mr-auto h-4 w-4" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ThemeControl;
