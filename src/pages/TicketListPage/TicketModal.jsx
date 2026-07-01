import React, { useEffect, useState } from 'react';
import Icon from '../../components/common/Icon.jsx';
import { InquiryUrgencyBadge, LightBlueIcon } from '../../features/tickets/components/InquiryListRow.jsx';
import { getTicketCapabilities, getTicketModalTabs } from '../../features/tickets/config/ticketCapabilities.js';
import { mapTicketToDestinationFields } from '../../features/tickets/utils/mapTicketToDestinationFields.js';

const fieldValueFallbacks = {
    phone: '050-1234567',
    handler: 'מנדיי (ccfcc)',
    customerId: '44444444444',
    treatment: 'הפנייה בטיפול',
    network: 'סודי'
};

const destinationFieldDefinitions = [
    { key: 'destinationHandler', type: 'text', defaultValue: fieldValueFallbacks.handler },
    { key: 'urgency', type: 'select', sourceKey: 'priority' },
    { key: 'contactPhone', type: 'text', aliases: ['phone'] },
    { key: 'customerId', type: 'text', aliases: ['room'] },
    { key: 'description', type: 'textarea', aliases: ['description'] }
];

const InfoCard = ({ icon, label, value, editing = false }) => (
    <div className="flex min-h-[68px] items-center gap-3 rounded-xl border border-[#C9E1FF] bg-white p-3 shadow-[0_2px_8px_rgba(30,64,175,0.05)]">
        <LightBlueIcon>
            <Icon name={icon} className="h-3.5 w-3.5" />
        </LightBlueIcon>
        <div className="min-w-0 flex-1">
            <div className="mb-1 text-[11px] font-bold text-slate-500">{label}</div>
            {editing ? (
                <input defaultValue={value} className="h-8 w-full rounded-lg border border-[#C9E1FF] bg-[#F8FBFF] px-2 text-[12px] font-black text-slate-800 outline-none focus:border-[#3B82F6]" />
            ) : (
                <div className="truncate text-[13px] font-black text-slate-900">{value || '-'}</div>
            )}
        </div>
    </div>
);

const ModalActionButton = ({ children, icon, onClick, tone = 'default' }) => {
    const tones = {
        default: 'border-[#C9E1FF] bg-white text-slate-900 hover:bg-[#F8FBFF]',
        primary: 'border-[#2563EB] bg-[#3B82F6] text-white hover:bg-blue-600',
        success: 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
    };

    return (
        <button type="button" onClick={onClick} className={`inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 text-[12px] font-black shadow-sm transition ${tones[tone]}`}>
            {icon && (
                <span className={`flex h-5 w-5 items-center justify-center rounded-md ${tone === 'primary' ? 'bg-white/15' : 'bg-[#EAF4FF] text-[#3B82F6]'}`}>
                    <Icon name={icon} className="h-3.5 w-3.5" />
                </span>
            )}
            {children}
        </button>
    );
};

