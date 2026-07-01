import React, { useState } from 'react';
import Icon from '../../components/common/Icon.jsx';
import { Button } from '../../components/ui/index.js';

        const SettingsPage = () => {
            const [activeFields, setActiveFields] = useState([
                { id: 1, title: 'דחיפות', val: 'רמת דחיפות הפנייה', icon: 'chevronDown', type: 'select', required: true, locked: true },
                { id: 2, title: 'גורם מטפל', val: 'הכנס/י גורם מטפל', icon: 'chevronDown', type: 'select', required: true, locked: true },
                { id: 3, title: 'מ.א של לקוח', val: 'הכנס/י מ.א של לקוח', type: 'short_text', required: true, locked: true },
                { id: 4, title: 'אופן טיפול בפנייה', val: 'אופן טיפול בפנייה', type: 'free_text', required: true, locked: true },
                { id: 5, title: 'תיאור התקלה', val: 'תיאור התקלה', type: 'free_text', required: true, locked: true },
                { id: 6, title: 'מיקום', val: 'בהתהוות', type: 'short_text', required: false, locked: false, dashed: true }
            ]);

            const [editingField, setEditingField] = useState(null);
            const [isDropdownOpen, setIsDropdownOpen] = useState(false);
            const [draggedItemId, setDraggedItemId] = useState(null);

            const handleFieldTypeClick = (type) => {
                const typeMap = {
                    'free_text': { title: 'טקסט חופשי חדש', val: 'לדוגמא: תיאור פנייה, דרך פתרון...', icon: null },
                    'select': { title: 'בחירת אפשרות חדשה', val: 'לדוגמא: רשימת יחידות...', icon: 'chevronDown', options: ['אפשרות 1', 'אפשרות 2'] },
                    'short_text': { title: 'טקסט קצר חדש', val: 'לדוגמא: שם פרטי, שם משפחה...', icon: null }
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
                const options = field.options || (field.type === 'select' ? ['אפשרות לדוגמא'] : []);
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
                setEditingField({ ...editingField, options: [...editingField.options, `אפשרות ${editingField.options.length + 1}`] });
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
                        <h1 className="text-[28px] font-black text-[#1E3A8A] mb-2 tracking-tight">הגדרות מערכת - מנדיי</h1>
                        <p className="text-sm font-semibold text-[#1E4DB7]">
                            בעמוד זה ניתן לערוך את השדות והאופי שלפיו החדר מתנהל. קיימים ברשותך <span className="text-purple-600 font-bold">3 סוגים</span> שונים של שדות.
                        </p>
                    </div>

                    <div className="flex-1 flex gap-8 min-h-0 pb-6">
                        
                        {/* Right Column: Field Types */}
                        <div className="flex flex-col gap-6 w-[25%] shrink-0 pt-4">
                            <div className="flex flex-col relative group cursor-pointer" onClick={() => handleFieldTypeClick('free_text')}>
                                <span className="text-center font-bold text-gray-700 text-sm mb-2">טקסט חופשי</span>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50/50 h-[80px] flex items-center justify-center text-gray-400 text-xs shadow-sm transition hover:border-[#1E4DB7] hover:bg-blue-50/50 hover:text-gray-600">
                                    לדוגמא: תיאור פנייה, דרך פתרון...
                                </div>
                            </div>
                            
                            <div className="flex flex-col relative mt-2 group cursor-pointer" onClick={() => handleFieldTypeClick('select')}>
                                <span className="text-center font-bold text-gray-700 text-sm mb-2">בחירת אפשרות</span>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50/50 h-[80px] flex items-center justify-between text-gray-400 text-xs shadow-sm transition hover:border-[#1E4DB7] hover:bg-blue-50/50 hover:text-gray-600">
                                    <span>לדוגמא: רשימת רשויות,יחידות...</span>
                                    <Icon name="chevronDown" className="w-4 h-4 text-gray-400 group-hover:text-[#1E4DB7] transition-colors"/>
                                </div>
                            </div>
                            
                            <div className="flex flex-col relative mt-2 group cursor-pointer" onClick={() => handleFieldTypeClick('short_text')}>
                                <span className="text-center font-bold text-gray-700 text-sm mb-2">טקסט קצר</span>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50/50 h-[80px] flex items-center justify-center text-gray-400 text-xs shadow-sm transition hover:border-[#1E4DB7] hover:bg-blue-50/50 hover:text-gray-600">
                                    לדוגמא: שם פרטי, שם משפחה...
                                </div>
                            </div>
                        </div>

                        {/* Center Column: Template & Graphics */}
                        <div className="flex flex-col w-[30%] shrink-0 px-2 pt-4">
                            {!editingField ? (
                                <React.Fragment>
                                    <span className="text-center font-bold text-gray-700 text-sm mb-2">בחרו תבנית</span>
                                    <div className="border border-yellow-400 rounded-xl p-4 bg-yellow-50/30 h-[100px] mb-4 relative shadow-sm cursor-default">
                                        <div className="absolute top-2 right-4 text-[10px] text-gray-400 font-bold">כותרת</div>
                                        <div className="text-gray-400 text-sm mt-4 text-center">לחצו על שדה מימין כדי לערוך אותו...</div>
                                    </div>
                                </React.Fragment>
                            ) : (
                                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-3.5 flex flex-col gap-3 relative animate-fade-in mx-auto w-full max-w-[320px] mb-4 h-[230px] justify-between">
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-2 shrink-0">
                                        <h4 className="font-bold text-[#1E4DB7] text-sm">
                                            {editingField.isNew ? 'הגדרת שדה חדש' : 'עריכת שדה פעיל'}
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
                                                    placeholder="הכנס שם שדה..."
                                                />
                                                {editingField.required && <span className="text-red-500 font-bold ml-1 text-xs">*</span>}
                                            </div>
                                            
                                            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-100 shrink-0">
                                                <span className="text-[10px] font-bold text-gray-600">חובה?</span>
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
                                                placeholder="הכנס טקסט מנחה (Placeholder)..."
                                            />
                                        )}

                                        {editingField.type === 'free_text' && (
                                            <textarea
                                                className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-[#1E4DB7] transition-all hover:border-[#1E4DB7] resize-none h-14 shadow-sm"
                                                value={editingField.val}
                                                onChange={(e) => setEditingField({...editingField, val: e.target.value})}
                                                placeholder="הכנס טקסט מנחה (Placeholder)..."
                                            />
                                        )}

                                        {editingField.type === 'select' && (
                                            <div className="relative">
                                                <div className="flex items-center relative border border-gray-200 rounded-lg bg-white shadow-sm hover:border-[#1E4DB7] transition-colors focus-within:border-[#1E4DB7]">
                                                    <input
                                                        className="w-full bg-transparent py-2 pr-3 pl-8 text-xs outline-none placeholder-gray-400"
                                                        value={editingField.val}
                                                        onChange={(e) => setEditingField({...editingField, val: e.target.value})}
                                                        placeholder="טקסט מנחה (Placeholder)..."
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
                                                                    placeholder={`אפשרות ${i + 1}...`}
                                                                />
                                                                <button onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-white shadow-sm transition-all">
                                                                    <Icon name="trash" className="w-3.5 h-3.5"/>
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <button onClick={addOption} className="text-[#1E4DB7] text-[10px] font-bold flex items-center justify-center gap-1 p-1.5 hover:bg-blue-50 rounded-md mt-0.5 border border-dashed border-blue-200">
                                                            <Icon name="filePlus" className="w-3 h-3" /> הוסף אפשרות בחירה
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100 shrink-0">
                                        <Button onClick={handleSave} className="flex-1 text-xs py-1.5 shadow-sm">שמור שדה פעיל</Button>
                                        {!editingField.isNew && !editingField.locked && (
                                            <Button variant="outline" onClick={handleDelete} className="text-red-500 border-red-200 hover:bg-red-50 px-2.5 py-1.5 shadow-sm" title="מחק שדה">
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
                                <h3 className="font-bold text-lg text-gray-800">שדות פעילים</h3>
                                <div className="flex flex-col gap-2 items-end text-xs font-bold text-gray-700">
                                    <div className="flex items-center gap-1.5">
                                        <span className="mt-0.5">מוגבל ל {activeFields.length}/10</span>
                                        <Icon name="volume" className="w-4 h-4 text-gray-500"/>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[#1E4DB7] cursor-pointer hover:underline">
                                        <span className="mt-0.5">ביטול שיוך אישי</span>
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
                                                title="גרור כדי לשנות סדר"
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
                                                            לא ניתן למחוק
                                                        </div>
                                                    )}

                                                    <div className="flex flex-col justify-center w-full text-right pr-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-sm font-bold ${field.dashed ? 'text-gray-500' : (isEditingThis ? 'text-[#1E4DB7]' : 'text-gray-800')}`}>{field.title}</span>
                                                            {field.required && <span className="text-[10px] bg-red-50 text-red-500 font-bold px-1.5 py-0.5 rounded">חובה</span>}
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-1 font-semibold truncate max-w-[70%]">{field.val}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    
                                    {activeFields.length === 0 && (
                                        <div className="text-center text-gray-400 text-sm py-10 font-bold bg-white rounded-xl border border-dashed border-gray-300 relative z-10 mr-12">
                                            אין שדות פעילים. צרו שדות מהתפריט מימין.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            );
        };

export default SettingsPage;
