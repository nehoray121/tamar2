import React from 'react';
import InquiryFormField from './InquiryFormField.jsx';
import {
    INQUIRY_FORM_CANVAS_CLASS,
    INQUIRY_FORM_CANVAS_WIDTH_PX,
    INQUIRY_FORM_GRID_CLASS,
    inquiryWidthToGridClass,
    inquiryWidthToGridSpan
} from './inquiryLayout.js';

const join = (...values) => values.filter(Boolean).join(' ');

const InquiryFormCanvas = ({
    fields,
    sections,
    values = {},
    editableValues = false,
    isFieldEditable = () => true,
    preview = false,
    includeHidden = false,
    renderField,
    renderSectionHeader,
    renderSectionFooter,
    renderBetweenSections,
    isSectionCollapsed = () => false,
    className = '',
    onValueChange
}) => {
    const byId = new Map((fields || []).map((field) => [field.id, field]));

    return (
        <div
            className={join(INQUIRY_FORM_CANVAS_CLASS, className)}
            data-testid="inquiry-form-canvas"
            data-inquiry-canvas-width={INQUIRY_FORM_CANVAS_WIDTH_PX}
            dir="rtl"
        >
            <div className="space-y-4">
                {(sections || []).map((section, sectionIndex) => {
                    const items = (section.fields || [])
                        .map((item, itemIndex) => ({ ...item, itemIndex, field: byId.get(item.id) }))
                        .filter((item) => item.field && (includeHidden || item.visible !== false));
                    if (!items.length && !includeHidden) return null;
                    const collapsed = isSectionCollapsed(section.id);

                    return (
                        <React.Fragment key={section.id}>
                            <section
                                className="overflow-hidden rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)]"
                                data-inquiry-section={section.id}
                            >
                            {renderSectionHeader ? renderSectionHeader({ section, sectionIndex, items }) : (
                                <header className="flex min-h-11 items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-2.5">
                                    <h3 className="truncate text-[14px] font-black text-[var(--color-text-primary)]" dir="auto">{section.title}</h3>
                                    <span className="rounded-md bg-[var(--color-surface-muted)] px-2 py-1 text-[10px] font-black text-[var(--color-text-muted)]">{items.length} שדות</span>
                                </header>
                            )}

                            {!collapsed && <div className={`${INQUIRY_FORM_GRID_CLASS} p-4`} data-inquiry-grid="12">
                                {items.map((item) => {
                                    const width = item.width || item.field.width || 'חצי רוחב';
                                    const content = renderField
                                        ? renderField({ ...item, section, sectionIndex, width })
                                        : (
                                            <InquiryFormField
                                                field={item.field}
                                                value={values[item.field.id]}
                                                editable={editableValues && isFieldEditable(item.field)}
                                                preview={preview}
                                                onChange={onValueChange}
                                            />
                                        );
                                    return (
                                        <div
                                            key={item.id}
                                            className={join('min-w-0', inquiryWidthToGridClass(width))}
                                            data-inquiry-field={item.id}
                                            data-inquiry-width={width}
                                            data-grid-span={inquiryWidthToGridSpan(width)}
                                        >
                                            {content}
                                        </div>
                                    );
                                })}
                            </div>}
                                {!collapsed && renderSectionFooter?.({ section, sectionIndex, items })}
                            </section>
                            {renderBetweenSections?.({ section, sectionIndex })}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default InquiryFormCanvas;

