import React from 'react';

const PageHeader = ({ title, description, toggleState, setToggleState, showToggle = false }) => {
    return (
        <header className="relative z-10 mb-2.5 shrink-0">
            <h1 className="mb-1 text-[24px] font-black tracking-tight text-[#0F172A] dark:text-white">{title}</h1>
            {description && <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{description}</p>}
            {showToggle && (
                <div className="absolute top-0 left-0 flex w-[240px] rounded-full bg-[#E5E7EB] dark:bg-slate-800 p-1 shadow-inner">
                    <div
                        className="absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full bg-white dark:bg-slate-600 shadow-sm transition-transform duration-300 ease-out"
                        style={{ transform: toggleState === 'received' ? 'translateX(0)' : 'translateX(-100%)', right: '4px' }}
                    />
                    <button
                        onClick={() => setToggleState('received')}
                        className={`relative z-10 flex-1 py-1.5 text-xs font-bold transition-colors ${toggleState === 'received' ? 'text-[#1E4DB7] dark:text-blue-300' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                    >
                        פניות שהתקבלו
                    </button>
                    <button
                        onClick={() => setToggleState('sent')}
                        className={`relative z-10 flex-1 py-1.5 text-xs font-bold transition-colors ${toggleState === 'sent' ? 'text-[#1E4DB7] dark:text-blue-300' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                    >
                        פניות שנשלחו
                    </button>
                </div>
            )}
        </header>
    );
};

export default PageHeader;
