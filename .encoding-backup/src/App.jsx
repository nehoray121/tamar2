import React, { useState, useEffect } from 'react';
import Icon from './components/common/Icon.jsx';


        // --- MOCK DATA ---
        const mockTasks = [
            { id: 'M-17-938', date: '12 ׳‘׳™׳•׳ ׳™ 2026', phone: '׳׳ ׳–׳׳™׳', name: '׳¢׳˜׳™׳” ׳ ׳”׳•׳¨׳׳™', room: '333333333333', priority: '׳ ׳׳•׳›׳”-3', desc: '׳”׳₪׳ ׳™׳™׳” ׳₪׳×׳•׳—׳”', status: 'open' },
            { id: 'M-18-260', date: '15 ׳‘׳₪׳‘׳¨׳•׳׳¨ 2026', phone: '׳׳ ׳–׳׳™׳', name: 'c9812512', room: '333333333333', priority: '׳ ׳׳•׳›׳”-3', desc: '׳”׳₪׳ ׳™׳™׳” ׳₪׳×׳•׳—׳”', status: 'open' },
            { id: '7983179', date: '29 ׳‘׳“׳¦׳׳‘׳¨ 2025', phone: '׳׳ ׳–׳׳™׳', name: '׳¨׳•׳–׳” ׳›׳”׳', room: 'c9812512', priority: '׳’׳‘׳•׳”׳”-1', desc: '׳”׳₪׳ ׳™׳™׳” ׳ ׳¡׳’׳¨׳”', status: 'closed' }
        ];

        // --- COMMON COMPONENTS ---
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

        // --- 1. ENVIRONMENT SELECTION MODAL ---
        const EnvironmentSelectionModal = ({ onConfirm, onClose, isAdmin }) => {
            const [selectedId, setSelectedId] = useState(null);
            
            const envs = [
                { id: 1, name: '׳×׳§׳©׳•׳‘', date: '24 ׳‘׳™׳•׳ ׳™ 2026' },
                { id: 2, name: '׳‘׳™׳¡׳׳—', date: '24 ׳‘׳™׳•׳ ׳™ 2026' },
                { id: 3, name: '׳’\'׳•׳׳™׳', date: '24 ׳‘׳™׳•׳ ׳™ 2026' },
                { id: 4, name: '׳©׳™׳‘׳˜׳”', date: '24 ׳‘׳™׳•׳ ׳™ 2026' },
                { id: 5, name: '׳”׳©׳×׳׳׳•׳× ׳–׳¨׳•׳¢ ׳™׳‘׳©׳”', date: '24 ׳‘׳™׳•׳ ׳™ 2026' },
                { id: 6, name: '׳׳—׳©׳•׳‘', date: '24 ׳‘׳™׳•׳ ׳™ 2026' },
            ];

            return (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 glass-modal animate-fade-in">
                    <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        
                        {/* Header */}
                        <div className="flex flex-col items-center justify-center pt-8 pb-4 relative shrink-0">
                            <button onClick={onClose} className="absolute top-6 left-6 text-gray-400 hover:text-gray-700 bg-gray-50 border border-gray-100 p-2 rounded-full transition-colors shadow-sm">
                                <Icon name="close" className="w-4 h-4" />
                            </button>
                            <div className="absolute top-6 right-6 text-brand-mainBlue">
                                <Icon name="globe" className="w-6 h-6" />
                            </div>
                            <h2 className="text-[28px] font-black text-[#1E3A8A] tracking-tight">׳‘׳—׳™׳¨׳× ׳¡׳‘׳™׳‘׳”</h2>
                            <p className="text-gray-500 font-bold text-sm mt-1">15 ׳¡׳‘׳™׳‘׳•׳× ׳¢׳‘׳•׳“׳” ׳–׳׳™׳ ׳•׳×</p>
                            
                            <div className="w-full max-w-2xl px-6 mt-6 relative">
                                <input 
                                    className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl py-3 px-4 pl-10 text-sm focus:outline-none focus:border-[#1E4DB7] transition-all shadow-sm font-semibold text-gray-700" 
                                    placeholder="׳—׳₪׳© ׳¡׳‘׳™׳‘׳” ׳׳₪׳™ ׳©׳..." 
                                />
                                <Icon name="search" className="w-4 h-4 absolute left-10 top-3.5 text-[#1E4DB7]" />
                            </div>
                        </div>

                        {/* Grid Body */}
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">
                            <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
                                {envs.map(env => (
                                    <div 
                                        key={env.id} 
                                        onClick={() => setSelectedId(env.id)}
                                        className={`bg-white border rounded-2xl p-5 cursor-pointer transition-all shadow-sm flex flex-col items-center justify-center min-h-[120px] gap-3 relative ${
                                            selectedId === env.id ? 'border-[#1E4DB7] ring-1 ring-[#1E4DB7] bg-blue-50/30' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 text-[#1E3A8A] font-extrabold text-lg">
                                            {env.name} <Icon name="building" className="w-5 h-5 text-[#1E4DB7]" />
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-bold flex items-center gap-1 absolute bottom-3 left-4">
                                            <Icon name="calendar" className="w-3 h-3" /> {env.date}
                                        </div>
                                    </div>
                                ))}

                                {/* Admin Create Environment Option */}
                                {isAdmin && (
                                    <div className="bg-[#F8FAFC] border-2 border-dashed border-gray-300 rounded-2xl p-5 flex flex-col items-center justify-center min-h-[120px] gap-3">
                                        <input 
                                            className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-[#1E4DB7] text-center font-bold"
                                            placeholder="׳”׳›׳ ׳¡ ׳©׳ ׳¡׳‘׳™׳‘׳”..."
                                        />
                                        <Button className="w-full text-xs py-2">׳™׳¦׳™׳¨׳× ׳¡׳‘׳™׳‘׳” ׳—׳“׳©׳”</Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-5 border-t border-gray-100 flex justify-center gap-4 bg-white shrink-0">
                            <Button variant="ghost" onClick={onClose} className="px-8 rounded-xl font-bold">׳‘׳˜׳</Button>
                            <Button 
                                onClick={() => selectedId && onConfirm(envs.find(e => e.id === selectedId))} 
                                className={`px-10 rounded-xl font-bold ${!selectedId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={!selectedId}
                            >
                                <Icon name="check" className="w-4 h-4" /> ׳׳©׳¨ ׳׳¢׳‘׳¨
                            </Button>
                        </div>
                    </div>
                </div>
            );
        };

        // --- CREATE ITEM MODAL ---
        const CreateItemModal = ({ type, onClose, onSave }) => {
            const title = type === 'sub_env' ? '׳™׳¦׳™׳¨׳× ׳×׳× ׳¡׳‘׳™׳‘׳”' : '׳™׳¦׳™׳¨׳× ׳—׳“׳¨ ׳—׳“׳©';
            const placeholder1 = type === 'sub_env' ? '׳©׳ ׳”׳×׳× ׳¡׳‘׳™׳‘׳”' : '׳©׳ ׳”׳—׳“׳¨';
            const placeholder2 = '׳×׳™׳׳•׳¨ ׳§׳¦׳¨ (׳׳•׳₪׳¦׳™׳•׳ ׳׳™)';

            return (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 glass-modal animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-xl font-black text-[#1E3A8A]">{title}</h2>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-white border border-gray-200 p-1.5 rounded-lg transition-colors shadow-sm">
                                <Icon name="close" className="w-4 h-4" />
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-6 flex flex-col gap-4">
                            <Input label={<span className="text-gray-700 font-bold">{placeholder1} <span className="text-red-500">*</span></span>} placeholder={`׳”׳›׳ ׳¡ ${placeholder1}...`} containerClassName="mb-0" className="h-11 text-sm" />
                            <div className="flex flex-col">
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">{placeholder2}</label>
                                <textarea className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-brand-mainBlue transition-all shadow-sm resize-none h-24" placeholder="׳”׳§׳׳™׳“׳• ׳›׳׳..."></textarea>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                            <Button variant="ghost" onClick={onClose} className="px-6 text-xs font-bold">׳‘׳™׳˜׳•׳</Button>
                            <Button onClick={() => { onSave(); onClose(); }} className="px-8 text-xs font-bold">׳©׳׳•׳¨ ׳•׳¦׳•׳¨</Button>
                        </div>
                    </div>
                </div>
            );
        };


        // --- 2. HIERARCHY VIEW (Sub-envs & Rooms) ---
        const HierarchyView = ({ onOpenEnvModal, onOpenUserManagement, onRoomSelect }) => {
            const [level, setLevel] = useState('sub_envs'); // 'sub_envs' | 'rooms'
            const [showCreateModal, setShowCreateModal] = useState(null); // 'sub_env' | 'room' | null

            const subEnvs = [
                { id: 1, name: '׳×׳₪׳¢׳•׳ ׳•׳׳™׳“׳¢ ׳¨׳©׳×׳™' },
                { id: 2, name: '׳›׳©׳™׳¨׳•׳™׳•׳×' },
                { id: 3, name: '׳˜׳¡׳˜׳™׳ ׳’ 2025' },
                { id: 4, name: '׳׳’׳´׳' },
                { id: 5, name: '׳”׳©׳×׳׳׳•׳×' }
            ];

            const roomsList = [
                { id: 1, name: '׳‘׳“׳™׳§׳•׳× ׳›׳₪׳•׳׳•׳×' },
                { id: 2, name: '׳‘׳“׳™׳§׳•׳×' },
                { id: 3, name: '׳׳ ׳“׳™׳™' },
                { id: 4, name: '׳׳©׳›׳× ׳׳˜׳׳´׳₪' },
                { id: 5, name: '׳˜׳¡׳˜' }
            ];

            return (
                <div className="h-full flex flex-col bg-brand-bg relative overflow-hidden">
                    {/* Top Blue Banner */}
                    <div className="bg-[#5B8FD4] rounded-b-[40px] pt-10 pb-16 px-12 text-center relative shrink-0 shadow-sm overflow-hidden z-10">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                        <div className="absolute bottom-0 left-10 w-40 h-40 bg-[#1E3A8A]/20 rounded-full blur-2xl transform -translate-y-1/2"></div>
                        
                        <h1 className="text-4xl font-black text-[#1E3A8A] tracking-tight relative z-10">׳‘׳¨׳•׳›׳™׳ ׳”׳‘׳׳™׳ ׳׳×׳₪׳¢׳•׳ ׳׳¢׳¨׳›׳•׳× ׳¨׳™׳©׳×׳™׳•׳×</h1>
                        
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 bg-white p-3 rounded-2xl shadow-md border border-gray-100 z-20">
                            <div className="bg-blue-50 text-[#1E4DB7] p-2 rounded-xl">
                                <Icon name="target" className="w-8 h-8" />
                            </div>
                        </div>
                    </div>

                    {/* Content Layout */}
                    <div className="flex-1 flex gap-8 p-8 mt-4 min-h-0 overflow-hidden">
                        
                        {/* Right Panel (Info & Actions) - First in RTL */}
                        <div className="w-[32%] shrink-0 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
                            {/* Action Buttons Top Right */}
                            {level === 'sub_envs' ? (
                                <div className="flex flex-col gap-3">
                                    <button 
                                        onClick={() => setShowCreateModal('sub_env')}
                                        className="self-start text-[#1E4DB7] bg-white border border-[#1E4DB7] px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-blue-50 transition flex items-center gap-2"
                                    >
                                        <Icon name="plus" className="w-4 h-4" /> ׳™׳¦׳™׳¨׳× ׳×׳×-׳¡׳‘׳™׳‘׳”
                                    </button>
                                    <div className="bg-[#1E3A8A] text-white rounded-xl px-5 py-4 shadow-md w-full">
                                        <h3 className="font-extrabold text-sm mb-1">׳™׳¢׳™׳׳•׳× ׳•׳₪׳¨׳•׳“׳•׳§׳˜׳™׳‘׳™׳•׳×</h3>
                                        <p className="text-xs text-blue-200 opacity-80">׳׳¢׳¨׳›׳× ׳׳×׳§׳“׳׳× ׳׳ ׳™׳”׳•׳ ׳¨׳©׳×׳™</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    <button 
                                        onClick={() => setLevel('sub_envs')}
                                        className="text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-gray-50 transition flex items-center gap-2"
                                    >
                                        <Icon name="arrowRight" className="w-4 h-4" /> ׳—׳–׳•׳¨ ׳׳×׳×׳™-׳¡׳‘׳™׳‘׳•׳×
                                    </button>
                                    <button 
                                        onClick={onOpenUserManagement}
                                        className="text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-gray-50 transition flex items-center gap-2"
                                    >
                                        <Icon name="users" className="w-4 h-4" /> ׳ ׳™׳”׳•׳ ׳׳©׳×׳׳©׳™׳
                                    </button>
                                    <button 
                                        onClick={() => setShowCreateModal('room')}
                                        className="text-white bg-[#1E4DB7] border border-transparent px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-blue-800 transition flex items-center gap-2"
                                    >
                                        <Icon name="plus" className="w-4 h-4" /> ׳™׳¦׳™׳¨׳× ׳—׳“׳¨
                                    </button>
                                </div>
                            )}

                            {/* Informational Text */}
                            <div className="mt-4">
                                <h2 className="text-2xl font-black text-[#1E3A8A] mb-3 leading-tight">
                                    {level === 'sub_envs' ? '׳”׳¡׳‘׳™׳‘׳•׳× ׳”׳₪׳×׳•׳—׳•׳× ׳¢׳‘׳•׳¨׳' : '׳”׳—׳“׳¨׳™׳ ׳”׳–׳׳™׳ ׳™׳ ׳¢׳‘׳•׳¨׳'}
                                </h2>
                                <p className="text-sm font-semibold text-[#1E4DB7] mb-8 leading-relaxed pr-1">
                                    ׳׳¢׳¨׳›׳× ׳׳‘׳¦׳¢׳™׳× ׳׳ ׳™׳”׳•׳ ׳₪׳ ׳™׳•׳×, ׳׳©׳™׳׳•׳× ׳•׳—׳“׳¨׳™׳. ׳›׳™׳•׳•׳ ׳“׳™׳’׳™׳˜׳׳™ ׳©׳׳¨׳›׳– ׳׳× ׳›׳ ׳”׳₪׳¢׳™׳׳•׳× ׳‘׳׳§׳•׳ ׳׳—׳“.
                                </p>

                                <div className="space-y-6">
                                    <div className="flex gap-4 items-start">
                                        <div className="bg-[#1E4DB7] text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">1</div>
                                        <div>
                                            <h4 className="font-extrabold text-[#1E3A8A] text-sm mb-1">׳™׳•׳׳ ׳׳‘׳¦׳¢׳™</h4>
                                            <p className="text-xs text-gray-500 font-semibold leading-relaxed">׳×׳¦׳•׳’׳” ׳—׳™׳” ׳©׳ ׳”׳׳¦׳‘ ׳‘׳©׳˜׳—. ׳›׳ ׳₪׳ ׳™׳™׳” ׳ ׳›׳ ׳¡׳× ׳׳×׳•׳¢׳“׳×. ׳ ׳™׳×׳ ׳׳¢׳§׳•׳‘ ׳׳—׳¨ ׳”׳¡׳˜׳˜׳•׳¡ ׳©׳׳”, ׳”׳׳¢׳¨׳›׳× ׳׳׳₪׳©׳¨׳× ׳׳¢׳§׳‘ ׳¨׳¦׳™׳£ ׳׳—׳¨ ׳›׳ ׳×׳§׳׳”.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <div className="bg-[#1E4DB7] text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">2</div>
                                        <div>
                                            <h4 className="font-extrabold text-[#1E3A8A] text-sm mb-1">׳ ׳™׳”׳•׳ ׳—׳“׳¨׳™׳ ׳•׳¡׳‘׳™׳‘׳•׳×</h4>
                                            <p className="text-xs text-gray-500 font-semibold leading-relaxed">׳›׳ ׳—׳“׳¨ ׳׳™׳™׳¦׳’ ׳¦׳•׳•׳×. ׳׳׳—׳¨ ׳‘׳—׳™׳¨׳× ׳—׳“׳¨, ׳ ׳™׳×׳ ׳׳¦׳₪׳•׳×, ׳׳₪׳×׳•׳—, ׳׳¡׳’׳•׳¨ ׳•׳׳”׳¢׳‘׳™׳¨ ׳₪׳ ׳™׳•׳× ׳‘׳™׳ ׳—׳“׳¨׳™׳. ׳‘׳ ׳•׳¡׳£ ׳§׳™׳™׳׳× ׳׳•׳₪׳¦׳™׳” ׳׳©׳™׳™׳ ׳׳©׳™׳׳•׳× ׳׳‘׳¢׳׳™ ׳×׳₪׳§׳™׳“׳™׳ ׳¨׳׳•׳•׳ ׳˜׳™׳.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <div className="bg-[#1E4DB7] text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">3</div>
                                        <div>
                                            <h4 className="font-extrabold text-[#1E3A8A] text-sm mb-1">׳”׳’׳“׳¨׳•׳× ׳׳×׳§׳“׳׳•׳×</h4>
                                            <p className="text-xs text-gray-500 font-semibold leading-relaxed">׳‘׳—׳“׳¨ ׳ ׳™׳×׳ ׳׳‘׳¦׳¢ ׳”׳×׳׳׳” ׳©׳ ׳©׳“׳•׳×, ׳¦׳•׳¨׳× ׳ ׳™׳”׳•׳, ׳×׳”׳׳™׳›׳™׳ ׳•׳×׳‘׳ ׳™׳•׳× ׳׳₪׳™ ׳¡׳•׳’ ׳”׳₪׳¢׳™׳׳•׳× ׳”׳¨׳¦׳•׳™׳”, ׳×׳•׳ ׳›׳“׳™ ׳©׳׳™׳¨׳” ׳¢׳ ׳¡׳“׳¨ ׳•׳¡׳˜׳ ׳“׳¨׳˜׳™׳–׳¦׳™׳” ׳‘׳™׳ ׳₪׳ ׳™׳•׳× ׳“׳•׳׳•׳×.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Left Panel (Grid) - Second in RTL */}
                        <div className="flex-1 flex flex-col min-h-0 bg-white/40 rounded-3xl border border-gray-200/60 shadow-inner p-6 backdrop-blur-sm relative">
                            
                            {/* Grid Header Actions */}
                            <div className="flex justify-between items-center mb-6 shrink-0">
                                <button 
                                    onClick={onOpenEnvModal}
                                    className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-gray-50 transition flex items-center gap-2"
                                >
                                    <Icon name="arrowDownUp" className="w-3.5 h-3.5 text-[#1E4DB7]" /> ׳”׳—׳׳£ ׳¡׳‘׳™׳‘׳”
                                </button>
                                
                                {level === 'sub_envs' ? (
                                    <button className="bg-white border border-gray-200 text-gray-500 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-gray-50 transition flex items-center gap-2">
                                        ׳’׳׳•׳ ׳׳˜׳” ׳׳©׳׳¨ ׳”׳¡׳‘׳™׳‘׳•׳× <Icon name="chevronDown" className="w-3.5 h-3.5" />
                                    </button>
                                ) : (
                                    <div className="bg-white border border-blue-200 text-[#1E4DB7] px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2">
                                        ׳”׳—׳“׳¨׳™׳ ׳₪׳¢׳™׳׳™׳ ׳•׳׳•׳›׳ ׳™׳ <Icon name="check" className="w-3.5 h-3.5" />
                                    </div>
                                )}
                            </div>

                            {/* Cards Grid */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                                <div className="grid grid-cols-2 gap-5">
                                    {(level === 'sub_envs' ? subEnvs : roomsList).map(item => (
                                        <div key={item.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col relative group">
                                            <div className="flex justify-between items-start mb-6">
                                                <Badge type="active">׳₪׳¢׳™׳׳”</Badge>
                                                <Icon name="globe" className="w-5 h-5 text-[#1E3A8A]" />
                                            </div>
                                            <h3 className="text-center font-black text-gray-800 text-lg mb-6">{item.name}</h3>
                                            <button 
                                                onClick={() => {
                                                    if (level === 'sub_envs') {
                                                        setLevel('rooms');
                                                    } else {
                                                        // ׳₪׳×׳™׳—׳× ׳—׳“׳¨ (׳׳¢׳‘׳¨ ׳׳“׳©׳‘׳•׳¨׳“/׳׳¢׳¨׳›׳× ׳₪׳ ׳™׳׳™׳×)
                                                        onRoomSelect(item);
                                                    }
                                                }}
                                                className="mt-auto w-full bg-gray-50 text-gray-600 border border-gray-200 py-2.5 rounded-xl text-xs font-bold hover:bg-[#1E4DB7] hover:text-white hover:border-transparent transition-colors shadow-sm"
                                            >
                                                {level === 'sub_envs' ? '׳₪׳×׳— ׳×׳×-׳¡׳‘׳™׳‘׳”' : '׳₪׳×׳— ׳—׳“׳¨'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ׳׳•׳“׳׳ ׳׳™׳¦׳™׳¨׳× ׳×׳×-׳¡׳‘׳™׳‘׳”/׳—׳“׳¨ ׳—׳“׳© */}
                    {showCreateModal && (
                        <CreateItemModal 
                            type={showCreateModal} 
                            onClose={() => setShowCreateModal(null)} 
                            onSave={() => console.log('Saved!')} 
                        />
                    )}
                </div>
            );
        };


        // --- 3. USER MANAGEMENT VIEW ---
        const UserManagementView = () => {
            const users = [
                { name: '׳¢׳˜׳™׳” ׳ ׳”׳•׳¨׳׳™', id: 'c9812512', role: '׳׳×׳›׳ ׳×' },
                { name: '׳׳©׳” ׳›׳”׳', id: 's8624034', role: '׳§׳"׳“ ׳“׳™׳’׳™׳˜׳' },
                { name: '׳’׳ ׳׳™׳׳•׳–', id: 's7646130', role: '׳¨׳"׳“ ׳׳•׳—׳׳” ׳“׳™׳’׳™׳˜׳' },
                { name: '׳‘׳¨ ׳¢׳™׳׳׳™ ׳¡׳•׳₪׳¨', id: 's8762961', role: '׳׳×׳›׳ ׳×' },
                { name: '׳™׳•׳ ׳×׳ ׳™׳•׳¡׳™׳', id: 's9267560', role: '׳׳×׳›׳ ׳×' },
                { name: '׳¡׳•׳ ׳™׳” ׳˜׳•׳₪׳™׳§׳•׳‘', id: 's9249530', role: '׳§׳׳“׳ ׳™׳×' },
                { name: '׳™׳¢׳§׳‘-׳§׳• ׳’׳׳׳', id: 's7524855', role: '׳׳×׳›׳ ׳×' }
            ];

            return (
                <div className="h-full flex flex-col p-8 wave-bg min-h-0">
                    <div className="mb-8 shrink-0 border-b border-gray-200 pb-6 flex justify-between items-end">
                        <div>
                            <h1 className="text-[28px] font-black text-[#1E3A8A] mb-2 tracking-tight">׳ ׳™׳”׳•׳ ׳׳©׳×׳׳©׳™ ׳”׳¡׳‘׳™׳‘׳”</h1>
                            <p className="text-sm font-bold text-[#1E4DB7]">׳›׳׳ ׳ ׳™׳×׳ ׳׳™׳¦׳•׳¨ ׳׳©׳×׳׳© ׳•׳׳¢׳¨׳•׳ ׳”׳¨׳©׳׳•׳× ׳©׳ ׳׳©׳×׳׳©׳™׳ ׳§׳™׳™׳׳™׳</p>
                        </div>
                        
                        <div className="w-[400px] relative">
                            <input 
                                className="w-full bg-white border border-gray-200 rounded-full py-2.5 px-5 pr-10 text-sm focus:outline-none focus:border-[#1E4DB7] transition-all shadow-sm font-bold text-gray-700 placeholder-gray-400" 
                                placeholder="׳—׳™׳₪׳•׳© ׳׳₪׳™ ׳©׳ ׳׳• ׳׳¡׳₪׳¨ ׳׳™׳©׳™" 
                            />
                            <Icon name="search" className="w-4 h-4 absolute right-4 top-3 text-gray-400" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
                        <div className="grid grid-cols-4 gap-6">
                            {/* Create New User Card */}
                            <div className="bg-transparent border-2 border-dashed border-[#CBD5E1] rounded-3xl p-6 flex flex-col items-center justify-center min-h-[220px] cursor-pointer hover:bg-white hover:border-[#1E4DB7] transition-all group shadow-sm">
                                <div className="w-14 h-14 rounded-full border border-gray-300 flex items-center justify-center mb-4 group-hover:border-[#1E4DB7] group-hover:bg-blue-50 transition-colors bg-white shadow-sm">
                                    <Icon name="plus" className="w-6 h-6 text-gray-500 group-hover:text-[#1E4DB7]" />
                                </div>
                                <h3 className="font-extrabold text-gray-800 text-lg mb-1 group-hover:text-[#1E4DB7]">׳¦׳•׳¨ ׳׳©׳×׳׳© ׳—׳“׳©</h3>
                                <p className="text-xs text-gray-500 font-bold">׳׳—׳¥ ׳¢׳ ׳׳ ׳× ׳׳¢׳‘׳•׳¨ ׳׳“׳£ ׳™׳¦׳™׳¨׳”</p>
                            </div>

                            {/* Existing Users */}
                            {users.map((u, i) => (
                                <div key={i} className="bg-white/80 border border-gray-200 rounded-3xl p-5 flex flex-col items-center justify-center min-h-[220px] shadow-sm hover:shadow-md hover:border-[#1E4DB7] transition-all">
                                    <div className="w-12 h-12 rounded-full border border-gray-200 bg-white flex items-center justify-center mb-3 shadow-sm text-gray-400">
                                        <Icon name="user" className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-extrabold text-gray-800 text-[15px]">{u.name}</h3>
                                    <div className="flex items-center gap-1.5 text-[#1E4DB7] text-[11px] font-bold mt-1.5 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                        <span dir="ltr">{u.id}</span>
                                        <span className="text-[#1E4DB7]">#</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-500 text-[11px] font-bold mt-2.5">
                                        <Icon name="building" className="w-3.5 h-3.5 text-[#1E4DB7]" />
                                        {u.role}
                                    </div>
                                    <button className="mt-5 bg-[#1E4DB7] text-white px-8 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-800 transition shadow-sm">
                                        ׳¢׳¨׳•׳
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pagination */}
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-center items-center gap-4 shrink-0">
                         <button className="bg-white border border-gray-200 text-gray-600 px-5 py-2 rounded-lg shadow-sm text-xs font-bold hover:bg-gray-50 hover:text-[#1E4DB7] transition flex items-center gap-1">
                             ׳”׳‘׳ &lt;
                         </button>
                         <div className="bg-blue-50 border border-blue-200 text-[#1E4DB7] px-8 py-1.5 rounded-xl shadow-sm text-xs font-bold flex flex-col items-center">
                             <span>׳¢׳׳•׳“ 1 ׳׳×׳•׳ 13</span>
                             <span className="text-[9px] font-semibold opacity-80 mt-0.5 text-gray-600">׳׳¦׳™׳’ 8 ׳׳×׳•׳ 98 ׳׳©׳×׳׳©׳™׳</span>
                         </div>
                         <button className="bg-white border border-gray-100 text-gray-400 px-5 py-2 rounded-lg shadow-sm text-xs font-bold cursor-not-allowed flex items-center gap-1">
                             &gt; ׳§׳•׳“׳
                         </button>
                    </div>
                </div>
            );
        };


        // --- NEW COMPLAINT VIEW (Fully Match "image_bf91cb.jpg", Fit-to-screen) ---
        const NewComplaintView = () => {
            const [activeTab, setActiveTab] = useState('form');

            const FormContent = () => (
                <div className="flex gap-5 h-full min-h-0 pt-0 pb-0">
                    {/* Right Column (System Fields) - now first in RTL */}
                    <div className="flex-[0.98] max-w-[430px] bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col min-h-0 overflow-hidden relative">
                        <div className="px-4 py-1.5 border-b border-gray-100 flex justify-between items-center shrink-0 bg-gray-50/30">
                            <div className="flex items-center gap-3 min-w-0">
                                <h3 className="font-bold text-lg text-brand-text whitespace-nowrap">׳©׳“׳•׳× ׳׳¢׳¨׳›׳×</h3>
                                <span className="text-[11px] font-bold text-brand-text whitespace-nowrap border-r border-gray-200 pr-3">
                                    ׳₪׳•׳×׳— ׳₪׳ ׳™׳™׳”: <span className="font-bold text-gray-800">׳¢׳˜׳™׳” ׳ ׳”׳•׳¨׳׳™</span>
                                </span>
                            </div>
                            <span className="inline-flex items-center gap-1 whitespace-nowrap bg-brand-blue text-white px-3 py-1.5 rounded-md text-[10px] font-bold"><b>5</b><span>׳—׳•׳‘׳”</span></span>
                        </div>
                        <div className="p-3 flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
                            <Input label={<span className="text-red-600 font-bold">׳׳¡׳₪׳¨ ׳׳™׳©׳™ ׳©׳ ׳”׳׳§׳•׳— *</span>} placeholder="׳”׳›׳ ׳¡/׳™ ׳׳¡׳₪׳¨ ׳׳™׳©׳™ ׳©׳ ׳”׳׳§׳•׳—" icon="user" containerClassName="mb-0 shrink-0" className="text-right h-[40px] px-4 text-[13px]" />
                            <Input label={<span className="text-red-600 font-bold">׳©׳ ׳”׳׳§׳•׳— *</span>} placeholder="׳”׳›׳ ׳¡/׳™ ׳©׳ ׳”׳׳§׳•׳—" icon="user" containerClassName="mb-0 shrink-0" className="text-right h-[40px] px-4 text-[13px]" />
                            <Input label={<span className="text-red-600 font-bold">׳˜׳׳₪׳•׳ ׳׳™׳¦׳™׳¨׳× ׳§׳©׳¨ *</span>} placeholder="׳”׳›׳ ׳¡/׳™ ׳˜׳׳₪׳•׳ ׳׳™׳¦׳™׳¨׳× ׳§׳©׳¨" icon="phone" containerClassName="mb-0 shrink-0" className="text-right h-[40px] px-4 text-[13px]" />
                            <Input label={<span className="text-red-600 font-bold">׳¨׳׳× ׳“׳—׳™׳₪׳•׳× *</span>} placeholder="׳ ׳׳•׳›׳”-3" containerClassName="mb-0 shrink-0" className="text-right font-bold h-[40px] px-4 text-[13px]" />
                            
                            <div className="flex-1 min-h-[118px] flex flex-col pt-0">
                                <label className="block text-xs font-bold text-red-600 mb-1 text-right shrink-0">׳×׳™׳׳•׳¨ ׳”׳×׳§׳׳” *</label>
                                <textarea className="w-full flex-1 min-h-[105px] bg-white border border-gray-200 shadow-sm rounded-lg py-3 px-4 text-[13px] focus:outline-none focus:border-brand-blue resize-y leading-5" placeholder="׳”׳›׳ ׳¡/׳™ ׳×׳™׳׳•׳¨ ׳”׳×׳§׳׳”"></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Left Column (Room Fields) - now second in RTL */}
                    <div className="flex-[1.4] bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col min-h-0 overflow-hidden relative">
                        {/* Header Box */}
                        <div className="px-4 py-1.5 border-b border-gray-100 flex justify-between items-center shrink-0 bg-gray-50/30">
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-lg text-brand-text">׳©׳“׳•׳× ׳—׳“׳¨</h3>
                                <Select options={["׳‘׳—׳™׳¨׳× ׳—׳“׳¨"]} containerClassName="mb-0" className="w-28 py-1.5 text-xs text-gray-500 font-bold bg-white" />
                            </div>
                            <div className="flex items-center gap-2 flex-nowrap">
                                <Button variant="outline" className="text-[11px] py-1.5 px-3 border-brand-blue text-brand-blue whitespace-nowrap">׳‘׳¦׳¢ ׳©׳™׳•׳ ׳׳™׳©׳™</Button>
                                <span className="inline-flex items-center gap-1 whitespace-nowrap border border-gray-300 text-gray-500 text-[10px] font-bold px-3 py-1.5 rounded-md bg-white"><b>0/10</b><span>׳¡׳”&quot;׳› ׳©׳“׳•׳×</span></span>
                                <span className="inline-flex items-center gap-1 whitespace-nowrap bg-brand-blue text-white text-[10px] font-bold px-3 py-1.5 rounded-md"><b>2</b><span>׳׳•׳₪׳¦׳™׳•׳ ׳׳™׳™׳</span></span>
                                <span className="inline-flex items-center gap-1 whitespace-nowrap bg-brand-blue text-white text-[10px] font-bold px-3 py-1.5 rounded-md"><b>1</b><span>׳—׳•׳‘׳”</span></span>
                            </div>
                        </div>
                        
                        {/* Form Fields Grid */}
                        <div className="p-4 flex-1 overflow-hidden min-h-0">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4 h-full content-start">
                                {/* Left Side of Room Fields */}
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col">
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5 text-right">׳׳•׳₪׳ ׳˜׳™׳₪׳•׳ ׳‘׳₪׳ ׳™׳™׳”</label>
                                        <textarea className="w-full h-[48px] min-h-[48px] bg-white border border-gray-200 shadow-sm rounded-lg py-2.5 px-4 text-[13px] focus:outline-none focus:border-brand-blue resize-y leading-5" placeholder="׳”׳›׳ ׳¡/׳™ ׳׳•׳₪׳ ׳˜׳™׳₪׳•׳ ׳‘׳₪׳ ׳™׳™׳”"></textarea>
                                    </div>
                                    <Input label="׳׳™׳§׳•׳" placeholder="׳”׳›׳ ׳¡/׳™ ׳׳™׳§׳•׳" containerClassName="mb-0" className="text-right h-[48px] px-4 text-[13px]" />
                                </div>
                                {/* Right Side of Room Fields */}
                                <div className="flex flex-col gap-4">
                                    <Input label={<span className="text-red-600 font-bold">׳’׳•׳¨׳ ׳׳˜׳₪׳ *</span>} placeholder="׳׳ ׳“׳™׳™" containerClassName="mb-0" className="text-right font-bold text-gray-800 h-[48px] px-4 text-[13px]" />
                                    <Input label="׳©׳™׳•׳ ׳׳ ׳©׳™׳ / ׳ ׳¦׳™׳’ ׳׳˜׳₪׳" placeholder="׳‘׳—׳¨ ׳׳©׳×׳׳© ׳׳©׳™׳•׳..." containerClassName="mb-0" className="text-right h-[48px] px-4 text-[13px]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );

            return (
                <div className="p-4 wave-bg h-full flex flex-col min-h-0">
                    
                    {/* Header Top Center - compact 2 rows only */}
                    <div className="text-center mb-1 shrink-0">
                        <h1 className="text-[20px] leading-6 font-black text-brand-text tracking-tight whitespace-nowrap">׳˜׳•׳₪׳¡ ׳₪׳ ׳™׳™׳” ׳—׳“׳©׳” : M-19-1780831307772</h1>
                        <div className="h-5 flex items-center justify-center gap-3 text-[11px] leading-5 font-semibold text-gray-500 whitespace-nowrap">
                            <span className="text-brand-blue font-bold">׳—׳“׳¨ ׳ ׳•׳›׳—׳™ - ׳׳ ׳“׳™׳™</span>
                            <span className="text-gray-300">|</span>
                            <span>׳׳׳ ׳׳× ׳”׳©׳“׳•׳× ׳׳™׳¦׳™׳¨׳× ׳₪׳ ׳™׳™׳” ׳—׳“׳©׳”, ׳©׳™׳ ׳׳‘ ׳׳©׳“׳•׳× ׳—׳•׳‘׳” <span className="text-red-600 font-bold">(* ׳©׳“׳•׳× ׳—׳•׳‘׳”)</span></span>
                        </div>
                    </div>

                    {/* Central Tabs Area */}
                    <div className="flex justify-center border-b border-gray-200 shrink-0 mb-1.5 gap-20 px-10 h-10 items-end">
                        <button onClick={() => setActiveTab('form')} className={`h-full px-4 pt-3 pb-3 text-[14px] flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'form' ? 'tab-active' : 'tab-inactive font-bold'}`}>
                            ׳˜׳•׳₪׳¡ <Icon name="filePlus" className="w-4 h-4" />
                        </button>
                        <button onClick={() => setActiveTab('chat')} className={`h-full px-4 pt-3 pb-3 text-[14px] flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'chat' ? 'tab-active' : 'tab-inactive font-bold'}`}>
                            ׳¦'׳׳˜ <Icon name="chat" className="w-4 h-4" />
                        </button>
                        <button onClick={() => setActiveTab('external')} className={`h-full px-4 pt-3 pb-3 text-[14px] flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'external' ? 'tab-active' : 'tab-inactive font-bold'}`}>
                            ׳©׳׳™׳—׳” ׳׳—׳“׳¨ ׳—׳™׳¦׳•׳ ׳™ <Icon name="send" className="w-4 h-4 transform -rotate-45" />
                        </button>
                    </div>

                    {/* Main Content Render */}
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                        {(activeTab === 'form' || activeTab === 'external') && <FormContent />}
                        
                        {activeTab === 'chat' && (
                            <div className="h-full flex flex-col items-center justify-center p-6 min-h-0 bg-white rounded-2xl border border-gray-200 shadow-sm mx-4 mb-2">
                                <div className="w-full max-w-xl mx-auto flex flex-col h-full min-h-0">
                                    <div className="text-center mb-4 border-b border-gray-100 pb-3 shrink-0">
                                        <h2 className="text-base font-bold text-gray-800">׳“׳™׳•׳ ׳‘׳ ׳•׳©׳ M-19-1780831307772</h2>
                                    </div>
                                    <div className="flex-1 bg-gray-50/80 rounded-xl border border-dashed border-gray-200 mb-4 flex flex-col items-center justify-center min-h-0">
                                         <Icon name="chat" className="w-8 h-8 text-gray-300 mb-2" />
                                         <p className="text-gray-400 font-bold text-xs">׳׳™׳ ׳”׳•׳“׳¢׳•׳× ׳‘׳“׳™׳•׳ ׳–׳”</p>
                                    </div>
                                    <div className="relative w-full shrink-0">
                                        <textarea className="w-full bg-white border border-gray-300 rounded-xl py-2.5 px-3 pr-10 text-xs focus:outline-none focus:border-brand-blue shadow-sm h-12 resize-none font-bold text-gray-700" placeholder="׳›׳×׳•׳‘ ׳”׳•׳“׳¢׳” ׳—׳“׳©׳”..."></textarea>
                                        <button className="absolute right-2 bottom-2 text-white bg-brand-lightBlue p-1.5 rounded-lg shadow-sm hover:bg-brand-blue transition">
                                            <Icon name="send" className="w-3.5 h-3.5 transform rotate-180" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="flex gap-3 mt-1 shrink-0 justify-end px-2">
                        <Button variant="ghost" className="px-5 py-1 text-[11px] font-bold rounded-md shadow-sm">׳‘׳˜׳ ׳₪׳ ׳™׳™׳”</Button>
                        <Button variant="outline" className="px-5 py-1 text-[11px] font-bold rounded-md shadow-sm border-brand-blue text-brand-blue">׳₪׳¨׳¡׳ ׳•׳©׳׳•׳¨</Button>
                        <Button className="px-7 py-1 text-[11px] font-bold rounded-md shadow-sm">׳₪׳¨׳¡׳ ׳₪׳ ׳™׳™׳”</Button>
                    </div>
                </div>
            );
        };


        // --- DASHBOARD DATA & COMPONENTS ---
        const dashboardPriorities = [
            { label: '׳ ׳׳•׳›׳”-3', level: 3, color: 'bg-pink-50 text-pink-700 ring-pink-100', chartColor: '#EC4899' },
            { label: '׳‘׳™׳ ׳•׳ ׳™׳×-2', level: 2, color: 'bg-amber-50 text-amber-700 ring-amber-100', chartColor: '#F59E0B' },
            { label: '׳’׳‘׳•׳”׳”-1', level: 1, color: 'bg-rose-50 text-rose-700 ring-rose-100', chartColor: '#EF4444' }
        ];

        const dashboardAssignees = ['׳׳ ׳“׳™׳™', '׳¦׳•׳•׳× ׳×׳׳™׳›׳”', '׳׳•׳˜׳•׳׳¦׳™׳”'];

        const dashboardDeterministicRandom = (seed) => {
            const x = Math.sin(seed * 999) * 10000;
            return x - Math.floor(x);
        };

        const dashboardPad = (value) => String(value).padStart(2, '0');

        const parseDashboardDate = (dateString) => {
            const parts = dateString.split('-').map(Number);
            return new Date(parts[0], parts[1] - 1, parts[2]);
        };

        const formatDashboardDate = (dateString, options) => {
            return parseDashboardDate(dateString).toLocaleDateString('he-IL', options);
        };

        const generateDashboardMockData = () => {
            const requesters = ['׳¢׳˜׳™׳” ׳ ׳”׳•׳¨׳׳™', '׳׳©׳” ׳›׳”׳', '׳“׳ ׳” ׳׳•׳™', '׳¨׳•׳¢׳™ ׳©׳׳©', '׳׳‘׳™ ׳›׳¥', '׳׳™׳›׳ ׳“׳•׳“', '׳“׳ ׳™׳׳ ׳›׳”׳'];
            const subjects = ['׳‘׳¢׳™׳” ׳‘׳”׳¨׳©׳׳•׳×', '׳¢׳“׳›׳•׳ ׳₪׳¨׳˜׳™ ׳׳©׳×׳׳©', '׳‘׳§׳©׳× ׳×׳׳™׳›׳”', '׳×׳§׳׳” ׳‘׳×׳”׳׳™׳', '׳₪׳×׳™׳—׳× ׳׳©׳™׳׳” ׳—׳“׳©׳”', '׳‘׳™׳¨׳•׳¨ ׳¡׳˜׳˜׳•׳¡', '׳—׳™׳‘׳•׳¨ ׳׳׳•׳˜׳•׳׳¦׳™׳”'];
            const descriptions = [
                '׳”׳₪׳ ׳™׳™׳” ׳“׳•׳¨׳©׳× ׳‘׳“׳™׳§׳” ׳¨׳׳©׳•׳ ׳™׳× ׳•׳×׳™׳׳•׳ ׳׳•׳ ׳”׳’׳•׳¨׳ ׳”׳׳˜׳₪׳.',
                '׳ ׳“׳¨׳© ׳˜׳™׳₪׳•׳ ׳ ׳§׳•׳“׳×׳™ ׳•׳”׳©׳׳׳× ׳ ׳×׳•׳ ׳™׳ ׳—׳¡׳¨׳™׳ ׳׳₪׳ ׳™ ׳¡׳’׳™׳¨׳”.',
                '׳”׳×׳§׳‘׳׳” ׳₪׳ ׳™׳™׳” ׳—׳“׳©׳” ׳•׳׳׳×׳™׳ ׳” ׳׳׳™׳©׳•׳¨ ׳”׳׳©׳ ׳˜׳™׳₪׳•׳.',
                '׳”׳ ׳•׳©׳ ׳ ׳׳¦׳ ׳‘׳‘׳“׳™׳§׳” ׳׳•׳ ׳”׳¦׳•׳•׳× ׳”׳¨׳׳•׳•׳ ׳˜׳™.'
            ];

            return Array.from({ length: 150 }, (_, i) => {
                const priority = dashboardPriorities[Math.floor(dashboardDeterministicRandom(i + 7) * dashboardPriorities.length)];
                const date = new Date(2026, 3, 1 + Math.floor(dashboardDeterministicRandom(i + 23) * 115));
                if (i < 8) {
                    date.setTime(new Date().getTime());
                }

                return {
                    id: `M-16-${100 + i}`,
                    requester: requesters[Math.floor(dashboardDeterministicRandom(i + 11) * requesters.length)],
                    phone: dashboardDeterministicRandom(i + 13) > 0.3 ? `05${Math.floor(dashboardDeterministicRandom(i + 15) * 10)}-${Math.floor(1000000 + dashboardDeterministicRandom(i + 17) * 9000000)}` : '׳׳ ׳–׳׳™׳',
                    location: `${Math.floor(111111111 + dashboardDeterministicRandom(i + 19) * 888888888)}`,
                    priority: priority.label,
                    priorityLevel: priority.level,
                    priorityColor: priority.color,
                    chartColor: priority.chartColor,
                    date: `${date.getFullYear()}-${dashboardPad(date.getMonth() + 1)}-${dashboardPad(date.getDate())}`,
                    status: dashboardDeterministicRandom(i + 29) > 0.34 ? 'open' : 'closed',
                    assignee: dashboardAssignees[Math.floor(dashboardDeterministicRandom(i + 31) * dashboardAssignees.length)],
                    subject: subjects[Math.floor(dashboardDeterministicRandom(i + 37) * subjects.length)],
                    description: descriptions[Math.floor(dashboardDeterministicRandom(i + 41) * descriptions.length)]
                };
            });
        };

        const dashboardInquiries = generateDashboardMockData();

        const filterDashboardInquiries = (inquiries, filters) => {
            return inquiries.filter(item => {
                if (filters.category !== 'all' && item.assignee !== filters.category) return false;
                if (filters.dateFrom && item.date < filters.dateFrom) return false;
                if (filters.dateTo && item.date > filters.dateTo) return false;
                return true;
            });
        };

        const groupDashboardInquiries = (inquiries, grouping) => {
            const groups = new Map();

            inquiries.forEach(item => {
                const date = parseDashboardDate(item.date);
                let label = '';
                let sortKey = item.date;

                if (grouping === 'daily') {
                    label = date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
                } else if (grouping === 'weekly') {
                    const firstDay = new Date(date.getFullYear(), 0, 1);
                    const week = Math.ceil((((date - firstDay) / 86400000) + firstDay.getDay() + 1) / 7);
                    label = `׳©׳‘׳•׳¢ ${week}`;
                    sortKey = `${date.getFullYear()}-${dashboardPad(week)}`;
                } else {
                    label = date.toLocaleDateString('he-IL', { month: 'short', year: 'numeric' });
                    sortKey = `${date.getFullYear()}-${dashboardPad(date.getMonth() + 1)}`;
                }

                if (!groups.has(label)) {
                    groups.set(label, { label, total: 0, items: [], sortKey });
                }

                const group = groups.get(label);
                group.total += 1;
                group.items.push(item);
            });

            return Array.from(groups.values());
        };

        const sortDashboardGroups = (groups, sortOrder) => {
            return [...groups].sort((a, b) => {
                const totalSort = sortOrder === 'desc' ? b.total - a.total : a.total - b.total;
                return totalSort || a.sortKey.localeCompare(b.sortKey);
            });
        };

        const exportDashboardCsv = (groups) => {
            const headers = ['׳§׳‘׳•׳¦׳”', '׳¡׳”׳´׳› ׳‘׳§׳‘׳•׳¦׳”', '׳׳¡׳₪׳¨ ׳₪׳ ׳™׳™׳”', '׳×׳׳¨׳™׳', '׳’׳•׳¨׳ ׳׳˜׳₪׳', '׳“׳—׳™׳₪׳•׳×', '׳¡׳˜׳˜׳•׳¡', '׳˜׳׳₪׳•׳', '׳©׳ ׳”׳₪׳•׳ ׳”', '׳׳™׳§׳•׳', '׳ ׳•׳©׳'];
            const rows = groups.flatMap(group => group.items.map(item => [
                group.label,
                group.total,
                item.id,
                item.date,
                item.assignee,
                item.priority,
                item.status === 'open' ? '׳₪׳×׳•׳—׳”' : '׳¡׳’׳•׳¨׳”',
                item.phone,
                item.requester,
                item.location,
                item.subject
            ]));

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            ].join('\n');

            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `׳™׳™׳¦׳•׳_׳₪׳ ׳™׳•׳×_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        };

        const DashboardBadge = ({ children, className = '' }) => (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${className}`}>{children}</span>
        );

        const DashboardCard = ({ children, className = '' }) => (
            <section className={`relative min-h-0 overflow-hidden rounded-[28px] border border-white/80 bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.08)] ${className}`}>
                <div className="relative z-10 flex h-full min-h-0 flex-col">{children}</div>
            </section>
        );

        const DashboardToolbarPill = ({ children, className = '' }) => (
            <div className={`flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100/70 ${className}`}>
                {children}
            </div>
        );

        const DashboardSegmentedButton = ({ label, isActive, onClick }) => (
            <button
                type="button"
                onClick={onClick}
                className={`rounded-xl px-4 py-2 text-sm font-black transition-all active:scale-95 ${
                    isActive
                        ? 'bg-gradient-to-l from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
                {label}
            </button>
        );

        const DashboardSelectPill = ({ label, icon, value, onChange, options }) => (
            <DashboardToolbarPill>
                <Icon name={icon} className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="whitespace-nowrap text-xs font-black text-slate-500">{label}</span>
                <select
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="min-w-[132px] cursor-pointer border-0 bg-transparent text-sm font-black text-slate-800 outline-none"
                >
                    {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <Icon name="chevronDown" className="w-3.5 h-3.5 text-slate-400" />
            </DashboardToolbarPill>
        );

        const DashboardDateInput = ({ label, value, onChange }) => (
            <DashboardToolbarPill>
                <Icon name="calendar" className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="whitespace-nowrap text-xs font-black text-slate-500">{label}</span>
                <input
                    type="date"
                    value={value}
                    onInput={(event) => onChange(event.target.value)}
                    onChange={(event) => onChange(event.target.value)}
                    className="cursor-pointer border-0 bg-transparent text-sm font-black text-slate-800 outline-none"
                />
            </DashboardToolbarPill>
        );

        const KpiCard = ({ title, subtitle, value, icon, accent, mode = 'dashboard', actionIcon, actionLabel, onAction, isActionDisabled = false }) => {
            const palette = {
                blue: {
                    value: 'text-blue-600',
                    icon: 'text-blue-500',
                    iconBg: 'bg-blue-50',
                    iconBorder: 'border-blue-100',
                    border: 'border-blue-100',
                    shadow: 'shadow-[0_12px_28px_rgba(59,130,246,0.10)]'
                },
                emerald: {
                    value: 'text-emerald-600',
                    icon: 'text-emerald-600',
                    iconBg: 'bg-emerald-50',
                    iconBorder: 'border-emerald-100',
                    border: 'border-emerald-100',
                    shadow: 'shadow-[0_12px_28px_rgba(16,185,129,0.10)]'
                },
                rose: {
                    value: 'text-rose-600',
                    icon: 'text-rose-500',
                    iconBg: 'bg-rose-50',
                    iconBorder: 'border-rose-100',
                    border: 'border-rose-100',
                    shadow: 'shadow-[0_12px_28px_rgba(244,63,94,0.10)]'
                },
                amber: {
                    value: 'text-amber-600',
                    icon: 'text-amber-500',
                    iconBg: 'bg-amber-50',
                    iconBorder: 'border-amber-100',
                    border: 'border-amber-100',
                    shadow: 'shadow-[0_12px_28px_rgba(245,158,11,0.10)]'
                },
                violet: {
                    value: 'text-violet-600',
                    icon: 'text-violet-500',
                    iconBg: 'bg-violet-50',
                    iconBorder: 'border-violet-100',
                    border: 'border-violet-100',
                    shadow: 'shadow-[0_12px_28px_rgba(139,92,246,0.10)]'
                },
                cyan: {
                    value: 'text-cyan-600',
                    icon: 'text-cyan-500',
                    iconBg: 'bg-cyan-50',
                    iconBorder: 'border-cyan-100',
                    border: 'border-cyan-100',
                    shadow: 'shadow-[0_12px_28px_rgba(6,182,212,0.10)]'
                }
            }[accent];

            const isModal = mode === 'modal';

            return (
                <article className={`relative flex h-full flex-col rounded-[24px] border bg-white text-right ${palette.border} ${palette.shadow} ${isModal ? 'min-h-[168px] px-4 pb-4 pt-5' : 'min-h-[170px] px-5 pb-5 pt-5'}`}>
                    {onAction && (
                        <button
                            type="button"
                            onClick={onAction}
                            aria-label={actionLabel}
                            title={actionLabel}
                            disabled={isActionDisabled}
                            className={`absolute left-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-35 ${
                                actionIcon === 'trash'
                                    ? 'text-rose-400 hover:bg-rose-50 hover:text-rose-500'
                                    : 'text-blue-400 hover:bg-blue-50 hover:text-blue-500'
                            }`}
                        >
                            <Icon name={actionIcon} className="h-3.5 w-3.5" />
                        </button>
                    )}

                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 pr-1">
                            <h4 className={`font-black text-slate-900 ${isModal ? 'text-[15px] leading-5' : 'text-[17px] leading-6'}`}>{title}</h4>
                            {subtitle && <p className={`mt-1 text-slate-400 ${isModal ? 'text-[10px] leading-4' : 'text-[11px] leading-4'}`}>{subtitle}</p>}
                        </div>
                        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border ${palette.iconBg} ${palette.iconBorder}`}>
                            <Icon name={icon} className={`h-6 w-6 ${palette.icon}`} />
                        </div>
                    </div>

                    <div className="mt-auto pt-5">
                        <div className={`font-black tracking-tight ${palette.value} ${isModal ? 'text-[44px] leading-none' : 'text-[48px] leading-none'}`}>{value}</div>
                        {!isModal && <div className="mt-3 text-[11px] font-semibold text-slate-400">׳¢׳•׳“׳›׳ ׳¢׳›׳©׳™׳•</div>}
                    </div>
                </article>
            );
        };

        const DashboardInquiryListItem = ({ item }) => (
            <article className="group mb-3 flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
                <div className="flex shrink-0 items-center gap-2">
                    <button type="button" className="rounded-xl bg-emerald-500 p-2 text-white transition-colors hover:bg-emerald-600">
                        <Icon name="check" className="w-4 h-4" />
                    </button>
                    <button type="button" className="rounded-xl bg-slate-900 p-2 text-white transition-colors hover:bg-slate-700">
                        <Icon name="eye" className="w-4 h-4" />
                    </button>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2 font-black text-slate-900">
                            <Icon name="user" className="w-4 h-4 shrink-0 text-slate-400" />
                            <span className="truncate">{item.requester}</span>
                            <DashboardBadge className={item.priorityColor}>{item.priority}</DashboardBadge>
                            <DashboardBadge className={item.status === 'open' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-slate-100 text-slate-600 ring-slate-200'}>
                                {item.status === 'open' ? '׳₪׳×׳•׳—׳”' : '׳¡׳’׳•׳¨׳”'}
                            </DashboardBadge>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-500" dir="ltr">
                            <span>{item.id}</span>
                            <span className="text-blue-500">#</span>
                        </div>
                    </div>
                    <div className="grid gap-2 text-xs font-medium text-slate-500 sm:grid-cols-4">
                        <span className="flex items-center gap-1"><Icon name="calendar" className="w-3.5 h-3.5" />{formatDashboardDate(item.date, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span className="flex items-center gap-1"><Icon name="phone" className="w-3.5 h-3.5" /><span dir="ltr">{item.phone}</span></span>
                        <span className="flex items-center gap-1"><Icon name="location" className="w-3.5 h-3.5" />{item.location}</span>
                        <span className="flex items-center gap-1"><Icon name="filter" className="w-3.5 h-3.5" />{item.assignee}</span>
                    </div>
                    <p className="mt-2 truncate text-sm text-slate-600"><span className="font-bold text-slate-800">{item.subject}:</span> {item.description}</p>
                </div>
            </article>
        );

        const CustomDonutChart = ({ data, onSegmentClick }) => {
            const [hoveredSegment, setHoveredSegment] = useState(null);
            const size = 210;
            const strokeWidth = 34;
            const radius = (size - strokeWidth) / 2;
            const circumference = radius * 2 * Math.PI;
            const total = data.reduce((sum, item) => sum + item.value, 0);
            const centerRadius = Math.max(0, radius - (strokeWidth / 2) - 6);
            let currentOffset = 0;

            if (total === 0) {
                return <div className="text-sm font-bold text-slate-400">׳׳™׳ ׳ ׳×׳•׳ ׳™׳ ׳׳×׳¦׳•׳’׳”</div>;
            }

            return (
                <div className="relative flex items-center justify-center p-4">
                    <div className="absolute h-48 w-48 rounded-full bg-gradient-to-b from-blue-50 to-white shadow-inner" />
                    <svg width={size} height={size} className="relative z-10 -rotate-90 overflow-visible drop-shadow-sm">
                        <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="#EEF4FF" strokeWidth={strokeWidth} />
                        {data.map(item => {
                            if (item.value === 0) return null;
                            const dashLength = (item.value / total) * circumference;
                            const strokeDasharray = `${dashLength} ${circumference - dashLength}`;
                            const strokeDashoffset = -currentOffset;
                            const isHovered = hoveredSegment === item.label;
                            currentOffset += dashLength;
                            return (
                                <circle
                                    key={item.label}
                                    cx={size / 2}
                                    cy={size / 2}
                                    r={radius}
                                    fill="transparent"
                                    stroke={item.color}
                                    strokeLinecap="round"
                                    strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={strokeDashoffset}
                                    opacity={hoveredSegment && !isHovered ? 0.84 : 1}
                                    className="cursor-pointer transition-all duration-200"
                                    onMouseEnter={() => setHoveredSegment(item.label)}
                                    onMouseLeave={() => setHoveredSegment(null)}
                                    onClick={() => onSegmentClick(item)}
                                />
                            );
                        })}
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={centerRadius}
                            fill="white"
                            className="cursor-default"
                            style={{ pointerEvents: 'all' }}
                        />
                    </svg>
                    <div className="donut-center absolute z-20 flex cursor-default flex-col items-center justify-center rounded-full bg-white/80 px-6 py-5 shadow-[0_18px_45px_rgba(37,99,235,0.12)] backdrop-blur-sm">
                        <span className="text-4xl font-black text-slate-900">{total}</span>
                        <span className="text-sm font-bold text-slate-500">׳¡׳”׳´׳› ׳₪׳ ׳™׳•׳×</span>
                    </div>
                </div>
            );
        };
        const CustomBarChart = ({ data, onBarClick, barsPerPage = 6, isExpanded = false }) => {
            const [page, setPage] = useState(0);
            const pageCount = Math.max(1, Math.ceil(data.length / barsPerPage));
            const maxVal = Math.max(...data.map(item => item.total), 0);
            const yAxisMax = Math.max(10, Math.ceil(maxVal / 10) * 10);
            const yAxisSteps = [1, 0.75, 0.5, 0.25, 0];
            const visibleBars = data.slice(page * barsPerPage, page * barsPerPage + barsPerPage);
            const paddedBars = [...visibleBars];
            while (paddedBars.length < barsPerPage) paddedBars.push(null);

            useEffect(() => {
                setPage(currentPage => Math.min(currentPage, pageCount - 1));
            }, [pageCount, barsPerPage, data.length]);

            if (data.length === 0) {
                return (
                    <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 rounded-b-[28px] bg-gradient-to-b from-[#F8FBFF] to-[#EEF5FF] text-slate-400">
                        <div className="rounded-full bg-white p-6 shadow-sm"><Icon name="search" className="w-11 h-11 text-slate-300" /></div>
                        <div className="text-center">
                            <p className="text-lg font-black text-slate-600">׳׳ ׳ ׳׳¦׳׳• ׳ ׳×׳•׳ ׳™׳</p>
                            <p className="text-sm">׳ ׳¡׳• ׳׳©׳ ׳•׳× ׳×׳׳¨׳™׳›׳™׳, ׳§׳˜׳’׳•׳¨׳™׳” ׳׳• ׳¡׳™׳ ׳•׳.</p>
                        </div>
                    </div>
                );
            }

            const chartPaddingClass = isExpanded ? 'px-4 pb-4 pt-4 sm:px-5' : 'px-5 pb-3 pt-3';
            const plotPaddingClass = isExpanded ? 'px-4 pt-5 sm:px-6 lg:px-8' : 'px-8 pt-6';
            const plotMinHeightClass = isExpanded ? 'min-h-[360px]' : 'min-h-[260px]';
            const labelSlotClass = isExpanded ? 'min-h-[56px]' : (pageCount > 1 ? 'h-[50px]' : 'h-10');
            const labelGapClass = isExpanded ? 'pt-4' : 'pt-3';
            const navSpacingClass = isExpanded ? 'mt-3' : 'mt-2';

            return (
                <div className={`relative flex h-full min-h-0 ${chartPaddingClass} flex-col rounded-b-[28px] bg-gradient-to-b from-[#F8FBFF] via-[#F6F9FF] to-[#EEF5FF]`}>
                    <div className="pointer-events-none absolute inset-x-4 inset-y-4 rounded-[24px] bg-white/60 ring-1 ring-white/80" />

                    <div className={`relative z-10 flex min-h-0 flex-1 flex-col ${plotPaddingClass}`}>
                        <div dir="ltr" className="grid min-h-0 flex-1 grid-cols-[42px_minmax(0,1fr)] gap-3">
                            <div className={`relative ${plotMinHeightClass} min-h-0`}>
                                {yAxisSteps.map((step, index) => (
                                    <span
                                        key={step}
                                        className="pointer-events-none absolute right-0 text-[10px] font-bold text-slate-400"
                                        dir="ltr"
                                        style={{
                                            top: `${(1 - step) * 100}%`,
                                            transform: index === 0 ? 'translateY(0)' : index === yAxisSteps.length - 1 ? 'translateY(-100%)' : 'translateY(-50%)'
                                        }}
                                    >
                                        {Math.round(yAxisMax * step)}
                                    </span>
                                ))}
                            </div>

                            <div className="flex min-h-0 flex-1 flex-col">
                                <div className={`relative ${plotMinHeightClass} min-h-0 flex-1`}>
                                    {yAxisSteps.map(step => (
                                        <div
                                            key={step}
                                            className="pointer-events-none absolute left-0 right-0 border-t border-blue-100/80"
                                            style={{ top: `${(1 - step) * 100}%` }}
                                        />
                                    ))}

                                    <div className="relative z-10 flex h-full items-end justify-between gap-2">
                                        {paddedBars.map((item, index) => {
                                            if (!item) {
                                                return <div key={`empty-${index}`} className="flex min-w-0 flex-1" />;
                                            }

                                            const heightPct = Math.max(4, (item.total / yAxisMax) * 100);
                                            const isHot = index === 0 && isExpanded;
                                            return (
                                                <button
                                                    key={`${item.label}-${index}`}
                                                    type="button"
                                                    title={`${item.label} - ${item.total} ׳₪׳ ׳™׳•׳×`}
                                                    onClick={() => onBarClick(item)}
                                                    className="group relative grid h-full min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)] items-end outline-none"
                                                >
                                                    <div className="relative flex w-full justify-center">
                                                        <span className="absolute -top-7 rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">{item.total} ׳₪׳ ׳™׳•׳×</span>
                                                        <span className="mb-2 rounded-full bg-white/95 px-2 py-1 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-100">{item.total}</span>
                                                    </div>
                                                    <div className="flex min-h-0 h-full items-end justify-center">
                                                        <span
                                                            className={`w-full max-w-[58px] rounded-t-[18px] transition-all duration-300 group-hover:brightness-95 group-hover:drop-shadow-xl ${
                                                                isHot ? 'bg-gradient-to-b from-pink-400 via-pink-200 to-blue-50/0' : 'bg-gradient-to-b from-blue-600 via-blue-300 to-blue-50/0'
                                                            }`}
                                                            style={{ height: `${heightPct}%`, minHeight: item.total ? 12 : 0 }}
                                                        />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className={`flex shrink-0 items-start justify-between gap-2 ${labelGapClass}`}>
                                    {paddedBars.map((item, index) => (
                                        <div key={item ? `${item.label}-label-${index}` : `empty-label-${index}`} className="flex min-w-0 flex-1 justify-center">
                                            {item ? (
                                                <span
                                                    title={item.label}
                                                    dir="rtl"
                                                    className={`dashboard-bar-label flex ${labelSlotClass} w-full max-w-[112px] items-start justify-center px-1 text-center text-[11px] font-bold leading-4 text-slate-500`}
                                                >
                                                    {item.label}
                                                </span>
                                            ) : (
                                                <div className={labelSlotClass} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {pageCount > 1 && (
                        <div className={`relative z-20 ${navSpacingClass} flex shrink-0 items-center justify-between rounded-2xl border border-white/80 bg-white/85 px-3 py-2 shadow-sm backdrop-blur-sm`}>
                            <button
                                type="button"
                                onClick={() => setPage(currentPage => Math.max(0, currentPage - 1))}
                                disabled={page === 0}
                                className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Icon name="arrowRight" className="w-4 h-4" /> ׳”׳§׳•׳“׳
                            </button>
                            <div className="text-xs font-black text-slate-500">
                                ׳׳¦׳™׳’ {Math.min(data.length, page * barsPerPage + 1)}-{Math.min(data.length, (page + 1) * barsPerPage)} ׳׳×׳•׳ {data.length} ֲ· {barsPerPage} ׳¢׳׳•׳“׳•׳× ׳‘׳›׳ ׳×׳¦׳•׳’׳”
                            </div>
                            <button
                                type="button"
                                onClick={() => setPage(currentPage => Math.min(pageCount - 1, currentPage + 1))}
                                disabled={page >= pageCount - 1}
                                className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                ׳”׳‘׳ <Icon name="arrowLeft" className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            );
        };

        const DashboardFilterToolbar = ({ isExpanded, filters, setFilters, categoryOptions, sortOptions, onExport }) => (
            <div className={`grid transition-all duration-500 ${isExpanded ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="min-h-0 overflow-hidden">
                    <div className="rounded-[24px] border border-blue-100 bg-slate-50/90 px-3 py-2.5 shadow-inner sm:px-4 sm:py-3">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-100">
                                <Icon name="filter" className="w-4 h-4 text-blue-600" />
                                ׳׳¡׳ ׳ ׳™ ׳×׳¦׳•׳’׳” ׳׳×׳§׳“׳׳™׳
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                                <DashboardSegmentedButton label="׳™׳•׳׳™" isActive={filters.grouping === 'daily'} onClick={() => setFilters(current => ({ ...current, grouping: 'daily' }))} />
                                <DashboardSegmentedButton label="׳©׳‘׳•׳¢׳™" isActive={filters.grouping === 'weekly'} onClick={() => setFilters(current => ({ ...current, grouping: 'weekly' }))} />
                                <DashboardSegmentedButton label="׳—׳•׳“׳©׳™" isActive={filters.grouping === 'monthly'} onClick={() => setFilters(current => ({ ...current, grouping: 'monthly' }))} />
                            </div>
                            <DashboardDateInput label="׳׳×׳׳¨׳™׳" value={filters.dateFrom} onChange={(value) => setFilters(current => ({ ...current, dateFrom: value }))} />
                            <DashboardDateInput label="׳¢׳“ ׳×׳׳¨׳™׳" value={filters.dateTo} onChange={(value) => setFilters(current => ({ ...current, dateTo: value }))} />
                            <DashboardSelectPill label="׳§׳˜׳’׳•׳¨׳™׳”" icon="filter" value={filters.category} onChange={(value) => setFilters(current => ({ ...current, category: value }))} options={categoryOptions} />
                            <DashboardSelectPill label="׳׳™׳•׳" icon="arrowDownUp" value={filters.sortOrder} onChange={(value) => setFilters(current => ({ ...current, sortOrder: value }))} options={sortOptions} />
                            <button
                                type="button"
                                onClick={onExport}
                                className="sm:mr-auto flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow-md"
                            >
                                <Icon name="arrowDownStraight" className="w-4 h-4" />
                                ׳”׳•׳¨׳“׳× ׳§׳•׳‘׳¥ Excel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );

        const DashboardInquiryModal = ({ modalConfig, searchValue, onSearchChange, onClose }) => {
            if (!modalConfig.isOpen) return null;

            const query = searchValue.trim().toLowerCase();
            const visibleItems = query
                ? modalConfig.filteredData.filter(item => {
                    const haystack = `${item.id} ${item.requester} ${item.phone} ${item.assignee} ${item.priority} ${item.subject}`.toLowerCase();
                    return haystack.includes(query);
                })
                : modalConfig.filteredData;

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md">
                    <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white/70 bg-slate-50 shadow-2xl" dir="rtl">
                        <div className="border-b border-slate-100 bg-white px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                                        <Icon name="filter" className="w-3.5 h-3.5" /> Drill-down
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-950">{modalConfig.title}</h2>
                                    <p className="mt-1 text-sm font-semibold text-slate-500">{modalConfig.subtitle}</p>
                                </div>
                                <button type="button" onClick={onClose} className="rounded-full p-3 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                                    <Icon name="close" className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-3">
                                <DashboardToolbarPill className="min-w-[260px]">
                                    <Icon name="search" className="w-4 h-4 text-slate-400" />
                                    <input
                                        value={searchValue}
                                        onChange={(event) => onSearchChange(event.target.value)}
                                        className="w-full border-0 bg-transparent text-sm outline-none"
                                        placeholder="׳—׳™׳₪׳•׳© ׳׳₪׳™ ׳׳¡׳₪׳¨ ׳₪׳ ׳™׳™׳” ׳׳• ׳©׳..."
                                    />
                                </DashboardToolbarPill>
                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm">
                                    {visibleItems.length} ׳₪׳ ׳™׳•׳× ׳׳•׳¦׳’׳•׳×
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-[#F7FAFF] p-5">
                            {visibleItems.length ? visibleItems.map(item => <DashboardInquiryListItem key={item.id} item={item} />) : (
                                <div className="flex h-80 flex-col items-center justify-center gap-4 text-slate-400">
                                    <Icon name="search" className="w-12 h-12" />
                                    <p className="text-lg font-black">׳׳ ׳ ׳׳¦׳׳• ׳₪׳ ׳™׳•׳×</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        };

        const DashboardKpiEditModal = ({ isOpen, onClose, page, pageCount, visibleKpis, selectedIds, canAddMore, onPrevPage, onNextPage, onAdd, onRemove }) => {
            useEffect(() => {
                if (!isOpen) return undefined;

                const handleKeyDown = (event) => {
                    if (event.key === 'Escape') onClose();
                };

                window.addEventListener('keydown', handleKeyDown);
                return () => window.removeEventListener('keydown', handleKeyDown);
            }, [isOpen, onClose]);

            if (!isOpen) return null;

            return (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6">
                    <button type="button" aria-label="׳¡׳’׳•׳¨ ׳—׳׳•׳ ׳¢׳¨׳™׳›׳× ׳›׳¨׳˜׳™׳¡׳™׳•׳×" className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={onClose} />

                    <div dir="rtl" className="relative z-10 flex w-full max-w-[560px] flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)] animate-fade-in">
                        <div className="relative border-b border-slate-100 px-6 pb-5 pt-7 text-center">
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="׳¡׳’׳•׳¨ ׳—׳׳•׳ ׳¢׳¨׳™׳›׳× ׳›׳¨׳˜׳™׳¡׳™׳•׳×"
                                className="absolute left-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                            >
                                <Icon name="close" className="h-5 w-5" />
                            </button>
                            <h2 className="text-[30px] font-black tracking-tight text-slate-900">׳¢׳¨׳™׳›׳× ׳›׳¨׳˜׳™׳¡׳™׳•׳× ׳”׳׳™׳“׳¢</h2>
                            <p className="mt-2 text-sm font-semibold text-slate-400">׳ ׳ ׳‘׳—׳¨ ׳¢׳“ 4 ׳›׳¨׳˜׳™׳¡׳™׳•׳× ׳©׳‘׳¨׳¦׳•׳ ׳ ׳׳”׳¦׳™׳’ ׳‘׳—׳×׳ ׳”׳׳™׳“׳¢</p>
                        </div>

                        <div className="px-6 py-5">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {visibleKpis.map(kpi => {
                                    const isSelected = selectedIds.includes(kpi.id);
                                    const actionIcon = isSelected ? 'trash' : 'plus';
                                    const actionLabel = isSelected ? `׳”׳¡׳¨ ׳›׳¨׳˜׳™׳¡׳™׳™׳” ${kpi.title}` : `׳”׳•׳¡׳£ ׳›׳¨׳˜׳™׳¡׳™׳™׳” ${kpi.title}`;

                                    return (
                                        <KpiCard
                                            key={kpi.id}
                                            {...kpi}
                                            mode="modal"
                                            actionIcon={actionIcon}
                                            actionLabel={actionLabel}
                                            onAction={() => (isSelected ? onRemove(kpi.id) : onAdd(kpi.id))}
                                            isActionDisabled={!isSelected && !canAddMore}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        <div dir="ltr" className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-sm font-bold text-slate-500">
                            <button
                                type="button"
                                onClick={onNextPage}
                                disabled={page >= pageCount - 1}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
                            >
                                ׳”׳‘׳ <Icon name="arrowLeft" className="h-4 w-4" />
                            </button>
                            <div className="text-center text-[15px] font-black text-slate-500">׳¢׳׳•׳“ {page + 1} ׳׳×׳•׳ {pageCount}</div>
                            <button
                                type="button"
                                onClick={onPrevPage}
                                disabled={page === 0}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
                            >
                                <Icon name="arrowRight" className="h-4 w-4" /> ׳§׳•׳“׳
                            </button>
                        </div>
                    </div>
                </div>
            );
        };

        // --- DASHBOARD VIEW ---
        const DashboardView = () => {
            const inquiries = dashboardInquiries;
            const [isExpanded, setIsExpanded] = useState(false);
            const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', subtitle: '', filteredData: [] });
            const [modalSearch, setModalSearch] = useState('');
            const [isKpiEditorOpen, setIsKpiEditorOpen] = useState(false);
            const [kpiPage, setKpiPage] = useState(0);
            const [selectedKpiIds, setSelectedKpiIds] = useState(['total', 'handled', 'today', 'open']);
            const [filters, setFilters] = useState({
                dateFrom: '',
                dateTo: '',
                grouping: 'monthly',
                category: 'all',
                sortOrder: 'desc'
            });

            const filteredBarData = React.useMemo(() => filterDashboardInquiries(inquiries, filters), [inquiries, filters.category, filters.dateFrom, filters.dateTo]);
            const groupedBarData = React.useMemo(() => sortDashboardGroups(groupDashboardInquiries(filteredBarData, filters.grouping), filters.sortOrder), [filteredBarData, filters.grouping, filters.sortOrder]);
            const hasActiveFilters = Boolean(filters.dateFrom || filters.dateTo || filters.category !== 'all');
            const donutSource = hasActiveFilters ? filteredBarData : inquiries;

            const priorityData = React.useMemo(() => {
                return dashboardPriorities.map(priority => ({
                    label: priority.label,
                    value: donutSource.filter(item => item.priority === priority.label).length,
                    color: priority.chartColor,
                    rawLabel: priority.label
                }));
            }, [donutSource]);

            const categoryOptions = React.useMemo(() => {
                const categories = Array.from(new Set(inquiries.map(item => item.assignee)));
                return [
                    { value: 'all', label: '׳›׳ ׳”׳§׳˜׳’׳•׳¨׳™׳•׳×' },
                    ...categories.map(category => ({ value: category, label: category }))
                ];
            }, [inquiries]);

            const sortOptions = [
                { value: 'desc', label: '׳׳”׳’׳‘׳•׳” ׳׳ ׳׳•׳' },
                { value: 'asc', label: '׳׳”׳ ׳׳•׳ ׳׳’׳‘׳•׳”' }
            ];

            const totalInquiries = inquiries.length;
            const openInquiries = inquiries.filter(item => item.status === 'open').length;
            const closedInquiries = inquiries.filter(item => item.status === 'closed').length;
            const todayString = new Date().toISOString().split('T')[0];
            const openedToday = inquiries.filter(item => item.date === todayString).length;
            const now = new Date(`${todayString}T12:00:00`);
            const isWithinDays = (dateValue, days) => {
                const diff = (now - new Date(`${dateValue}T12:00:00`)) / 86400000;
                return diff >= 0 && diff < days;
            };
            const priorityCounts = inquiries.reduce((accumulator, item) => {
                accumulator[item.priority] = (accumulator[item.priority] || 0) + 1;
                return accumulator;
            }, {});
            const inquiriesThisWeek = inquiries.filter(item => isWithinDays(item.date, 7)).length;
            const inquiriesLastThirtyDays = inquiries.filter(item => isWithinDays(item.date, 30)).length;
            const countThisMonth = inquiries.filter(item => item.date.slice(0, 7) === todayString.slice(0, 7)).length;
            const closedThisWeek = inquiries.filter(item => item.status === 'closed' && isWithinDays(item.date, 7)).length;
            const highOpenInquiries = inquiries.filter(item => item.status === 'open' && item.priority === '׳’׳‘׳•׳”׳”-1').length;

            const kpiDefinitions = [
                { id: 'total', title: '׳¡׳”׳´׳› ׳₪׳ ׳™׳•׳×', value: totalInquiries, icon: 'filePlus', accent: 'blue' },
                { id: 'handled', title: '׳₪׳ ׳™׳•׳× ׳©׳˜׳•׳₪׳׳•', value: closedInquiries, icon: 'check', accent: 'rose' },
                { id: 'today', title: '׳₪׳ ׳™׳•׳× ׳©׳ ׳₪׳×׳—׳• ׳”׳™׳•׳', value: openedToday, icon: 'clock', accent: 'emerald' },
                { id: 'open', title: '׳₪׳ ׳™׳•׳× ׳₪׳×׳•׳—׳•׳×', subtitle: '׳›׳•׳׳ ׳₪׳ ׳™׳•׳× ׳©׳ ׳©׳׳—׳• ׳•׳׳ ׳׳•׳©׳¨׳•', value: openInquiries, icon: 'chartBar', accent: 'amber' },
                { id: 'high', title: '׳₪׳ ׳™׳•׳× ׳‘׳¢׳“׳™׳₪׳•׳× ׳’׳‘׳•׳”׳”', value: priorityCounts['׳’׳‘׳•׳”׳”-1'] || 0, icon: 'target', accent: 'rose' },
                { id: 'medium', title: '׳₪׳ ׳™׳•׳× ׳‘׳¢׳“׳™׳₪׳•׳× ׳‘׳™׳ ׳•׳ ׳™׳×', value: priorityCounts['׳‘׳™׳ ׳•׳ ׳™׳×-2'] || 0, icon: 'dashboard', accent: 'amber' },
                { id: 'low', title: '׳₪׳ ׳™׳•׳× ׳‘׳¢׳“׳™׳₪׳•׳× ׳ ׳׳•׳›׳”', value: priorityCounts['׳ ׳׳•׳›׳”-3'] || 0, icon: 'chartBar', accent: 'violet' },
                { id: 'week', title: '׳₪׳ ׳™׳•׳× ׳‘-7 ׳™׳׳™׳', value: inquiriesThisWeek, icon: 'calendar', accent: 'cyan' },
                { id: 'month', title: '׳₪׳ ׳™׳•׳× ׳”׳—׳•׳“׳©', value: countThisMonth, icon: 'calendar', accent: 'blue' },
                { id: 'thirtyDays', title: '׳₪׳ ׳™׳•׳× ׳‘-30 ׳™׳׳™׳', value: inquiriesLastThirtyDays, icon: 'history', accent: 'emerald' },
                { id: 'openHigh', title: '׳₪׳×׳•׳—׳•׳× ׳‘׳¢׳“׳™׳₪׳•׳× ׳’׳‘׳•׳”׳”', value: highOpenInquiries, icon: 'volume', accent: 'rose' },
                { id: 'closedWeek', title: '׳˜׳•׳₪׳׳• ׳‘-7 ׳™׳׳™׳', value: closedThisWeek, icon: 'check', accent: 'cyan' }
            ];

            const kpiPageSize = 4;
            const kpiPageCount = Math.max(1, Math.ceil(kpiDefinitions.length / kpiPageSize));
            const visibleKpiOptions = kpiDefinitions.slice(kpiPage * kpiPageSize, kpiPage * kpiPageSize + kpiPageSize);
            const selectedKpis = selectedKpiIds.map(id => kpiDefinitions.find(kpi => kpi.id === id)).filter(Boolean);

            useEffect(() => {
                setKpiPage(currentPage => Math.min(currentPage, kpiPageCount - 1));
            }, [kpiPageCount]);

            const closeModal = () => {
                setModalSearch('');
                setModalConfig({ isOpen: false, title: '', subtitle: '', filteredData: [] });
            };

            const handleAddKpi = (kpiId) => {
                setSelectedKpiIds(currentIds => {
                    if (currentIds.includes(kpiId) || currentIds.length >= 4) return currentIds;
                    return [...currentIds, kpiId];
                });
            };

            const handleRemoveKpi = (kpiId) => {
                setSelectedKpiIds(currentIds => currentIds.filter(id => id !== kpiId));
            };

            const handleDonutClick = (segment) => {
                const filtered = donutSource.filter(item => item.priority === segment.rawLabel);
                setModalSearch('');
                setModalConfig({
                    isOpen: true,
                    title: `׳₪׳ ׳™׳•׳× ׳׳₪׳™ ׳“׳—׳™׳₪׳•׳×: ${segment.label}`,
                    subtitle: `${filtered.length} ׳₪׳ ׳™׳•׳× ׳ ׳׳¦׳׳• ׳‘׳—׳×׳ ׳©׳ ׳‘׳—׳¨`,
                    filteredData: filtered
                });
            };

            const handleBarClick = (barData) => {
                setModalSearch('');
                setModalConfig({
                    isOpen: true,
                    title: `׳₪׳ ׳™׳•׳× ׳׳×׳§׳•׳₪׳”: ${barData.label}`,
                    subtitle: `${barData.total} ׳₪׳ ׳™׳•׳× ׳׳₪׳™ ׳”׳¡׳™׳ ׳•׳ ׳”׳ ׳•׳›׳—׳™`,
                    filteredData: barData.items
                });
            };

            return (
                <div dir="rtl" className={`h-full min-h-0 overflow-hidden ${isExpanded ? 'p-4 lg:p-5' : 'p-6'} flex flex-col wave-bg text-slate-800`}>
                    <header className={`${isExpanded ? 'mb-4' : 'mb-5'} shrink-0 flex flex-wrap items-start justify-between gap-4`}>
                        <div>
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                                <Icon name="dashboard" className="w-3.5 h-3.5" /> ׳׳¨׳›׳– ׳ ׳™׳×׳•׳— ׳₪׳ ׳™׳•׳×
                            </div>
                            <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-[#1E3A8A]">
                                <Icon name="chartBar" className="w-8 h-8 text-[#1E4DB7]" /> ׳“׳©׳‘׳•׳¨׳“ ׳₪׳ ׳™׳•׳×
                            </h1>
                            <p className="mt-1 text-sm font-semibold text-[#1E4DB7]">׳׳‘׳˜ ׳ ׳™׳”׳•׳׳™, ׳׳™׳ ׳˜׳¨׳׳§׳˜׳™׳‘׳™ ׳•׳׳¡׳•׳ ׳ ׳¢׳ ׳›׳ ׳”׳₪׳ ׳™׳•׳× ׳‘׳׳¢׳¨׳›׳×.</p>
                        </div>
                        <div className="hidden items-center gap-3 lg:flex">
                            <div className="rounded-3xl border border-blue-100 bg-white/90 px-6 py-4 text-left shadow-sm">
                                <div className="text-xs font-bold text-slate-400">׳¡׳”׳´׳› ׳₪׳ ׳™׳•׳× ׳‘׳׳¢׳¨׳›׳×</div>
                                <div className="text-4xl font-black text-blue-700">{totalInquiries}</div>
                            </div>
                        </div>
                    </header>

                    <main className="flex min-h-0 flex-1 flex-col">
                        <div className="min-h-0 flex-1 overflow-hidden">
                            <div className={`flex h-full min-h-[360px] min-w-0 items-stretch ${isExpanded ? 'gap-4' : 'gap-5'} lg:flex-row`}>
                                {!isExpanded && (
                                    <div className="flex h-full min-h-0 w-full opacity-100 transition-all duration-500 ease-in-out lg:w-[43%]">
                                        <DashboardCard className="flex h-full min-h-[360px] flex-col p-6">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h2 className="text-2xl font-black text-slate-950">׳₪׳™׳׳•׳— ׳׳₪׳™ ׳“׳—׳™׳₪׳•׳×</h2>
                                                    <p className="mt-1 text-sm font-semibold text-slate-400">׳׳—׳™׳¦׳” ׳¢׳ ׳׳§׳˜׳¢ ׳₪׳•׳×׳—׳× ׳׳× ׳¨׳©׳™׳׳× ׳”׳₪׳ ׳™׳•׳× ׳”׳¨׳׳•׳•׳ ׳˜׳™׳•׳×.</p>
                                                </div>
                                                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 ring-1 ring-blue-100">
                                                    <Icon name="dashboard" className="w-6 h-6" />
                                                </div>
                                            </div>
                                            <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-4">
                                                <CustomDonutChart data={priorityData} onSegmentClick={handleDonutClick} />
                                                <div className="mt-6 flex w-full flex-wrap justify-center gap-3 rounded-3xl border border-slate-100 bg-slate-50/80 p-3">
                                                    {priorityData.map(item => (
                                                        <button key={item.label} type="button" onClick={() => handleDonutClick(item)} className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                                                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                                                            {item.label}
                                                            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-slate-500">{item.value}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </DashboardCard>
                                    </div>
                                )}

                                <div className={`flex h-full min-h-0 flex-col transition-all duration-500 ease-in-out ${isExpanded ? 'w-full' : 'w-full lg:w-[57%]'}`}>
                                    <DashboardCard className="flex h-full min-h-0 flex-col">
                                        <div className={`shrink-0 border-b border-slate-100 bg-white/90 ${isExpanded ? 'px-5 py-4' : 'px-6 py-5'}`}>
                                            <div className={`flex flex-wrap justify-between ${isExpanded ? 'items-center gap-3' : 'items-start gap-4'}`}>
                                                <div>
                                                    <h2 className="flex items-center gap-2 text-2xl font-black text-slate-950">
                                                        <Icon name="chartBar" className="w-6 h-6 text-blue-600" /> ׳׳’׳׳× ׳₪׳ ׳™׳•׳× ׳×׳§׳•׳₪׳×׳™׳×
                                                    </h2>
                                                    <p className="mt-1 text-sm font-semibold text-slate-400">׳’׳¨׳£ ׳¢׳׳•׳“׳•׳× ׳¢׳ 12 ׳¢׳׳•׳“׳•׳× ׳‘׳×׳¦׳•׳’׳”, ׳¡׳™׳ ׳•׳, ׳׳™׳•׳ ׳•׳™׳™׳¦׳•׳.</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {isExpanded && <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">׳¡׳”׳´׳› ׳׳•׳¦׳’׳•׳×: <span className="text-lg">{filteredBarData.length}</span></div>}
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsExpanded(!isExpanded)}
                                                        className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700 hover:shadow-md active:scale-95"
                                                    >
                                                        {isExpanded ? (
                                                            <><Icon name="arrowDownStraight" className="w-4 h-4" /> ׳׳–׳¢׳¨</>
                                                        ) : (
                                                            <><Icon name="arrowUpStraight" className="w-4 h-4 text-blue-500" /> ׳”׳¨׳—׳‘׳”</>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            <DashboardFilterToolbar
                                                isExpanded={isExpanded}
                                                filters={filters}
                                                setFilters={setFilters}
                                                categoryOptions={categoryOptions}
                                                sortOptions={sortOptions}
                                                onExport={() => exportDashboardCsv(groupedBarData)}
                                            />
                                        </div>
                                        <div className="min-h-0 flex-1 overflow-hidden">
                                            <CustomBarChart data={groupedBarData} onBarClick={handleBarClick} barsPerPage={isExpanded ? 12 : 6} isExpanded={isExpanded} />
                                        </div>
                                    </DashboardCard>
                                </div>
                            </div>
                        </div>

                        <div className={`transition-all duration-500 ${isExpanded ? 'mt-0 max-h-0 overflow-hidden opacity-0' : 'mt-5 max-h-[520px] opacity-100'}`}>
                            <div className="mb-3 flex items-end justify-between px-1">
                                <button
                                    type="button"
                                    onClick={() => setIsKpiEditorOpen(true)}
                                    className="rounded-2xl border-2 border-slate-900 bg-white px-5 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-700 hover:text-blue-700 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                                >
                                    ׳¢׳¨׳•׳ ׳›׳¨׳˜׳™׳¡׳™׳•׳×
                                </button>
                                <h3 className="text-lg font-black text-slate-900">׳—׳×׳›׳™ ׳׳™׳“׳¢ ׳׳¨׳›׳–׳™׳™׳</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {selectedKpis.map(kpi => <KpiCard key={kpi.id} {...kpi} />)}
                            </div>
                        </div>
                    </main>

                    <DashboardInquiryModal
                        modalConfig={modalConfig}
                        searchValue={modalSearch}
                        onSearchChange={setModalSearch}
                        onClose={closeModal}
                    />
                    <DashboardKpiEditModal
                        isOpen={isKpiEditorOpen}
                        onClose={() => setIsKpiEditorOpen(false)}
                        page={kpiPage}
                        pageCount={kpiPageCount}
                        visibleKpis={visibleKpiOptions}
                        selectedIds={selectedKpiIds}
                        canAddMore={selectedKpiIds.length < 4}
                        onPrevPage={() => setKpiPage(currentPage => Math.max(0, currentPage - 1))}
                        onNextPage={() => setKpiPage(currentPage => Math.min(kpiPageCount - 1, currentPage + 1))}
                        onAdd={handleAddKpi}
                        onRemove={handleRemoveKpi}
                    />
                </div>
            );
        };

        // --- TICKET MODAL COMPONENT ---
        const TicketModal = ({ ticket, viewType, onClose }) => {
            const [activeTab, setActiveTab] = useState('info');

            // ׳”׳’׳“׳¨׳× ׳”׳˜׳׳‘׳™׳ ׳”׳–׳׳™׳ ׳™׳ ׳׳₪׳™ ׳¡׳•׳’ ׳”׳×׳¦׳•׳’׳”
            let availableTabs = [];
            if (viewType === 'open' || viewType === 'my_tasks') {
                availableTabs = [
                    { id: 'info', label: '׳׳™׳“׳¢ ׳׳•׳“׳•׳× ׳”׳₪׳ ׳™׳™׳”' },
                    { id: 'chat', label: "׳¦'׳׳˜" },
                    { id: 'edit', label: '׳׳¦׳‘ ׳¢׳¨׳™׳›׳”' },
                    { id: 'send', label: '׳©׳׳™׳—׳”' },
                    { id: 'close', label: '׳¡׳’׳™׳¨׳× ׳₪׳ ׳™׳™׳”' }
                ];
            } else if (viewType === 'history') {
                availableTabs = [
                    { id: 'info', label: '׳׳™׳“׳¢ ׳׳•׳“׳•׳× ׳”׳₪׳ ׳™׳™׳”' },
                    { id: 'chat', label: "׳¦'׳׳˜" },
                    { id: 'edit', label: '׳׳¦׳‘ ׳¢׳¨׳™׳›׳”' }
                ];
            } else if (viewType === 'external') {
                availableTabs = [
                    { id: 'info', label: '׳׳™׳“׳¢ ׳׳•׳“׳•׳× ׳”׳₪׳ ׳™׳™׳”' },
                    { id: 'chat', label: "׳¦'׳׳˜" }
                ];
            }

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
                    
                    <div className="bg-[#F4F5FA] w-full max-w-4xl rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden animate-fade-in z-10 border border-gray-200">
                        
                        <div className="px-8 pt-6 pb-0 flex flex-col shrink-0">
                            <div className="flex justify-between items-start w-full">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Icon name="filePlus" className="w-5 h-5 text-[#1E4DB7]" />
                                        <h2 className="text-2xl font-black text-[#1E3A8A] tracking-tight">{ticket.id.replace('...', '')}</h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-[#FEF3C7] text-[#D97706] border border-[#FCD34D] px-3 py-1 rounded-md text-xs font-bold shadow-sm">
                                            {ticket.priority || '׳‘׳™׳ ׳•׳ ׳™׳×-2'}
                                        </span>
                                        <span className="bg-[#22C55E] text-white px-3 py-1 rounded-md text-xs font-bold shadow-sm">
                                            {viewType === 'history' ? '׳¡׳’׳•׳¨׳”' : '׳₪׳×׳•׳—׳”'}
                                        </span>
                                    </div>
                                </div>

                                <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-white border border-gray-200 p-1.5 rounded-lg transition-colors shadow-sm">
                                    <Icon name="close" className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex gap-6 mt-6 border-b border-gray-200">
                                {availableTabs.map(tab => (
                                    <button 
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`pb-3 px-1 text-sm font-bold transition-all relative ${
                                            activeTab === tab.id 
                                            ? 'text-[#1E4DB7]' 
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        {tab.label}
                                        {activeTab === tab.id && (
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1E4DB7] rounded-t-md"></div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar relative">
                            {/* --- TAB: INFO (׳׳™׳“׳¢ ׳׳•׳“׳•׳× ׳”׳₪׳ ׳™׳™׳”) --- */}
                            {activeTab === 'info' && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-[#1E3A8A] font-extrabold text-lg mb-4">׳׳™׳“׳¢ ׳§׳¨׳™׳˜׳™</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-[#E6F0FD] border border-[#BFDBFE] rounded-xl p-4 flex gap-4 items-center shadow-sm">
                                                <div className="bg-white p-2 rounded-lg text-[#1E4DB7] shadow-sm shrink-0"><Icon name="user" className="w-5 h-5"/></div>
                                                <div>
                                                    <div className="text-[#1E4DB7] font-bold text-sm">׳ ׳₪׳×׳— ׳¢׳ ׳™׳“׳™</div>
                                                    <div className="text-gray-800 font-semibold text-xs mt-0.5">{ticket.name}</div>
                                                </div>
                                            </div>
                                            <div className="bg-[#E6F0FD] border border-[#BFDBFE] rounded-xl p-4 flex gap-4 items-center shadow-sm">
                                                <div className="bg-white p-2 rounded-lg text-[#1E4DB7] shadow-sm shrink-0"><Icon name="phone" className="w-5 h-5"/></div>
                                                <div>
                                                    <div className="text-[#1E4DB7] font-bold text-sm">׳˜׳׳₪׳•׳ ׳׳™׳¦׳™׳¨׳× ׳§׳©׳¨</div>
                                                    <div className="text-gray-800 font-semibold text-xs mt-0.5">{ticket.phone !== '׳׳ ׳–׳׳™׳' ? ticket.phone : '050-1234567'}</div>
                                                </div>
                                            </div>
                                            <div className="bg-[#E6F0FD] border border-[#BFDBFE] rounded-xl p-4 flex gap-4 items-center shadow-sm">
                                                <div className="bg-white p-2 rounded-lg text-[#1E4DB7] shadow-sm shrink-0"><Icon name="calendar" className="w-5 h-5"/></div>
                                                <div>
                                                    <div className="text-[#1E4DB7] font-bold text-sm">׳×׳׳¨׳™׳ ׳₪׳×׳™׳—׳”</div>
                                                    <div className="text-gray-800 font-semibold text-xs mt-0.5">{ticket.date} ׳‘׳©׳¢׳” 13:27</div>
                                                </div>
                                            </div>
                                            <div className="bg-[#E6F0FD] border border-[#BFDBFE] rounded-xl p-4 flex gap-4 items-center shadow-sm">
                                                <div className="bg-white p-2 rounded-lg text-[#1E4DB7] shadow-sm shrink-0"><Icon name="check" className="w-5 h-5"/></div>
                                                <div>
                                                    <div className="text-[#1E4DB7] font-bold text-sm">׳×׳׳¨׳™׳ ׳¡׳’׳™׳¨׳”</div>
                                                    <div className="text-gray-800 font-semibold text-xs mt-0.5">{viewType === 'history' ? `${ticket.date} ׳‘׳©׳¢׳” 14:00` : '׳˜׳¨׳ ׳ ׳¡׳’׳¨'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-[#1E3A8A] font-extrabold text-lg mb-4 mt-8">׳׳™׳“׳¢ ׳ ׳׳•׳•׳”</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col items-start justify-center min-h-[80px]">
                                                <div className="text-gray-500 font-bold text-xs mb-1">׳’׳•׳¨׳ ׳׳˜׳₪׳</div>
                                                <div className="text-gray-800 font-semibold text-sm">׳׳ ׳“׳™׳™ (ccfcc)</div>
                                            </div>
                                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col items-start justify-center min-h-[80px]">
                                                <div className="text-gray-500 font-bold text-xs mb-1">׳.׳ ׳©׳ ׳׳§׳•׳—</div>
                                                <div className="text-gray-800 font-semibold text-sm">s3333333</div>
                                            </div>
                                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col items-start justify-center min-h-[80px]">
                                                <div className="text-gray-500 font-bold text-xs mb-1">׳׳•׳₪׳ ׳˜׳™׳₪׳•׳ ׳‘׳₪׳ ׳™׳™׳”</div>
                                                <div className="text-gray-800 font-semibold text-sm">׳”׳₪׳ ׳™׳™׳” ׳˜׳•׳₪׳׳” ׳‘׳”׳¦׳׳—׳” (dsfsdfsd)</div>
                                            </div>
                                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col items-start justify-center min-h-[80px]">
                                                <div className="text-gray-500 font-bold text-xs mb-1">׳¡׳•׳’ ׳¨׳©׳×</div>
                                                <div className="text-gray-800 font-semibold text-sm">׳¡׳•׳“׳™</div>
                                            </div>
                                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col items-start justify-center min-h-[80px]">
                                                <div className="text-gray-500 font-bold text-xs mb-1">׳׳™׳“׳¢ ׳™׳¢׳•׳“׳™</div>
                                                <div className="text-gray-800 font-semibold text-sm">sdfsdf</div>
                                            </div>
                                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col items-start justify-center min-h-[80px]">
                                                <div className="text-gray-500 font-bold text-xs mb-1">׳׳©׳™׳׳” ׳™׳™׳—׳•׳“׳™׳×</div>
                                                <div className="text-gray-800 font-semibold text-sm">sdfsdfsd</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- TAB: EDIT (׳׳¦׳‘ ׳¢׳¨׳™׳›׳”) --- */}
                            {activeTab === 'edit' && (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="flex flex-col gap-5">
                                            <Select label="׳’׳•׳¨׳ ׳׳˜׳₪׳ *" options={["׳׳ ׳“׳™׳™ (ccfcc)", "׳׳—׳¨"]} className="font-bold text-[#1E4DB7] h-11" />
                                            <Input label="׳׳•׳₪׳ ׳˜׳™׳₪׳•׳ ׳‘׳₪׳ ׳™׳™׳”" defaultValue="׳”׳₪׳ ׳™׳™׳” ׳˜׳•׳₪׳׳” ׳‘׳”׳¦׳׳—׳” (dsfsdfsd)" className="h-11 font-bold text-gray-700" />
                                            <Input label="׳˜׳׳₪׳•׳ ׳׳™׳¦׳™׳¨׳× ׳§׳©׳¨ *" icon="phone" defaultValue={ticket.phone !== '׳׳ ׳–׳׳™׳' ? ticket.phone : '050-1234567'} className="h-11 font-bold text-[#1E4DB7]" />
                                            <Select label="׳¡׳•׳’ ׳¨׳©׳× *" options={["׳¡׳•׳“׳™", "׳‘׳׳׳´׳¡"]} className="font-bold text-[#1E4DB7] h-11" />
                                        </div>
                                        <div className="flex flex-col gap-5">
                                            <Input label="׳.׳ ׳©׳ ׳׳§׳•׳—" icon="search" defaultValue="s3333333" className="h-11 font-bold text-[#1E4DB7]" />
                                            <Input label="׳׳™׳“׳¢ ׳™׳¢׳•׳“׳™" defaultValue="sdfsdf" className="h-11 font-bold text-gray-700" />
                                            <div className="flex flex-col flex-1">
                                                <label className="block text-xs font-bold text-gray-700 mb-1.5">׳×׳™׳׳•׳¨ ׳”׳×׳§׳׳” *</label>
                                                <textarea className="w-full flex-1 bg-white border border-gray-200 shadow-sm rounded-lg py-3 px-4 text-sm font-bold text-gray-700 focus:outline-none focus:border-[#1E4DB7] resize-none" defaultValue="sdfsdfsd"></textarea>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-6 border-t border-gray-200 flex justify-center">
                                        <Button className="px-10 py-2.5 text-sm rounded-xl shadow-md w-full max-w-xs">׳©׳׳•׳¨ ׳©׳™׳ ׳•׳™׳™׳</Button>
                                    </div>
                                </div>
                            )}

                            {/* --- TAB: CLOSE (׳¡׳’׳™׳¨׳× ׳₪׳ ׳™׳™׳”) --- */}
                            {activeTab === 'close' && (
                                <div className="flex flex-col items-center justify-center py-4 max-w-2xl mx-auto space-y-8 animate-fade-in">
                                    <div className="text-center space-y-1.5 mt-4">
                                        <h3 className="text-[17px] font-bold text-gray-800">׳”׳׳ ׳׳×׳” ׳‘׳˜׳•׳— ׳©׳׳×׳” ׳¨׳•׳¦׳” ׳׳¡׳’׳•׳¨ ׳׳× ׳”׳₪׳ ׳™׳™׳”?</h3>
                                        <p className="text-[13px] text-gray-400 font-bold">׳›׳¨׳’׳¢ ׳׳ ׳™׳”׳™׳” ׳ ׳™׳×׳ ׳׳©׳—׳–׳¨ ׳׳•׳×׳”</p>
                                    </div>
                                    
                                    <div className="w-full flex justify-between bg-[#F8FAFC] border border-gray-200 rounded-xl p-5 shadow-sm">
                                        <div className="flex flex-col items-start gap-2 w-1/2">
                                            <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-bold bg-white px-2.5 py-1.5 rounded-lg border border-gray-100 shadow-sm w-fit">
                                                <Icon name="calendar" className="w-3 h-3 text-[#1E4DB7]" />
                                                ׳×׳׳¨׳™׳ ׳₪׳×׳™׳—׳” ׳©׳ ׳”׳׳§׳•׳—
                                            </div>
                                            <span className="font-extrabold text-[#1E3A8A] text-sm ml-1 pr-1">14 ׳‘׳™׳•׳ ׳™ 2026 ׳‘׳©׳¢׳” 11:45</span>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 w-1/2 border-r border-gray-200 pr-5">
                                            <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-bold bg-white px-2.5 py-1.5 rounded-lg border border-gray-100 shadow-sm w-fit">
                                                ׳׳¡׳₪׳¨ ׳₪׳ ׳™׳™׳”
                                                <span className="text-[#1E4DB7] font-black text-xs leading-none">#</span>
                                            </div>
                                            <span className="font-extrabold text-[#1E3A8A] text-sm mr-1 pl-1" dir="ltr">{ticket.id || 'BC-284-1781426709667'}</span>
                                        </div>
                                    </div>

                                    <div className="w-full">
                                        <input className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm focus:outline-none focus:border-[#1E4DB7] transition-all shadow-sm font-semibold text-gray-700 placeholder-gray-400" placeholder="׳”׳§׳׳™׳“/׳™ ׳›׳׳ ׳׳× ׳׳•׳₪׳ ׳”׳˜׳™׳₪׳•׳ ׳‘׳×׳§׳׳”" />
                                    </div>

                                    <div className="flex items-center justify-center gap-4 pt-2">
                                        <Button className="px-10 py-2.5 text-sm rounded-xl font-bold shadow-md bg-[#1E3A8A] hover:bg-blue-900">׳›׳, ׳¡׳’׳•׳¨ ׳₪׳ ׳™׳™׳”</Button>
                                        <Button variant="ghost" className="px-10 py-2.5 text-sm rounded-xl font-bold border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700" onClick={onClose}>׳‘׳˜׳</Button>
                                    </div>
                                </div>
                            )}

                            {/* --- TAB: SEND (׳©׳׳™׳—׳× ׳₪׳ ׳™׳™׳” / ׳”׳¢׳‘׳¨׳” ׳׳—׳“׳¨) --- */}
                            {activeTab === 'send' && (
                                <div className="space-y-6 animate-fade-in pb-4">
                                    <div className="bg-[#F8FAFC] border border-gray-200 shadow-sm rounded-2xl p-5 flex flex-col items-center gap-3">
                                        <label className="text-[#1E3A8A] font-extrabold text-[15px]">׳‘׳—׳¨׳• ׳׳׳™׳–׳” ׳—׳“׳¨ ׳׳”׳¢׳‘׳™׳¨</label>
                                        <Select options={["׳׳ ׳“׳™׳™"]} className="w-72 text-center font-bold text-[#1E4DB7] h-10 shadow-sm border-gray-200" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-8 gap-y-6 bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
                                        <div className="flex flex-col gap-6">
                                            <Select label={<span className="flex items-center gap-1.5 text-gray-700"><Icon name="users" className="w-3.5 h-3.5 text-[#1E4DB7]"/> ׳’׳•׳¨׳ ׳׳˜׳₪׳ <span className="text-red-500">*</span></span>} options={["׳׳ ׳“׳™׳™"]} className="font-bold text-[#1E4DB7] h-11 bg-white" />
                                            <Input label={<span className="text-gray-700 font-bold block">׳׳•׳₪׳ ׳˜׳™׳₪׳•׳ ׳‘׳₪׳ ׳™׳™׳”</span>} defaultValue="׳׳•׳₪׳ ׳˜׳™׳₪׳•׳ ׳‘׳₪׳ ׳™׳™׳”" className="h-11 font-bold text-gray-500 bg-white" />
                                            <Input label={<span className="flex items-center gap-1.5 text-gray-700"><Icon name="location" className="w-3.5 h-3.5 text-gray-400"/> ׳׳™׳§׳•׳</span>} defaultValue="׳‘׳”׳”׳”׳”" className="h-11 font-bold text-gray-500 bg-white" />
                                        </div>
                                        <div className="flex flex-col gap-6">
                                            <Select label={<span className="flex items-center gap-1.5 text-gray-700"><Icon name="target" className="w-3.5 h-3.5 text-red-500"/> ׳“׳—׳™׳₪׳•׳× <span className="text-red-500">*</span></span>} options={["׳ ׳׳•׳›׳”-3"]} className="font-bold text-gray-600 h-11 bg-white" />
                                            <Input label={<span className="flex items-center gap-1.5 text-gray-700"><Icon name="user" className="w-3.5 h-3.5 text-[#1E4DB7]"/> ׳.׳ ׳©׳ ׳׳§׳•׳— <span className="text-red-500">*</span></span>} defaultValue="c6666666" className="h-11 font-extrabold text-[#1E4DB7] bg-white" />
                                            <div className="flex flex-col flex-1">
                                                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1.5"><Icon name="filePlus" className="w-3.5 h-3.5 text-[#1E4DB7]"/> ׳×׳™׳׳•׳¨ ׳”׳×׳§׳׳” <span className="text-red-500">*</span></label>
                                                <textarea className="w-full flex-1 bg-white border border-gray-200 shadow-sm rounded-lg py-3 px-4 text-sm font-extrabold text-[#1E4DB7] focus:outline-none focus:border-[#1E4DB7] resize-none h-24 leading-relaxed" defaultValue="77777777777777"></textarea>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-center pt-2">
                                        <Button className="px-14 py-2.5 text-sm rounded-xl font-bold shadow-md bg-[#1E4DB7] hover:bg-blue-800">׳©׳׳— ׳₪׳ ׳™׳™׳”</Button>
                                    </div>
                                </div>
                            )}

                            {/* --- TAB: CHAT (Placeholder) --- */}
                            {activeTab === 'chat' && (
                                <div className="h-64 flex flex-col items-center justify-center opacity-60">
                                    <Icon name="chat" className="w-16 h-16 text-gray-300 mb-4" />
                                    <h3 className="text-xl font-bold text-gray-400">׳׳–׳•׳¨ ׳¦'׳׳˜ ׳‘׳”׳§׳׳”</h3>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        };


        // --- UNIFIED TICKET LIST COMPONENT ---
        const TicketListView = ({ title, description, showToggle = false, isExternal = false, viewType = 'default' }) => {
            const [toggleState, setToggleState] = useState('received'); // 'received' or 'sent'
            const [selectedTicket, setSelectedTicket] = useState(null); // ׳ ׳™׳”׳•׳ ׳”׳₪׳•׳₪-׳׳₪
            
            // Advanced Filters State
            const [searchBy, setSearchBy] = useState({ label: '׳׳¡׳₪׳¨ ׳₪׳ ׳™׳”', iconText: '#' });
            const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
            
            const [sortBy, setSortBy] = useState('׳׳¡׳₪׳¨ ׳₪׳ ׳™׳™׳” ג†‘ג†“');
            const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
            
            const [priorityFilter, setPriorityFilter] = useState('׳‘׳—׳¨ ׳“׳—׳™׳₪׳•׳×');
            const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);

            // Filter Options
            const searchOptions = [
                { label: '׳׳¡׳₪׳¨ ׳₪׳ ׳™׳”', iconText: '#' },
                { label: '׳©׳ ׳׳§׳•׳—', iconName: 'user' },
                { label: '׳׳¡ ׳˜׳׳₪׳•׳', iconName: 'phone' },
                { label: '׳’׳•׳¨׳ ׳׳˜׳₪׳', iconName: 'search' },
                { label: '׳.׳ ׳©׳ ׳׳§׳•׳—', iconName: 'search' },
                { label: '׳˜׳׳₪׳•׳ ׳׳™׳¦׳™׳¨׳× ׳§׳©׳¨', iconName: 'phone' }
            ];

            const sortOptions = [
                { label: '׳׳¡׳₪׳¨ ׳₪׳ ׳™׳™׳”', sortType: 'up', iconName: 'arrowUpStraight' },
                { label: '׳׳¡׳₪׳¨ ׳₪׳ ׳™׳™׳”', sortType: 'down', iconName: 'arrowDownStraight' },
                { label: '׳—׳“׳© ׳™׳•׳×׳¨', iconName: 'calendar' },
                { label: '׳™׳©׳ ׳™׳•׳×׳¨', iconName: 'calendar' }
            ];

            const priorityOptions = ['׳‘׳—׳¨ ׳“׳—׳™׳₪׳•׳×', '׳“׳—׳™׳₪׳•׳× ׳’׳‘׳•׳”׳”', '׳“׳—׳™׳₪׳•׳× ׳‘׳™׳ ׳•׳ ׳™׳×', '׳“׳—׳™׳₪׳•׳× ׳ ׳׳•׳›׳”'];
            
            const closeAllDropdowns = () => {
                setSearchDropdownOpen(false);
                setSortDropdownOpen(false);
                setPriorityDropdownOpen(false);
            };

            const items = isExternal ? [
                { id: 'M-16-338...', priority: '׳ ׳׳•׳›׳”-3', name: '׳¢׳˜׳™׳” ׳ ׳”׳•׳¨׳׳™', room: '44444444444', phone: '׳׳ ׳–׳׳™׳', date: '12 ׳‘׳™׳•׳ ׳™ 2026' },
            ] : [
                { id: 'M-16-338...', priority: '׳ ׳׳•׳›׳”-3', name: '׳¢׳˜׳™׳” ׳ ׳”׳•׳¨׳׳™', room: '44444444444', phone: '׳׳ ׳–׳׳™׳', date: '12 ׳‘׳™׳•׳ ׳™ 2026' },
                { id: '26T3933', priority: '׳ ׳׳•׳›׳”-3', name: '׳¢׳˜׳™׳” ׳ ׳”׳•׳¨׳׳™', room: '555345345', phone: '׳׳ ׳–׳׳™׳', date: '11 ׳‘׳™׳•׳ ׳™ 2026' },
                { id: 'A-22-192...', priority: '׳’׳‘׳•׳”׳”-1', name: '׳׳©׳” ׳›׳”׳', room: '33333333333', phone: '050-1234567', date: '10 ׳‘׳™׳•׳ ׳™ 2026' },
                { id: 'B-88-123...', priority: '׳ ׳׳•׳›׳”-3', name: '׳“׳ ׳” ׳׳•׳™', room: '22222222222', phone: '054-9876543', date: '09 ׳‘׳™׳•׳ ׳™ 2026' },
                { id: 'C-44-555...', priority: '׳’׳‘׳•׳”׳”-1', name: '׳¨׳•׳¢׳™ ׳©׳׳©', room: '11111111111', phone: '׳׳ ׳–׳׳™׳', date: '08 ׳‘׳™׳•׳ ׳™ 2026' },
            ];

            return (
                <div className="p-5 h-full flex flex-col wave-bg min-h-0 relative">
                    
                    {/* Global overlay to close dropdowns */}
                    {(searchDropdownOpen || sortDropdownOpen || priorityDropdownOpen) && (
                        <div className="fixed inset-0 z-30" onClick={closeAllDropdowns}></div>
                    )}

                    <div className="mb-5 shrink-0 relative z-10">
                        <h1 className="text-[28px] font-black text-[#1E3A8A] mb-2 tracking-tight">{title}</h1>
                        <p className="text-sm font-semibold text-[#1E4DB7]">{description}</p>
                        
                        {showToggle && (
                            <div className="absolute top-0 left-0 bg-[#E5E7EB] p-1 rounded-full flex relative shadow-inner w-[240px]">
                                <div 
                                    className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-sm transition-transform duration-300 ease-out"
                                    style={{
                                        transform: toggleState === 'received' ? 'translateX(0)' : 'translateX(-100%)',
                                        right: '4px'
                                    }}
                                ></div>
                                
                                <button 
                                    onClick={() => setToggleState('received')}
                                    className={`flex-1 relative z-10 py-1.5 text-xs font-bold transition-colors duration-300 ${toggleState === 'received' ? 'text-[#1E4DB7]' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    ׳₪׳ ׳™׳•׳× ׳©׳”׳×׳§׳‘׳׳•
                                </button>
                                <button 
                                    onClick={() => setToggleState('sent')}
                                    className={`flex-1 relative z-10 py-1.5 text-xs font-bold transition-colors duration-300 ${toggleState === 'sent' ? 'text-[#1E4DB7]' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    ׳₪׳ ׳™׳•׳× ׳©׳ ׳©׳׳—׳•
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center mb-3 gap-4 shrink-0 relative z-40">
                        {/* RIGHT SIDE: Search Input + Dropdown */}
                        <div className="flex-1 flex bg-white border border-gray-200 shadow-sm rounded-lg max-w-xl relative transition-colors focus-within:border-[#1E4DB7]">
                            <div className="relative border-l border-gray-200">
                                <button 
                                    onClick={() => {closeAllDropdowns(); setSearchDropdownOpen(!searchDropdownOpen);}} 
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-r-lg h-full"
                                    title={searchBy.label}
                                >
                                    {searchBy.iconText ? (
                                        <span className="text-[#1E4DB7] bg-blue-50 px-1 py-0.5 rounded text-[11px] leading-none">{searchBy.iconText}</span>
                                    ) : (
                                        <Icon name={searchBy.iconName} className="w-3.5 h-3.5 text-[#1E4DB7]" />
                                    )}
                                    {searchBy.label.length > 20 ? searchBy.label.substring(0, 20) + '...' : searchBy.label}
                                    <Icon name="chevronDown" className="w-3 h-3 text-gray-400" />
                                </button>
                                
                                {searchDropdownOpen && (
                                    <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 max-h-48 overflow-y-auto custom-scrollbar">
                                        {searchOptions.map(opt => {
                                            const displayText = opt.label.length > 20 ? opt.label.substring(0, 20) + '...' : opt.label;
                                            return (
                                                <button 
                                                    key={opt.label} 
                                                    onClick={() => { setSearchBy(opt); closeAllDropdowns(); }} 
                                                    className="w-full text-right px-4 py-2 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-[#1E4DB7] flex items-center gap-2"
                                                    title={opt.label}
                                                >
                                                    {opt.iconText ? (
                                                        <span className="text-gray-400 font-black">{opt.iconText}</span>
                                                    ) : (
                                                        <Icon name={opt.iconName} className="w-3.5 h-3.5 text-gray-400" />
                                                    )}
                                                    {displayText}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 relative">
                                <input 
                                    className="w-full h-full bg-transparent py-2 px-3 pl-8 text-sm focus:outline-none text-gray-700 font-semibold" 
                                    placeholder={`׳—׳₪׳© ׳¢׳ ׳™׳“׳™ ${searchBy.label}...`} 
                                />
                                <Icon name="search" className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
                            </div>
                        </div>
                        
                        {/* LEFT SIDE: Sort & Filter */}
                        <div className="flex gap-3">
                            <div className="relative">
                                <button 
                                    onClick={() => {closeAllDropdowns(); setSortDropdownOpen(!sortDropdownOpen);}} 
                                    className="bg-white border border-gray-200 shadow-sm rounded-lg px-4 py-2 text-xs font-bold text-gray-700 flex items-center gap-2 hover:bg-gray-50 transition-colors h-full"
                                >
                                    <Icon name="arrowDownUp" className="w-3.5 h-3.5 text-gray-500" />
                                    {sortBy} 
                                    <Icon name="chevronDown" className="w-3 h-3 text-gray-400" />
                                </button>
                                {sortDropdownOpen && (
                                    <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
                                        {sortOptions.map((opt, idx) => (
                                            <button 
                                                key={idx} 
                                                onClick={() => { setSortBy(opt.sortType ? `${opt.label} ${opt.sortType==='up'?'ג†‘':'ג†“'}` : opt.label); closeAllDropdowns(); }} 
                                                className="w-full text-right px-4 py-2 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-[#1E4DB7] flex items-center gap-2"
                                            >
                                                <Icon name={opt.iconName} className="w-3.5 h-3.5 text-gray-400" />
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <button 
                                    onClick={() => {closeAllDropdowns(); setPriorityDropdownOpen(!priorityDropdownOpen);}} 
                                    className="bg-white border border-gray-200 shadow-sm rounded-lg px-4 py-2 text-xs font-bold text-gray-700 flex items-center gap-2 hover:bg-gray-50 transition-colors h-full"
                                >
                                    <Icon name="filter" className="w-3.5 h-3.5 text-gray-500" />
                                    {priorityFilter} 
                                    <Icon name="chevronDown" className="w-3 h-3 text-gray-400" />
                                </button>
                                {priorityDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
                                        {priorityOptions.map(opt => (
                                            <button 
                                                key={opt} 
                                                onClick={() => { setPriorityFilter(opt); closeAllDropdowns(); }} 
                                                className="w-full text-right px-4 py-2 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-[#1E4DB7]"
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-2.5">
                        {items.length > 0 ? items.map((task, i) => (
                            <div key={i} className="bg-white border border-gray-200 rounded-xl p-2.5 flex items-center shadow-sm hover:shadow-md transition">
                                <div className="flex items-center gap-3 w-56 pr-1 shrink-0">
                                    <div className="bg-[#EFF6FF] text-brand-mainBlue p-1.5 rounded-lg font-extrabold flex items-center justify-center w-7 h-7 shrink-0">
                                        <span className="text-xs">#</span>
                                    </div>
                                    <span className="font-bold text-gray-800 text-xs truncate w-24">{task.id}</span>
                                    <Badge type={task.priority.includes('׳ ׳׳•׳›׳”') ? 'low' : 'high'}>{task.priority}</Badge>
                                </div>
                                <div className="flex items-center justify-between flex-1 text-[11px] font-bold text-gray-600 px-4">
                                    <div className="flex items-center gap-2 w-1/4">
                                        <div className="bg-[#EFF6FF] p-1.5 rounded-lg shrink-0"><Icon name="user" className="w-3 h-3 text-brand-mainBlue"/></div>
                                        <span className="truncate">{task.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 w-1/4">
                                        <div className="bg-[#EFF6FF] p-1.5 rounded-lg shrink-0"><Icon name="location" className="w-3 h-3 text-brand-mainBlue"/></div>
                                        <span className="truncate">{task.room}</span>
                                    </div>
                                    <div className="flex items-center gap-2 w-1/4">
                                        <div className="bg-[#EFF6FF] p-1.5 rounded-lg shrink-0"><Icon name="phone" className="w-3 h-3 text-brand-mainBlue"/></div>
                                        <span className="truncate">{task.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 w-1/4">
                                        <div className="bg-[#EFF6FF] p-1.5 rounded-lg shrink-0"><Icon name="calendar" className="w-3 h-3 text-brand-mainBlue"/></div>
                                        <span className="whitespace-nowrap">{task.date}</span>
                                    </div>
                                </div>
                                
                                <div className="pl-1 shrink-0 flex items-center gap-2">
                                    {viewType === 'open' && (
                                        <button className="bg-green-500 text-white p-2 rounded-lg shadow-sm hover:bg-green-600 transition" title="׳¡׳’׳•׳¨ ׳₪׳ ׳™׳™׳”">
                                            <Icon name="check" className="w-4 h-4" />
                                        </button>
                                    )}
                                    {viewType === 'external' && toggleState === 'received' && (
                                        <React.Fragment>
                                            <button className="bg-red-500 text-white p-2 rounded-lg shadow-sm hover:bg-red-600 transition" title="׳“׳—׳” ׳₪׳ ׳™׳™׳”">
                                                <Icon name="close" className="w-4 h-4" />
                                            </button>
                                            <button className="bg-green-500 text-white p-2 rounded-lg shadow-sm hover:bg-green-600 transition" title="׳§׳‘׳ ׳₪׳ ׳™׳™׳”">
                                                <Icon name="check" className="w-4 h-4" />
                                            </button>
                                        </React.Fragment>
                                    )}
                                    {viewType === 'external' && toggleState === 'sent' && (
                                        <button className="bg-red-500 text-white p-2 rounded-lg shadow-sm hover:bg-red-600 transition" title="׳‘׳˜׳ ׳₪׳ ׳™׳™׳”">
                                            <Icon name="close" className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setSelectedTicket(task)}
                                        className="bg-[#1E3A8A] text-white p-2 rounded-lg shadow-sm hover:bg-blue-800 transition" 
                                        title="׳¦׳₪׳” ׳‘׳₪׳ ׳™׳™׳”"
                                    >
                                        <Icon name="eye" className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center h-full opacity-50">
                                <Icon name="filePlus" className="w-10 h-10 text-gray-400 mb-2" />
                                <p className="text-gray-500 font-bold text-sm">׳׳™׳ ׳ ׳×׳•׳ ׳™׳ ׳׳”׳¦׳’׳”</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200 flex justify-center items-center gap-4 shrink-0">
                         <button className="bg-white border border-gray-200 text-gray-600 px-4 py-1.5 rounded-lg shadow-sm text-xs font-bold hover:bg-gray-50 hover:text-brand-mainBlue transition">
                             ׳”׳‘׳ &lt;
                         </button>
                         <div className="bg-white border border-gray-200 text-gray-700 px-8 py-1.5 rounded-lg shadow-sm text-xs font-bold">
                             ׳¢׳׳•׳“ 1 ׳׳×׳•׳ 4
                         </div>
                         <button className="bg-white border border-gray-200 text-gray-600 px-4 py-1.5 rounded-lg shadow-sm text-xs font-bold hover:bg-gray-50 hover:text-brand-mainBlue transition">
                             &gt; ׳§׳•׳“׳
                         </button>
                    </div>

                    {selectedTicket && (
                        <TicketModal 
                            ticket={selectedTicket} 
                            viewType={viewType} 
                            onClose={() => setSelectedTicket(null)} 
                        />
                    )}
                </div>
            );
        };


        // --- SYSTEM SETTINGS VIEW ---
        const SettingsView = () => {
            const [activeFields, setActiveFields] = useState([
                { id: 1, title: '׳“׳—׳™׳₪׳•׳×', val: '׳¨׳׳× ׳“׳—׳™׳₪׳•׳× ׳”׳₪׳ ׳™׳™׳”', icon: 'chevronDown', type: 'select', required: true, locked: true },
                { id: 2, title: '׳’׳•׳¨׳ ׳׳˜׳₪׳', val: '׳”׳›׳ ׳¡/׳™ ׳’׳•׳¨׳ ׳׳˜׳₪׳', icon: 'chevronDown', type: 'select', required: true, locked: true },
                { id: 3, title: '׳.׳ ׳©׳ ׳׳§׳•׳—', val: '׳”׳›׳ ׳¡/׳™ ׳.׳ ׳©׳ ׳׳§׳•׳—', type: 'short_text', required: true, locked: true },
                { id: 4, title: '׳׳•׳₪׳ ׳˜׳™׳₪׳•׳ ׳‘׳₪׳ ׳™׳™׳”', val: '׳׳•׳₪׳ ׳˜׳™׳₪׳•׳ ׳‘׳₪׳ ׳™׳™׳”', type: 'free_text', required: true, locked: true },
                { id: 5, title: '׳×׳™׳׳•׳¨ ׳”׳×׳§׳׳”', val: '׳×׳™׳׳•׳¨ ׳”׳×׳§׳׳”', type: 'free_text', required: true, locked: true },
                { id: 6, title: '׳׳™׳§׳•׳', val: '׳‘׳”׳×׳”׳•׳•׳×', type: 'short_text', required: false, locked: false, dashed: true }
            ]);

            const [editingField, setEditingField] = useState(null);
            const [isDropdownOpen, setIsDropdownOpen] = useState(false);
            const [draggedItemId, setDraggedItemId] = useState(null);

            const handleFieldTypeClick = (type) => {
                const typeMap = {
                    'free_text': { title: '׳˜׳§׳¡׳˜ ׳—׳•׳₪׳©׳™ ׳—׳“׳©', val: '׳׳“׳•׳’׳׳: ׳×׳™׳׳•׳¨ ׳₪׳ ׳™׳™׳”, ׳“׳¨׳ ׳₪׳×׳¨׳•׳...', icon: null },
                    'select': { title: '׳‘׳—׳™׳¨׳× ׳׳₪׳©׳¨׳•׳× ׳—׳“׳©׳”', val: '׳׳“׳•׳’׳׳: ׳¨׳©׳™׳׳× ׳™׳—׳™׳“׳•׳×...', icon: 'chevronDown', options: ['׳׳₪׳©׳¨׳•׳× 1', '׳׳₪׳©׳¨׳•׳× 2'] },
                    'short_text': { title: '׳˜׳§׳¡׳˜ ׳§׳¦׳¨ ׳—׳“׳©', val: '׳׳“׳•׳’׳׳: ׳©׳ ׳₪׳¨׳˜׳™, ׳©׳ ׳׳©׳₪׳—׳”...', icon: null }
                };
                
                setEditingField({
                    id: Date.now(), 
                    isNew: true,
                    type: type,
                    title: typeMap[type].title,
                    val: typeMap[type].val,
                    required: false,
                    locked: false,
                    icon: typeMap[type].icon,
                    options: typeMap[type].options || []
                });
                setIsDropdownOpen(false);
            };

            const handleEditExisting = (field) => {
                const options = field.options || (field.type === 'select' ? ['׳׳₪׳©׳¨׳•׳× ׳׳“׳•׳’׳׳'] : []);
                setEditingField({ ...field, isNew: false, options });
                setIsDropdownOpen(false);
            };

            const handleSave = () => {
                if (!editingField) return;
                
                if (editingField.isNew) {
                    const newField = { ...editingField, dashed: false };
                    delete newField.isNew;
                    setActiveFields([...activeFields, newField]);
                } else {
                    setActiveFields(activeFields.map(f => f.id === editingField.id ? { ...editingField } : f));
                }
                setEditingField(null);
            };

            const handleDelete = () => {
                if (!editingField || editingField.locked || editingField.isNew) return;
                setActiveFields(activeFields.filter(f => f.id !== editingField.id));
                setEditingField(null);
            };

            const updateOption = (idx, val) => {
                const newOptions = [...editingField.options];
                newOptions[idx] = val;
                setEditingField({ ...editingField, options: newOptions });
            };

            const addOption = () => {
                setEditingField({ ...editingField, options: [...editingField.options, `׳׳₪׳©׳¨׳•׳× ${editingField.options.length + 1}`] });
            };

            const removeOption = (idx) => {
                const newOptions = editingField.options.filter((_, i) => i !== idx);
                setEditingField({ ...editingField, options: newOptions });
            };

            // Drag and drop handlers
            const handleDragStart = (e, id) => {
                setDraggedItemId(id);
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => {
                    e.target.classList.add('opacity-40');
                }, 0);
            };

            const handleDragEnd = (e) => {
                e.target.classList.remove('opacity-40');
                setDraggedItemId(null);
            };

            const handleDragOver = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            };

            const handleDrop = (e, targetId) => {
                e.preventDefault();
                if (draggedItemId === null || draggedItemId === targetId) return;
                
                const oldIndex = activeFields.findIndex(f => f.id === draggedItemId);
                const newIndex = activeFields.findIndex(f => f.id === targetId);
                
                const newFields = [...activeFields];
                const [movedItem] = newFields.splice(oldIndex, 1);
                newFields.splice(newIndex, 0, movedItem);
                
                setActiveFields(newFields);
            };

            return (
                <div className="p-8 h-full flex flex-col min-h-0 wave-bg overflow-hidden">
                    <div className="mb-8 shrink-0">
                        <h1 className="text-[28px] font-black text-[#1E3A8A] mb-2 tracking-tight">׳”׳’׳“׳¨׳•׳× ׳׳¢׳¨׳›׳× - ׳׳ ׳“׳™׳™</h1>
                        <p className="text-sm font-semibold text-[#1E4DB7]">
                            ׳‘׳¢׳׳•׳“ ׳–׳” ׳ ׳™׳×׳ ׳׳¢׳¨׳•׳ ׳׳× ׳”׳©׳“׳•׳× ׳•׳”׳׳•׳₪׳™ ׳©׳׳₪׳™׳• ׳”׳—׳“׳¨ ׳׳×׳ ׳”׳. ׳§׳™׳™׳׳™׳ ׳‘׳¨׳©׳•׳×׳ <span className="text-purple-600 font-bold">3 ׳¡׳•׳’׳™׳</span> ׳©׳•׳ ׳™׳ ׳©׳ ׳©׳“׳•׳×.
                        </p>
                    </div>

                    <div className="flex-1 flex gap-8 min-h-0 pb-6">
                        
                        {/* Right Column: Field Types */}
                        <div className="flex flex-col gap-6 w-[25%] shrink-0 pt-4">
                            <div className="flex flex-col relative group cursor-pointer" onClick={() => handleFieldTypeClick('free_text')}>
                                <span className="text-center font-bold text-gray-700 text-sm mb-2">׳˜׳§׳¡׳˜ ׳—׳•׳₪׳©׳™</span>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50/50 h-[80px] flex items-center justify-center text-gray-400 text-xs shadow-sm transition hover:border-[#1E4DB7] hover:bg-blue-50/50 hover:text-gray-600">
                                    ׳׳“׳•׳’׳׳: ׳×׳™׳׳•׳¨ ׳₪׳ ׳™׳™׳”, ׳“׳¨׳ ׳₪׳×׳¨׳•׳...
                                </div>
                            </div>
                            
                            <div className="flex flex-col relative mt-2 group cursor-pointer" onClick={() => handleFieldTypeClick('select')}>
                                <span className="text-center font-bold text-gray-700 text-sm mb-2">׳‘׳—׳™׳¨׳× ׳׳₪׳©׳¨׳•׳×</span>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50/50 h-[80px] flex items-center justify-between text-gray-400 text-xs shadow-sm transition hover:border-[#1E4DB7] hover:bg-blue-50/50 hover:text-gray-600">
                                    <span>׳׳“׳•׳’׳׳: ׳¨׳©׳™׳׳× ׳¨׳©׳•׳™׳•׳×,׳™׳—׳™׳“׳•׳×...</span>
                                    <Icon name="chevronDown" className="w-4 h-4 text-gray-400 group-hover:text-[#1E4DB7] transition-colors"/>
                                </div>
                            </div>
                            
                            <div className="flex flex-col relative mt-2 group cursor-pointer" onClick={() => handleFieldTypeClick('short_text')}>
                                <span className="text-center font-bold text-gray-700 text-sm mb-2">׳˜׳§׳¡׳˜ ׳§׳¦׳¨</span>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50/50 h-[80px] flex items-center justify-center text-gray-400 text-xs shadow-sm transition hover:border-[#1E4DB7] hover:bg-blue-50/50 hover:text-gray-600">
                                    ׳׳“׳•׳’׳׳: ׳©׳ ׳₪׳¨׳˜׳™, ׳©׳ ׳׳©׳₪׳—׳”...
                                </div>
                            </div>
                        </div>

                        {/* Center Column: Template & Graphics */}
                        <div className="flex flex-col w-[30%] shrink-0 px-2 pt-4">
                            {!editingField ? (
                                <React.Fragment>
                                    <span className="text-center font-bold text-gray-700 text-sm mb-2">׳‘׳—׳¨׳• ׳×׳‘׳ ׳™׳×</span>
                                    <div className="border border-yellow-400 rounded-xl p-4 bg-yellow-50/30 h-[100px] mb-4 relative shadow-sm cursor-default">
                                        <div className="absolute top-2 right-4 text-[10px] text-gray-400 font-bold">׳›׳•׳×׳¨׳×</div>
                                        <div className="text-gray-400 text-sm mt-4 text-center">׳׳—׳¦׳• ׳¢׳ ׳©׳“׳” ׳׳™׳׳™׳ ׳›׳“׳™ ׳׳¢׳¨׳•׳ ׳׳•׳×׳•...</div>
                                    </div>
                                </React.Fragment>
                            ) : (
                                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-3.5 flex flex-col gap-3 relative animate-fade-in mx-auto w-full max-w-[320px] mb-4 h-[230px] justify-between">
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-2 shrink-0">
                                        <h4 className="font-bold text-[#1E4DB7] text-sm">
                                            {editingField.isNew ? '׳”׳’׳“׳¨׳× ׳©׳“׳” ׳—׳“׳©' : '׳¢׳¨׳™׳›׳× ׳©׳“׳” ׳₪׳¢׳™׳'}
                                        </h4>
                                        <button onClick={() => setEditingField(null)} className="text-gray-400 hover:text-gray-600 bg-gray-50 p-1 rounded-md transition"><Icon name="close" className="w-3.5 h-3.5" /></button>
                                    </div>

                                    <div className="flex flex-col gap-2 relative bg-gray-50/30 p-3 rounded-xl border border-gray-100 flex-1">
                                        <div className="flex items-center justify-between gap-2 group mb-1">
                                            <div className="flex items-center flex-1">
                                                <input
                                                    className="font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#1E4DB7] outline-none text-sm w-full transition-colors cursor-text"
                                                    value={editingField.title}
                                                    onChange={(e) => setEditingField({...editingField, title: e.target.value})}
                                                    placeholder="׳”׳›׳ ׳¡ ׳©׳ ׳©׳“׳”..."
                                                />
                                                {editingField.required && <span className="text-red-500 font-bold ml-1 text-xs">*</span>}
                                            </div>
                                            
                                            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-100 shrink-0">
                                                <span className="text-[10px] font-bold text-gray-600">׳—׳•׳‘׳”?</span>
                                                <div 
                                                    className={`w-7 h-4 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${editingField.required ? 'bg-[#1E4DB7]' : 'bg-gray-300'}`} 
                                                    onClick={() => setEditingField({...editingField, required: !editingField.required})}
                                                >
                                                    <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform ${editingField.required ? '-translate-x-3' : 'translate-x-0'}`}></div>
                                                </div>
                                            </div>
                                        </div>

                                        {editingField.type === 'short_text' && (
                                            <input
                                                className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-[#1E4DB7] transition-all hover:border-[#1E4DB7] shadow-sm"
                                                value={editingField.val}
                                                onChange={(e) => setEditingField({...editingField, val: e.target.value})}
                                                placeholder="׳”׳›׳ ׳¡ ׳˜׳§׳¡׳˜ ׳׳ ׳—׳” (Placeholder)..."
                                            />
                                        )}

                                        {editingField.type === 'free_text' && (
                                            <textarea
                                                className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-[#1E4DB7] transition-all hover:border-[#1E4DB7] resize-none h-14 shadow-sm"
                                                value={editingField.val}
                                                onChange={(e) => setEditingField({...editingField, val: e.target.value})}
                                                placeholder="׳”׳›׳ ׳¡ ׳˜׳§׳¡׳˜ ׳׳ ׳—׳” (Placeholder)..."
                                            />
                                        )}

                                        {editingField.type === 'select' && (
                                            <div className="relative">
                                                <div className="flex items-center relative border border-gray-200 rounded-lg bg-white shadow-sm hover:border-[#1E4DB7] transition-colors focus-within:border-[#1E4DB7]">
                                                    <input
                                                        className="w-full bg-transparent py-2 pr-3 pl-8 text-xs outline-none placeholder-gray-400"
                                                        value={editingField.val}
                                                        onChange={(e) => setEditingField({...editingField, val: e.target.value})}
                                                        placeholder="׳˜׳§׳¡׳˜ ׳׳ ׳—׳” (Placeholder)..."
                                                    />
                                                    <button
                                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                        className="absolute left-0 top-0 bottom-0 px-2 flex items-center justify-center text-gray-400 hover:text-[#1E4DB7] hover:bg-gray-50 rounded-l-lg border-r border-transparent"
                                                    >
                                                        <Icon name="chevronDown" className={`w-3 h-3 transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                                    </button>
                                                </div>

                                                {isDropdownOpen && (
                                                    <div className="absolute top-full right-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-1.5 flex flex-col gap-1 max-h-32 overflow-y-auto">
                                                        {editingField.options.map((opt, i) => (
                                                            <div key={i} className="flex items-center gap-1 bg-gray-50 hover:bg-gray-100 p-1 rounded-md group transition-colors">
                                                                <input
                                                                    className="flex-1 bg-transparent border-b border-transparent focus:border-[#1E4DB7] text-xs outline-none px-1 py-0.5 text-gray-700"
                                                                    value={opt}
                                                                    onChange={(e) => updateOption(i, e.target.value)}
                                                                    placeholder={`׳׳₪׳©׳¨׳•׳× ${i + 1}...`}
                                                                />
                                                                <button onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-white shadow-sm transition-all">
                                                                    <Icon name="trash" className="w-3.5 h-3.5"/>
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <button onClick={addOption} className="text-[#1E4DB7] text-[10px] font-bold flex items-center justify-center gap-1 p-1.5 hover:bg-blue-50 rounded-md mt-0.5 border border-dashed border-blue-200">
                                                            <Icon name="filePlus" className="w-3 h-3" /> ׳”׳•׳¡׳£ ׳׳₪׳©׳¨׳•׳× ׳‘׳—׳™׳¨׳”
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100 shrink-0">
                                        <Button onClick={handleSave} className="flex-1 text-xs py-1.5 shadow-sm">׳©׳׳•׳¨ ׳©׳“׳” ׳₪׳¢׳™׳</Button>
                                        {!editingField.isNew && !editingField.locked && (
                                            <Button variant="outline" onClick={handleDelete} className="text-red-500 border-red-200 hover:bg-red-50 px-2.5 py-1.5 shadow-sm" title="׳׳—׳§ ׳©׳“׳”">
                                                <Icon name="trash" className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 flex items-center justify-center relative opacity-90">
                                <svg viewBox="0 0 300 200" className="w-full h-auto max-h-[180px]">
                                    <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                                        <path d="M50,150 L250,150 L250,152 L50,152 Z" fill="#9CA3AF" />
                                        <g transform="translate(100, 100) rotate(15)">
                                            <path d="M45.6,22.2l3.4-11.8L37.2,7l-3.4,11.8c-2.3-0.9-4.8-1.5-7.4-1.8L24.5,5.2H12.1 l-1.9,11.8c-2.6,0.3-5.1,0.9-7.4,1.8L-0.6,7l-11.8,3.4l3.4,11.8c-1.8,1.7-3.4,3.6-4.8,5.7l-11.4-4.5L-31,34.1l11.4,4.5 c-0.8,2.5-1.3,5.1-1.5,7.8l-11.9,1.5v12.4l11.9,1.5c0.3,2.7,0.8,5.3,1.5,7.8L-31,74.1l5.8,10.7l11.4-4.5c1.4,2.1,3,4,4.8,5.7 l-3.4,11.8L-0.6,101l3.4-11.8c2.3,0.9,4.8,1.5,7.4,1.8l1.9,11.8h12.4l1.9-11.8c2.6-0.3,5.1-0.9,7.4-1.8L37.2,101l11.8-3.4 l-3.4-11.8c1.8-1.7,3.4-3.6,4.8-5.7l11.4,4.5L67.6,74.1l-11.4-4.5c0.8-2.5,1.3-5.1,1.5-7.8l11.9-1.5V47.9l-11.9-1.5 c-0.3-2.7-0.8-5.3-1.5-7.8l11.4-4.5L61.8,23.4l-11.4,4.5C49,25.8,47.4,23.9,45.6,22.2z M18.3,66.6c-8.6,0-15.6-7-15.6-15.6 s7-15.6,15.6-15.6s15.6,7,15.6,15.6S26.9,66.6,18.3,66.6z" fill="#1E4DB7"/>
                                        </g>
                                        <g transform="translate(180, 70) rotate(-10) scale(0.6)">
                                            <path d="M45.6,22.2l3.4-11.8L37.2,7l-3.4,11.8c-2.3-0.9-4.8-1.5-7.4-1.8L24.5,5.2H12.1 l-1.9,11.8c-2.6,0.3-5.1,0.9-7.4,1.8L-0.6,7l-11.8,3.4l3.4,11.8c-1.8,1.7-3.4,3.6-4.8,5.7l-11.4-4.5L-31,34.1l11.4,4.5 c-0.8,2.5-1.3,5.1-1.5,7.8l-11.9,1.5v12.4l11.9,1.5c0.3,2.7,0.8,5.3,1.5,7.8L-31,74.1l5.8,10.7l11.4-4.5c1.4,2.1,3,4,4.8,5.7 l-3.4,11.8L-0.6,101l3.4-11.8c2.3,0.9,4.8,1.5,7.4,1.8l1.9,11.8h12.4l1.9-11.8c2.6-0.3,5.1-0.9,7.4-1.8L37.2,101l11.8-3.4 l-3.4-11.8c1.8-1.7,3.4-3.6,4.8-5.7l11.4,4.5L67.6,74.1l-11.4-4.5c0.8-2.5,1.3-5.1,1.5-7.8l11.9-1.5V47.9l-11.9-1.5 c-0.3-2.7-0.8-5.3-1.5-7.8l11.4-4.5L61.8,23.4l-11.4,4.5C49,25.8,47.4,23.9,45.6,22.2z M18.3,66.6c-8.6,0-15.6-7-15.6-15.6 s7-15.6,15.6-15.6s15.6,7,15.6,15.6S26.9,66.6,18.3,66.6z" fill="#9CA3AF"/>
                                        </g>
                                        <g fill="#4B5563">
                                            <circle cx="70" cy="115" r="5" />
                                            <rect x="67" y="122" width="6" height="28" rx="2" />
                                            <circle cx="165" cy="55" r="5" />
                                            <rect x="162" y="62" width="6" height="20" rx="2" />
                                        </g>
                                    </g>
                                </svg>
                            </div>
                        </div>

                        {/* Left Column: Active Fields */}
                        <div className="flex-1 flex flex-col relative pl-4 min-h-0">
                            <div className="flex justify-between items-start mb-4 shrink-0 z-10 bg-[#F4F5FA] pb-2">
                                <h3 className="font-bold text-lg text-gray-800">׳©׳“׳•׳× ׳₪׳¢׳™׳׳™׳</h3>
                                <div className="flex flex-col gap-2 items-end text-xs font-bold text-gray-700">
                                    <div className="flex items-center gap-1.5">
                                        <span className="mt-0.5">׳׳•׳’׳‘׳ ׳ {activeFields.length}/10</span>
                                        <Icon name="volume" className="w-4 h-4 text-gray-500"/>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[#1E4DB7] cursor-pointer hover:underline">
                                        <span className="mt-0.5">׳‘׳™׳˜׳•׳ ׳©׳™׳•׳ ׳׳™׳©׳™</span>
                                        <Icon name="user" className="w-4 h-4"/>
                                    </div>
                                </div>
                            </div>

                            <div className="relative flex-1 min-h-0">
                                <div className="absolute inset-0 overflow-y-auto pr-2 pb-10 space-y-4 z-10 custom-scrollbar">
                                    <div className="absolute right-[19px] top-0 bottom-0 w-0.5 bg-gray-200 z-0"></div>
                                    
                                    {activeFields.map((field, index) => {
                                        const isEditingThis = editingField && editingField.id === field.id;
                                        
                                        return (
                                            <div 
                                                key={field.id} 
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, field.id)}
                                                onDragEnd={handleDragEnd}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, field.id)}
                                                className="flex gap-4 items-center group relative z-10 cursor-grab active:cursor-grabbing"
                                                title="׳’׳¨׳•׳¨ ׳›׳“׳™ ׳׳©׳ ׳•׳× ׳¡׳“׳¨"
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm transition-colors ${isEditingThis ? 'bg-[#1E4DB7] text-white border-transparent' : 'bg-white border border-gray-300 text-gray-600 group-hover:border-[#1E4DB7]'}`}>
                                                    {index + 1}
                                                </div>
                                                
                                                <div 
                                                    onClick={() => handleEditExisting(field)} 
                                                    className={`flex-1 border ${field.dashed ? 'border-dashed border-gray-300 bg-transparent' : 'border-gray-200 bg-[#FCFCFD] shadow-sm'} rounded-xl p-3 flex justify-between items-center transition-all ${isEditingThis ? 'ring-2 ring-[#1E4DB7] border-transparent' : 'hover:border-[#1E4DB7]'}`}
                                                >
                                                    <div className="absolute right-[-24px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Icon name="grip" className="w-4 h-4 text-gray-400" />
                                                    </div>

                                                    {field.locked && (
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400">
                                                            ׳׳ ׳ ׳™׳×׳ ׳׳׳—׳•׳§
                                                        </div>
                                                    )}

                                                    <div className="flex flex-col justify-center w-full text-right pr-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-sm font-bold ${field.dashed ? 'text-gray-500' : (isEditingThis ? 'text-[#1E4DB7]' : 'text-gray-800')}`}>{field.title}</span>
                                                            {field.required && <span className="text-[10px] bg-red-50 text-red-500 font-bold px-1.5 py-0.5 rounded">׳—׳•׳‘׳”</span>}
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-1 font-semibold truncate max-w-[70%]">{field.val}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    
                                    {activeFields.length === 0 && (
                                        <div className="text-center text-gray-400 text-sm py-10 font-bold bg-white rounded-xl border border-dashed border-gray-300 relative z-10 mr-12">
                                            ׳׳™׳ ׳©׳“׳•׳× ׳₪׳¢׳™׳׳™׳. ׳¦׳¨׳• ׳©׳“׳•׳× ׳׳”׳×׳₪׳¨׳™׳˜ ׳׳™׳׳™׳.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            );
        };

        // --- MAIN APP COMPONENT ---
        const App = () => {
            const [hasSelectedEnv, setHasSelectedEnv] = useState(false);
            const [hasSelectedRoom, setHasSelectedRoom] = useState(false); // New state to control sidebar visibility
            const [currentView, setCurrentView] = useState('hierarchy');
            const [showEnvModal, setShowEnvModal] = useState(true); 
            
            const isAdmin = true; 

            const navItems = [
                { id: 'hierarchy', icon: 'building', label: '׳‘׳—׳™׳¨׳× ׳—׳“׳¨׳™׳' },
                { id: 'dashboard', icon: 'chartBar', label: '׳“׳©׳‘׳•׳¨׳“' },
                { id: 'new_complaint', icon: 'filePlus', label: '׳₪׳ ׳™׳™׳” ׳—׳“׳©׳”' },
                { id: 'my_tasks', icon: 'user', label: '׳”׳׳©׳™׳׳•׳× ׳©׳׳™' },
                { id: 'open_complaints', icon: 'globe', label: '׳₪׳ ׳™׳•׳× ׳₪׳×׳•׳—׳•׳×' },
                { id: 'history', icon: 'history', label: '׳”׳™׳¡׳˜׳•׳¨׳™׳™׳× ׳₪׳ ׳™׳•׳×' },
                { id: 'external', icon: 'link', label: '׳₪׳ ׳™׳•׳× ׳—׳™׳¦׳•׳ ׳™׳•׳×', badge: '0' },
                { id: 'settings', icon: 'settings', label: '׳”׳’׳“׳¨׳•׳× ׳׳¢׳¨׳›׳×' }
            ];

            const handleEnvConfirm = (env) => {
                setHasSelectedEnv(true);
                setShowEnvModal(false);
                setCurrentView('hierarchy');
                setHasSelectedRoom(false); // Reset room selection on env change
            };

            const handleRoomSelect = (room) => {
                setHasSelectedRoom(true); // User picked a room, show sidebar!
                setCurrentView('dashboard'); // Default view when entering a room
            };

            // ׳›׳₪׳×׳•׳¨ "׳—׳–׳•׳¨ ׳׳‘׳—׳™׳¨׳× ׳—׳“׳¨׳™׳" ׳׳”׳¡׳™׳™׳“׳‘׳¨ ׳™׳¢׳‘׳™׳¨ ׳׳׳¡׳ ׳”׳”׳™׳¨׳¨׳›׳™׳” ׳•׳™׳¢׳׳™׳ ׳׳× ׳”׳¡׳™׳™׳“׳‘׳¨
            const handleNavigate = (id) => {
                if (id === 'hierarchy') {
                    setHasSelectedRoom(false);
                }
                setCurrentView(id);
            };

            const renderView = () => {
                switch(currentView) {
                    case 'hierarchy': return <HierarchyView onOpenEnvModal={() => setShowEnvModal(true)} onOpenUserManagement={() => setCurrentView('user_management')} onRoomSelect={handleRoomSelect} />;
                    case 'user_management': return <UserManagementView />;
                    case 'dashboard': return <DashboardView />;
                    case 'new_complaint': return <NewComplaintView />;
                    case 'settings': return <SettingsView />;
                    
                    case 'my_tasks': return <TicketListView 
                        title="׳”׳׳©׳™׳׳•׳× ׳©׳׳™ - ׳׳ ׳“׳™׳™" 
                        description="׳›׳׳ ׳׳•׳¦׳’׳•׳× ׳›׳ ׳”׳׳©׳™׳׳•׳× ׳©׳ ׳׳¦׳׳•׳× ׳×׳—׳× ׳˜׳™׳₪׳•׳. ׳§׳™׳™׳׳•׳× ׳›׳₪׳×׳•׳¨׳™׳ ׳¢׳ ׳׳ ׳× ׳׳‘׳¦׳¢ ׳₪׳¢׳•׳׳•׳× ׳©׳•׳ ׳•׳×" 
                        viewType="my_tasks"
                    />;
                    case 'open_complaints': return <TicketListView 
                        title="׳₪׳ ׳™׳•׳× ׳₪׳×׳•׳—׳•׳× - ׳׳ ׳“׳™׳™" 
                        description="׳›׳׳ ׳ ׳™׳×׳ ׳׳¦׳₪׳•׳× ׳‘׳›׳ ׳”׳₪׳ ׳™׳•׳× ׳”׳₪׳×׳•׳—׳•׳× ׳©׳§׳™׳™׳׳•׳× ׳‘׳׳¢׳¨׳›׳× ׳•׳ ׳™׳×׳ ׳׳¡׳ ׳ ׳׳•׳×׳ ׳‘׳¢׳–׳¨׳× ׳¡׳ ׳׳¡׳ ׳ ׳™׳" 
                        viewType="open"
                    />;
                    case 'history': return <TicketListView 
                        title="׳”׳™׳¡׳˜׳•׳¨׳™׳™׳× ׳₪׳ ׳™׳•׳× - ׳׳ ׳“׳™׳™" 
                        description="׳›׳׳ ׳׳•׳¦׳’׳•׳× ׳›׳ ׳”׳₪׳ ׳™׳•׳× ׳©׳ ׳™׳¡׳’׳¨׳•, ׳”׳׳¢׳¨׳›׳× ׳׳©׳׳©׳× ׳›׳׳¨׳›׳™׳•׳ ׳׳×׳§׳׳•׳×, ׳ ׳™׳×׳ ׳׳¡׳ ׳ ׳׳₪׳™ ׳©׳׳ ׳”׳׳¡׳ ׳ ׳™׳ ׳”׳׳×׳׳™׳׳™׳" 
                        viewType="history"
                    />;
                    case 'external': return <TicketListView 
                        title="׳₪׳ ׳™׳•׳× ׳—׳™׳¦׳•׳ ׳™׳•׳× - ׳׳ ׳“׳™׳™" 
                        description="׳›׳׳ ׳׳•׳¦׳’׳•׳× ׳›׳ ׳”׳₪׳ ׳™׳•׳× ׳©׳”׳•׳¢׳‘׳¨׳• ׳׳—׳“׳¨׳›׳ ׳׳• ׳”׳•׳¢׳‘׳¨׳• ׳׳—׳“׳¨׳›׳ ׳׳—׳“׳¨ ׳׳—׳¨. ׳ ׳™׳×׳ ׳׳¢׳‘׳•׳¨ ׳‘׳™׳ ׳”׳§׳˜׳’׳•׳¨׳™׳•׳× ׳‘׳¢׳–׳¨׳× ׳”׳›׳₪׳×׳•׳¨׳™׳ ׳׳¢׳׳”" 
                        showToggle={true} 
                        isExternal={true}
                        viewType="external"
                    />;
                    
                    default: return <div className="p-8 font-bold text-gray-500">׳׳¡׳ ׳‘׳×׳”׳׳™׳ ׳‘׳ ׳™׳™׳”</div>;
                }
            };

            // ׳”׳׳ ׳׳”׳¦׳™׳’ ׳׳× ׳”׳×׳₪׳¨׳™׳˜ ׳”׳¦׳“׳“׳™?
            // ׳”׳×׳₪׳¨׳™׳˜ ׳™׳•׳¦׳’ ׳¨׳§ ׳׳ ׳ ׳‘׳—׳¨ ׳—׳“׳¨ ׳¡׳₪׳¦׳™׳₪׳™ (׳׳ ׳‘׳׳¦׳‘ ׳”׳™׳¨׳¨׳›׳™׳” ׳•׳׳ ׳‘׳ ׳™׳”׳•׳ ׳׳©׳×׳׳©׳™׳)
            const showSidebar = hasSelectedRoom && currentView !== 'hierarchy' && currentView !== 'user_management';

            return (
                <div className="flex h-screen w-full bg-[#F5F6FA] text-brand-text font-sans overflow-hidden" dir="rtl">
                    
                    {/* Environment Selection Overlay */}
                    {showEnvModal && (
                        <EnvironmentSelectionModal 
                            onConfirm={handleEnvConfirm} 
                            onClose={() => hasSelectedEnv ? setShowEnvModal(false) : null}
                            isAdmin={isAdmin}
                        />
                    )}

                    {/* RIGHT SIDEBAR - Conditionally Rendered */}
                    {showSidebar && (
                        <aside className="w-[220px] bg-white border-l border-gray-200 shadow-sm flex flex-col z-20 shrink-0 h-full relative">
                            <div className="pt-6 pb-4 flex flex-col items-center shrink-0">
                                <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={() => handleNavigate('dashboard')}>
                                    <Icon name="target" className="w-8 h-8 text-brand-text" />
                                    <span className="text-2xl font-extrabold text-gray-800 tracking-tight">׳×׳׳´׳¨</span>
                                </div>
                            </div>

                            <nav className="flex-1 px-3 py-2 overflow-visible min-h-0 custom-scrollbar">
                                {navItems.map((item) => {
                                    const isActive = currentView === item.id;
                                    return (
                                        <button 
                                            key={item.id}
                                            onClick={() => handleNavigate(item.id)}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all mb-1.5 border ${
                                                isActive 
                                                ? 'bg-[#EFF6FF] border-[#1E4DB7] shadow-sm' 
                                                : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className={`p-1.5 rounded-lg flex items-center justify-center transition-colors shadow-sm ${
                                                    isActive ? 'bg-[#1E3A8A] text-white' : 'bg-[#EFF6FF] text-[#1E4DB7]'
                                                }`}>
                                                    <Icon name={item.icon} className="w-4 h-4" />
                                                </div>
                                                <span className={`text-xs font-bold ${isActive ? 'text-brand-mainBlue' : 'text-gray-600'}`}>
                                                    {item.label}
                                                </span>
                                            </div>
                                            {item.badge && (
                                                <span className="bg-blue-100 text-brand-mainBlue text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-blue-200">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </nav>
                            
                            {/* User Profile snippet */}
                            <div className="mt-auto p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col gap-2 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white border border-gray-200 p-2 rounded-full shadow-sm">
                                        <Icon name="user" className="w-4 h-4 text-brand-mainBlue" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-gray-800">׳¢׳˜׳™׳” ׳ ׳”׳•׳¨׳׳™</div>
                                        <div className="text-[10px] font-semibold text-gray-500">14 ׳‘׳™׳•׳ ׳™ 2026</div>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    )}

                    {/* MAIN CONTENT AREA */}
                    <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-transparent min-w-0">
                        {renderView()}
                    </main>
                </div>
            );
        };

export default App;
