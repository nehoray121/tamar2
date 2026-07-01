import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'tamar-theme-preference';
const THEME_OPTIONS = ['light', 'dark', 'system'];

const ThemeContext = createContext(null);

const getSystemTheme = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getSavedPreference = () => {
    if (typeof window === 'undefined') return 'system';

    const bootstrappedPreference = document.documentElement.dataset.themePreference;
    if (THEME_OPTIONS.includes(bootstrappedPreference)) return bootstrappedPreference;

    try {
        const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
        return THEME_OPTIONS.includes(saved) ? saved : 'system';
    } catch {
        return 'system';
    }
};

const resolvePreference = (preference, systemTheme) => (
    preference === 'system' ? systemTheme : preference
);

const applyTheme = (preference, resolvedTheme) => {
    const root = document.documentElement;
    root.dataset.themePreference = preference;
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
};

export const ThemeProvider = ({ children }) => {
    const [preference, setPreferenceState] = useState(getSavedPreference);
    const [systemTheme, setSystemTheme] = useState(getSystemTheme);
    const resolvedTheme = resolvePreference(preference, systemTheme);

    useEffect(() => {
        applyTheme(preference, resolvedTheme);
    }, [preference, resolvedTheme]);

    useEffect(() => {
        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, preference);
        } catch {
            // Theme still works for this session if storage is unavailable.
        }
    }, [preference]);

    useEffect(() => {
        if (!window.matchMedia) return undefined;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (event) => setSystemTheme(event.matches ? 'dark' : 'light');

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        const handleStorage = (event) => {
            if (event.key === THEME_STORAGE_KEY && THEME_OPTIONS.includes(event.newValue)) {
                setPreferenceState(event.newValue);
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const value = useMemo(() => ({
        preference,
        resolvedTheme,
        setPreference: (nextPreference) => {
            if (THEME_OPTIONS.includes(nextPreference)) setPreferenceState(nextPreference);
        },
        toggleTheme: () => setPreferenceState((currentPreference) => {
            const currentResolved = resolvePreference(currentPreference, getSystemTheme());
            return currentResolved === 'dark' ? 'light' : 'dark';
        })
    }), [preference, resolvedTheme]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used inside ThemeProvider');
    return context;
};

export { THEME_STORAGE_KEY };
