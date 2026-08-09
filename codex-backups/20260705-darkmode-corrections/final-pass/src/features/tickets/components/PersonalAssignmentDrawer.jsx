import React, { useEffect } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { usePersonalAssignment } from '../hooks/usePersonalAssignment.js';

const PersonalAssignmentDrawer = ({ open, inquiryId, roomId, roomName, onClose }) => {
    const { users, assignment, loading, assign, clear } = usePersonalAssignment({ inquiryId, roomId });

    useEffect(() => {
        if (!open) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, open]);

    if (!open) return null;

    return (
        <>
            <div className="absolute inset-0 z-40 bg-slate-900/10 backdrop-blur-[1px]" onClick={onClose} />
            <aside className="absolute bottom-0 left-0 top-0 z-50 flex w-[380px] max-w-[44%] flex-col border-r border-[#C9E1FF] bg-[#F8FBFF] shadow-[8px_0_32px_rgba(30,64,175,0.16)]" dir="rtl">
                <div className="flex shrink-0 items-center justify-between border-b border-[#D9E8FA] bg-white px-4 py-3">
                    <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#C9E1FF] bg-white text-slate-400">
                        <Icon name="close" className="h-4 w-4" />
                    </button>
                    <div>
                        <h3 className="text-base font-black text-slate-950">שיוך אישי</h3>
                        <p className="text-xs font-bold text-slate-400">חדר נוכחי: {roomName}</p>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    <div className="mb-4 rounded-2xl border border-blue-100 bg-white p-3">
                        <div className="text-xs font-black text-slate-500">משויך כעת</div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="font-black text-slate-900">{assignment ? assignment.name : 'ללא שיוך אישי'}</div>
                            {assignment && <button type="button" onClick={clear} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-black text-red-600">נקה</button>}
                        </div>
                    </div>

                    {loading ? (
                        <div className="rounded-2xl border border-dashed border-blue-100 bg-white p-6 text-center text-sm font-bold text-slate-400">טוען משתמשים...</div>
                    ) : users.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-blue-100 bg-white p-6 text-center text-sm font-bold text-slate-400">אין משתמשים זמינים בחדר זה</div>
                    ) : (
                        <div className="space-y-2">
                            {users.map((user) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => assign(user.id)}
                                    className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-right shadow-sm transition hover:border-blue-300 ${assignment?.id === user.id ? 'border-blue-500 bg-blue-50' : 'border-blue-100'}`}
                                >
                                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                                        <Icon name="user" className="h-5 w-5" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-black text-slate-900">{user.name}</span>
                                        <span className="block text-xs font-bold text-slate-400">{user.role} · {user.personalId}</span>
                                    </span>
                                    {assignment?.id === user.id && <Icon name="check" className="h-5 w-5 text-blue-600" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
};

export default PersonalAssignmentDrawer;
