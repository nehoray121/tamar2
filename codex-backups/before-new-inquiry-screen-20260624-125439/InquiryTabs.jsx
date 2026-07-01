import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const InquiryTabs = ({ activeTab, setActiveTab }) => (
                    <div className="flex justify-center border-b border-gray-200 shrink-0 mb-1.5 gap-20 px-10 h-10 items-end">
                        <button onClick={() => setActiveTab('form')} className={`h-full px-4 pt-3 pb-3 text-[14px] flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'form' ? 'tab-active' : 'tab-inactive font-bold'}`}>
                            טופס <Icon name="filePlus" className="w-4 h-4" />
                        </button>
                        <button onClick={() => setActiveTab('chat')} className={`h-full px-4 pt-3 pb-3 text-[14px] flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'chat' ? 'tab-active' : 'tab-inactive font-bold'}`}>
                            צ'אט <Icon name="chat" className="w-4 h-4" />
                        </button>
                        <button onClick={() => setActiveTab('external')} className={`h-full px-4 pt-3 pb-3 text-[14px] flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'external' ? 'tab-active' : 'tab-inactive font-bold'}`}>
                            שליחה לחדר חיצוני <Icon name="send" className="w-4 h-4 transform -rotate-45" />
                        </button>
                    </div>
);

export default InquiryTabs;
