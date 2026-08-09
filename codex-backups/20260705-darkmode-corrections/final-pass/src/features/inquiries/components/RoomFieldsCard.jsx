import React from 'react';
import Icon from '../../../components/common/Icon.jsx';

const fieldBase = 'h-[34px] w-full rounded-lg border border-blue-100 bg-white px-3 text-[12px] font-semibold text-slate-800 shadow-[0_2px_8px_rgba(37,99,235,0.04)] outline-none transition placeholder:text-blue-200 focus:border-blue-500';

const CompactSelect = ({ value, onChange, disabled, options, prefix, className = '' }) => (
    <div className={`relative min-w-0 ${className}`}>
        <select
            value={value}
            onChange={onChange}
            disabled={disabled}
            className="h-9 w-full appearance-none truncate rounded-lg border border-blue-100 bg-white px-8 py-1 text-center text-[12px] font-black text-slate-900 shadow-[0_2px_8px_rgba(37,99,235,0.04)] outline-none disabled:bg-slate-50 disabled:text-slate-300"
        >
            {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
        <span className="pointer-events-none absolute right-3 top-2 text-[12px] font-semibold text-blue-300">{prefix}:</span>
        <Icon name="chevronDown" className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5 text-blue-400" />
    </div>
);

const FieldLabel = ({ children, required }) => (
    <label className="mb-1 block text-right text-[12px] font-black text-slate-900">{children} {required && <span className="text-red-500">*</span>}</label>
);

const TextInput = ({ label, required, ...props }) => (
    <div className="min-w-0">
        <FieldLabel required={required}>{label}</FieldLabel>
        <input {...props} className={`${fieldBase} text-right`} />
    </div>
);

const RoomFieldsCard = ({
    fields,
    setField,
    environments,
    selectedEnvironment,
    selectedSubEnvironment,
    environmentId,
    setEnvironmentId,
    subEnvironmentId,
    setSubEnvironmentId,
    roomId,
    setRoomId,
    requiredDone,
    requiredTotal,
    optionalTotal
}) => (
    <section className="flex h-full min-h-0 basis-[64%] flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]" dir="rtl">
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-slate-100 pb-3">
            <div className="flex min-w-[110px] items-center gap-2">
                <span className="h-4 w-1.5 rounded-full bg-slate-400" />
                <h2 className="whitespace-nowrap text-lg font-black text-slate-950">שדות חדר</h2>
            </div>

            <CompactSelect className="w-[240px]" prefix="סביבה" value={environmentId} onChange={(event) => setEnvironmentId(event.target.value)} options={environments} />
            <CompactSelect className="w-[240px]" prefix="תת־סביבה" value={subEnvironmentId} onChange={(event) => setSubEnvironmentId(event.target.value)} options={selectedEnvironment.subEnvironments} disabled={!selectedEnvironment.subEnvironments.length} />
            <CompactSelect className="w-[150px]" prefix="חדר" value={roomId} onChange={(event) => setRoomId(event.target.value)} options={selectedSubEnvironment?.rooms ?? []} disabled={!selectedSubEnvironment?.rooms?.length} />

            <div className="mr-auto inline-flex h-7 shrink-0 items-center gap-2 rounded-md bg-blue-700 px-3 text-[12px] font-black text-white">
                <span>{requiredDone}</span>
                <span>חובה</span>
            </div>
            <div className="inline-flex h-7 shrink-0 items-center gap-2 rounded-md bg-slate-900 px-3 text-[12px] font-black text-white">
                <span>{optionalTotal}</span>
                <span>אופציונליים</span>
            </div>
        </div>

        <div className="min-h-0 flex-1 pt-4">
            <div className="grid h-full grid-cols-2 content-start gap-x-5 gap-y-4">
                <TextInput label="גורם מטפל" required value={fields.handler} onChange={(event) => setField('handler', event.target.value)} placeholder="מנדיי" />

                <div className="min-w-0">
                    <FieldLabel>אופן טיפול בפנייה</FieldLabel>
                    <div className="relative">
                        <input value={fields.treatmentMode} onChange={(event) => setField('treatmentMode', event.target.value)} className={`${fieldBase} pl-9 text-right`} placeholder="הכנס/י אופן טיפול" />
                        <Icon name="calendar" className="absolute left-3 top-2.5 h-4 w-4 text-blue-300" />
                    </div>
                </div>

                <div className="min-w-0">
                    <FieldLabel>שיוך אנשים / נציג מטפל</FieldLabel>
                    <div className="relative">
                        <select value={fields.assignee} onChange={(event) => setField('assignee', event.target.value)} className={`${fieldBase} appearance-none pl-9 text-right`}>
                            <option value="">בחר נציג מהרשימה...</option>
                            <option value="עטיה נהוראי">עטיה נהוראי</option>
                            <option value="משה כהן">משה כהן</option>
                            <option value="ללא שיוך">ללא שיוך</option>
                        </select>
                        <Icon name="users" className="absolute left-3 top-2.5 h-4 w-4 text-blue-300" />
                    </div>
                </div>

                <div className="min-w-0">
                    <FieldLabel>מיקום</FieldLabel>
                    <div className="relative">
                        <input value={fields.location} onChange={(event) => setField('location', event.target.value)} className={`${fieldBase} pl-9 text-right`} placeholder="הכנס/י מיקום" />
                        <Icon name="location" className="absolute left-3 top-2.5 h-4 w-4 text-blue-300" />
                    </div>
                </div>

                <TextInput label="שדה חדר נוסף (אופציונלי)" value={fields.extraRequired} onChange={(event) => setField('extraRequired', event.target.value)} placeholder="ערך" />
                <TextInput label="שדה חדר נוסף 2 (אופציונלי)" value={fields.extraOptional} onChange={(event) => setField('extraOptional', event.target.value)} placeholder="ערך" />
            </div>
        </div>
    </section>
);

export default RoomFieldsCard;
