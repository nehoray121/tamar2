import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const InternalChatDrawer = () => (
                            <div className="h-full flex flex-col items-center justify-center p-6 min-h-0 bg-white rounded-2xl border border-gray-200 shadow-sm mx-4 mb-2">
                                <div className="w-full max-w-xl mx-auto flex flex-col h-full min-h-0">
                                    <div className="text-center mb-4 border-b border-gray-100 pb-3 shrink-0">
                                        <h2 className="text-base font-bold text-gray-800">דיון בנושא M-19-1780831307772</h2>
                                    </div>
                                    <div className="flex-1 bg-gray-50/80 rounded-xl border border-dashed border-gray-200 mb-4 flex flex-col items-center justify-center min-h-0">
                                         <Icon name="chat" className="w-8 h-8 text-gray-300 mb-2" />
                                         <p className="text-gray-400 font-bold text-xs">אין הודעות בדיון זה</p>
                                    </div>
                                    <div className="relative w-full shrink-0">
                                        <textarea className="w-full bg-white border border-gray-300 rounded-xl py-2.5 px-3 pr-10 text-xs focus:outline-none focus:border-brand-blue shadow-sm h-12 resize-none font-bold text-gray-700" placeholder="כתוב הודעה חדשה..."></textarea>
                                        <button className="absolute right-2 bottom-2 text-white bg-brand-lightBlue p-1.5 rounded-lg shadow-sm hover:bg-brand-blue transition">
                                            <Icon name="send" className="w-3.5 h-3.5 transform rotate-180" />
                                        </button>
                                    </div>
                                </div>
                            </div>
);

export default InternalChatDrawer;
