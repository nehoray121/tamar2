import React from 'react';
import Icon from '../common/Icon.jsx';

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
    const baseStyle = 'flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]';
    const variants = {
        primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]',
        outline: 'border border-[var(--color-primary)] bg-[var(--color-surface-raised)] text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]',
        ghost: 'border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]'
    };
    return <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

const Badge = ({ children, type }) => {
    const styles = {
        active: 'bg-[#22C55E] text-white dark:bg-emerald-500/90',
        high: 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300',
        medium: 'bg-[#FEF3C7] text-[#D97706] border border-[#FCD34D] dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-300',
        low: 'bg-[#FCE7F3] text-[#EC4899] border border-[#FBCFE8] dark:border-pink-400/25 dark:bg-pink-500/10 dark:text-pink-300'
    };
    return <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${styles[type] || styles.active}`}>{children}</span>;
};

const Input = ({ label, icon, containerClassName = 'mb-3', className = '', ...props }) => (
    <div className={containerClassName}>
        {label && <label className="mb-1.5 block text-xs font-bold text-[var(--color-text-secondary)]">{label}</label>}
        <div className="relative">
            <input className={`inquiry-input-surface w-full rounded-lg px-3 py-2.5 text-xs shadow-sm outline-none transition-all focus:border-[var(--color-primary)] ${icon ? 'pl-9' : ''} ${className}`} {...props} />
            {icon && <div className="absolute left-2.5 top-2.5 text-[var(--color-text-muted)]"><Icon name={icon} className="h-3.5 w-3.5" /></div>}
        </div>
    </div>
);

const Select = ({ label, options, containerClassName = 'mb-3', className = '', ...props }) => (
    <div className={containerClassName}>
        {label && <label className="mb-1.5 block text-xs font-bold text-[var(--color-text-secondary)]">{label}</label>}
        <select className={`inquiry-input-surface w-full appearance-none rounded-lg px-3 py-2.5 text-xs shadow-sm outline-none transition-all focus:border-[var(--color-primary)] ${className}`} {...props}>
            {options.map((option) => <option key={option.value || option} value={option.value || option}>{option.label || option}</option>)}
        </select>
    </div>
);

export { Button, Badge, Input, Select };