const ChatDrawer = ({ open, title, onClose, context }) => {
    useEffect(() => {
        if (!open) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    return (
        <>
            <div className={`absolute inset-0 z-40 bg-slate-900/10 backdrop-blur-[1px] transition-opacity ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={onClose} />
            <aside className={`absolute bottom-0 left-0 top-0 z-50 flex w-[360px] max-w-[42%] flex-col border-r border-[#C9E1FF] bg-[#F8FBFF] shadow-[8px_0_32px_rgba(30,64,175,0.16)] transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex shrink-0 items-center justify-between border-b border-[#D9E8FA] bg-white px-4 py-3">
                    <h3 className="flex items-center gap-2 text-[14px] font-black text-slate-900">
                        <Icon name="chat" className="h-4 w-4 text-[#3B82F6]" />
                        {title}
                    </h3>
                    <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#C9E1FF] bg-white text-slate-400">
                        <Icon name="close" className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
                    <div className="max-w-[82%] self-start rounded-2xl rounded-tr-sm border border-[#C9E1FF] bg-[#EAF4FF] p-3 text-[12px] font-semibold leading-5 text-slate-800 shadow-sm">
                        נבדוק את הפנייה ונעדכן כאן.
                        <div className="mt-1 text-[10px] text-[#60A5FA]">12:42</div>
                    </div>
                    <div className="max-w-[82%] self-end rounded-2xl rounded-tl-sm border border-[#D9E8FA] bg-white p-3 text-[12px] font-semibold leading-5 text-slate-800 shadow-sm">
                        <div className="mb-1 text-[11px] font-black text-[#3B82F6]">{context === 'sent' ? 'חדר יעד' : 'עטיה נהוראי'}</div>
                        התקבלה הודעה בהקשר הפנייה.
                        <div className="mt-1 text-[10px] text-slate-400">12:47</div>
                    </div>
                </div>

                <div className="shrink-0 border-t border-[#D9E8FA] bg-white p-3">
                    <div className="flex items-end gap-2 rounded-xl border border-[#C9E1FF] bg-[#F8FBFF] p-1.5">
                        <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#3B82F6] hover:bg-[#EAF4FF]">
                            <Icon name="paperclip" className="h-4 w-4" />
                        </button>
                        <textarea rows="2" placeholder="הקלד הודעה..." className="w-full resize-none border-none bg-transparent py-1 text-[12px] text-slate-700 outline-none" />
                        <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3B82F6] text-white">
                            <Icon name="send" className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

const PrefillNote = ({ visible }) => visible ? <span className="mt-1 block text-[10px] font-bold text-[#3B82F6]">מולא מהפנייה המקורית</span> : null;

const SendInquiryView = ({ ticket }) => {
    const mappedFields = mapTicketToDestinationFields(ticket, destinationFieldDefinitions);

    return (
        <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 rounded-xl border border-[#C9E1FF] bg-white p-4 shadow-sm">
            <label className="text-[12px] font-black text-slate-700">
                סביבה *
                <select className="mt-1 h-9 w-full rounded-lg border border-[#C9E1FF] bg-[#F8FBFF] px-3 text-[12px] font-bold outline-none">
                    <option>בחירת סביבה</option>
                    <option>אגף טכנולוגיה</option>
                </select>
            </label>
            <label className="text-[12px] font-black text-slate-700">
                תת-סביבה *
                <select className="mt-1 h-9 w-full rounded-lg border border-[#C9E1FF] bg-[#F8FBFF] px-3 text-[12px] font-bold outline-none">
                    <option>בחירת תת-סביבה</option>
                    <option>צוות תשתיות</option>
                </select>
            </label>
            <label className="text-[12px] font-black text-slate-700">
                חדר *
                <select className="mt-1 h-9 w-full rounded-lg border border-[#C9E1FF] bg-[#F8FBFF] px-3 text-[12px] font-bold outline-none">
                    <option>בחירת חדר</option>
                    <option>מנדיי</option>
                </select>
            </label>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#C9E1FF] bg-white p-4 shadow-sm">
            <div>
                <InfoCard icon="users" label="גורם מטפל ביעד" value={mappedFields.destinationHandler.value} editing />
                <PrefillNote visible={mappedFields.destinationHandler.prefilled} />
            </div>
            <div>
                <InfoCard icon="target" label="דחיפות" value={mappedFields.urgency.value} editing />
                <PrefillNote visible={mappedFields.urgency.prefilled} />
            </div>
            <div>
                <InfoCard icon="phone" label="טלפון ליצירת קשר" value={mappedFields.contactPhone.value || fieldValueFallbacks.phone} editing />
                <PrefillNote visible={mappedFields.contactPhone.prefilled} />
            </div>
            <div>
                <InfoCard icon="location" label="מיקום" value={mappedFields.customerId.value} editing />
                <PrefillNote visible={mappedFields.customerId.prefilled} />
            </div>
            <div className="col-span-2 rounded-xl border border-[#D9E8FA] bg-[#F8FBFF] p-3">
                <div className="mb-1 text-[11px] font-bold text-slate-500">הערת העברה</div>
                <textarea className="h-20 w-full resize-none rounded-lg border border-[#C9E1FF] bg-white px-3 py-2 text-[12px] font-bold text-slate-800 outline-none" defaultValue={mappedFields.description.value || ''} />
                <PrefillNote visible={mappedFields.description.prefilled} />
            </div>
        </div>
    </div>
    );
};

const TicketModal = ({ ticket, viewType, transferContext = 'received', onClose, onCloseInquiry }) => {
    const capabilities = getTicketCapabilities(viewType);
    const modalTabs = getTicketModalTabs(viewType);
    const [activeTab, setActiveTab] = useState('info');
    const [isEditing, setIsEditing] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const status = viewType === 'history' ? 'סגורה' : 'פתוחה';
    const chatTitle = viewType === 'external' ? (transferContext === 'sent' ? 'צ׳אט פנייה שנשלחה' : 'צ׳אט פנייה שהתקבלה') : 'צ׳אט הפנייה';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" dir="rtl">
            <div className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-10 flex max-h-[88vh] w-full max-w-[1000px] flex-col overflow-hidden rounded-2xl border border-[#C9E1FF] bg-[#F3F7FD] shadow-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-[#C9E1FF] bg-white px-5 py-3">
                    <div className="flex items-center gap-3">
                        <h2 className="text-[22px] font-black tracking-tight text-[#0F172A]">{ticket.id.replace('...', '')}</h2>
                        <span className="inline-flex h-8 items-center rounded-lg bg-emerald-500 px-4 text-[12px] font-black text-white shadow-sm">{status}</span>
                        <InquiryUrgencyBadge priority={ticket.priority || 'בינונית-2'} />
                    </div>
                    <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#C9E1FF] bg-white text-slate-400 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-500">
                        <Icon name="close" className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex shrink-0 items-center gap-6 border-b border-[#D9E8FA] bg-white px-5">
                    {modalTabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative py-3 text-[13px] font-black transition ${activeTab === tab.id ? 'text-[#3B82F6]' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            {tab.label}
                            {activeTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-[#3B82F6]" />}
                        </button>
                    ))}
                </div>

                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                        {activeTab === 'info' && (
                            <div className="mx-auto max-w-[850px] space-y-4">
                                <div className="flex items-center gap-2">
                                    {capabilities.canEdit && !isEditing && <ModalActionButton icon="filePlus" onClick={() => setIsEditing(true)}>עריכת פנייה</ModalActionButton>}
                                    {capabilities.canChat && <ModalActionButton icon="chat" onClick={() => setIsChatOpen(true)}>{chatTitle}</ModalActionButton>}
                                    {capabilities.canClose && <ModalActionButton icon="check" tone="success" onClick={onCloseInquiry}>סגירת פנייה</ModalActionButton>}
                                    {isEditing && (
                                        <>
                                            <ModalActionButton icon="check" tone="primary" onClick={() => setIsEditing(false)}>שמור שינויים</ModalActionButton>
                                            <ModalActionButton icon="close" onClick={() => setIsEditing(false)}>ביטול</ModalActionButton>
                                        </>
                                    )}
                                </div>

                                <section>
                                    <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-black text-slate-900">
                                        <Icon name="target" className="h-3.5 w-3.5 text-[#3B82F6]" />
                                        מידע קריטי
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InfoCard icon="phone" label="טלפון ליצירת קשר" value={ticket.phone !== 'לא זמין' ? ticket.phone : fieldValueFallbacks.phone} editing={isEditing} />
                                        <InfoCard icon="user" label="נפתח על ידי" value={ticket.name} editing={false} />
                                        <InfoCard icon="calendar" label="תאריך סגירה" value={viewType === 'history' ? `${ticket.date} בשעה 14:00` : 'טרם נסגר'} />
                                        <InfoCard icon="calendar" label="תאריך פתיחה" value={`${ticket.date} בשעה 13:27`} />
                                    </div>
                                </section>

                                <section>
                                    <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-black text-slate-900">
                                        <Icon name="search" className="h-3.5 w-3.5 text-[#3B82F6]" />
                                        מידע נלווה
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InfoCard icon="search" label="מ.א של הלקוח" value={ticket.room || fieldValueFallbacks.customerId} editing={isEditing} />
                                        <InfoCard icon="users" label="גורם מטפל" value={fieldValueFallbacks.handler} editing={isEditing} />
                                        <InfoCard icon="location" label="סוג רשת" value={fieldValueFallbacks.network} editing={isEditing} />
                                        <InfoCard icon="check" label="אופן טיפול בפנייה" value={fieldValueFallbacks.treatment} editing={isEditing} />
                                    </div>

                                    <div className="mt-3 rounded-xl border border-[#D9E8FA] bg-white p-3 shadow-[0_2px_8px_rgba(30,64,175,0.05)]">
                                        <div className="mb-1.5 text-[11px] font-bold text-slate-500">תיאור הפנייה</div>
                                        {isEditing ? (
                                            <textarea className="h-20 w-full resize-none rounded-lg border border-[#C9E1FF] bg-[#F8FBFF] px-3 py-2 text-[12px] font-bold leading-5 text-slate-800 outline-none focus:border-[#3B82F6]" defaultValue={ticket.description || 'תיאור הפנייה'} />
                                        ) : (
                                            <p className="text-[13px] font-bold leading-6 text-slate-800">{ticket.description || 'תיאור הפנייה'}</p>
                                        )}
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'send' && capabilities.canSend && (
                            <div className="mx-auto max-w-[850px]">
                                <SendInquiryView ticket={ticket} />
                            </div>
                        )}
                    </div>

                    {activeTab === 'send' && capabilities.canSend && (
                        <div className="flex shrink-0 items-center justify-center gap-3 border-t border-[#D9E8FA] bg-white px-5 py-3">
                            <ModalActionButton>ביטול שינויים</ModalActionButton>
                            <ModalActionButton>שמור טיוטה</ModalActionButton>
                            <ModalActionButton icon="send" tone="primary">שלח פנייה</ModalActionButton>
                        </div>
                    )}

                    <ChatDrawer open={isChatOpen} title={chatTitle} onClose={() => setIsChatOpen(false)} context={transferContext} />
                </div>
            </div>
        </div>
    );
};

export default TicketModal;
