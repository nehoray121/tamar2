import React from 'react';
import Icon from '../common/Icon.jsx';

        const Button = ({ children, variant = 'primary', className = '', ...props }) => {
            const baseStyle = "flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors";
            const variants = {
                primary: "bg-brand-blue text-white hover:bg-blue-800",
                outline: "border border-brand-blue text-brand-blue hover:bg-blue-50 bg-white",
                ghost: "text-gray-600 bg-white border border-gray-300 hover:bg-gray-50",
            };
            return <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>{children}</button>;
        };

        const Badge = ({ children, type }) => {
            const styles = {
                active: "bg-[#22C55E] text-white",
                high: "bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5]",
                medium: "bg-[#FEF3C7] text-[#D97706] border border-[#FCD34D]",
                low: "bg-[#FCE7F3] text-[#EC4899] border border-[#FBCFE8]"
            };
            return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${styles[type] || styles.active}`}>{children}</span>;
        };

        const Input = ({ label, icon, containerClassName = "mb-3", className = "", ...props }) => (
            <div className={containerClassName}>
                {label && <label className="block text-xs font-bold text-gray-700 mb-1.5">{label}</label>}
                <div className="relative">
                    <input className={`w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-brand-blue transition-all shadow-sm ${icon ? 'pl-9' : ''} ${className}`} {...props} />
                    {icon && <div className="absolute left-2.5 top-2.5 text-gray-400"><Icon name={icon} className="w-3.5 h-3.5" /></div>}
                </div>
            </div>
        );

        const Select = ({ label, options, containerClassName = "mb-3", className = "", ...props }) => (
            <div className={containerClassName}>
                {label && <label className="block text-xs font-bold text-gray-700 mb-1.5">{label}</label>}
                <select className={`w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-xs appearance-none focus:outline-none focus:border-brand-blue transition-all shadow-sm ${className}`} {...props}>
                    {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
                </select>
            </div>
        );


export { Button, Badge, Input, Select };
