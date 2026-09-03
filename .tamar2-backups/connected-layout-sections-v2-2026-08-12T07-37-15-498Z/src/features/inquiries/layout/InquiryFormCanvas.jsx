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
    compact = false,
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

    const visibleSections = (sections || []).map((section, sectionIndex) => {
        const items = (section.fields || [])
            .map((item, itemIndex) => ({
                ...item,
                itemIndex,
                field: byId.get(item.id)
            }))
            .filter((item) => item.field && (includeHidden || item.visible !== false));

        return {
            section,
            sectionIndex,
            items,
            collapsed: isSectionCollapsed(section.id)
        };
    }).filter(({ items }) => items.length > 0 || includeHidden);

    const renderSection = ({
        section,
        sectionIndex,
        items,
        collapsed
    }) => (
        <section
            key={section.id}
            className={join(
                compact
                    ? 'bg-[var(--color-surface-raised)]'
                    : 'overflow-hidden rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)]'
            )}
            data-inquiry-section={section.id}
        >
            {renderSectionHeader ? (
                renderSectionHeader({
                    section,
                    sectionIndex,
                    items
                })
            ) : (
                <header
                    className={compact
                        ? 'flex min-h-8 items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-1'
                        : 'flex min-h-11 items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-2.5'
                    }
                >
                    <h3
                        className={compact
                            ? 'truncate text-[11px] font-black text-[var(--color-text-primary)]'
                            : 'truncate text-[14px] font-black text-[var(--color-text-primary)]'
                        }
                        dir="auto"
                    >
                        {section.title}
                    </h3>

                    <span
                        className={compact
                            ? 'rounded bg-[var(--color-surface-muted)] px-1.5 py-0.5 text-[9px] font-black text-[var(--color-text-muted)]'
                            : 'rounded-md bg-[var(--color-surface-muted)] px-2 py-1 text-[10px] font-black text-[var(--color-text-muted)]'
                        }
                    >
                        {items.length} שדות
                    </span>
                </header>
            )}

            {!collapsed && (
                <div
                    className={`${INQUIRY_FORM_GRID_CLASS} ${compact ? 'gap-2 p-2' : 'p-4'}`}
                    data-inquiry-grid="12"
                >
                    {items.map((item) => {
                        const width = item.width || item.field.width || 'חצי רוחב';

                        const content = renderField
                            ? renderField({
                                ...item,
                                section,
                                sectionIndex,
                                width
                            })
                            : (
                                <InquiryFormField
                                    field={item.field}
                                    value={values[item.field.id]}
                                    editable={editableValues && isFieldEditable(item.field)}
                                    preview={preview}
                                    compact={compact}
                                    onChange={onValueChange}
                                />
                            );

                        return (
                            <div
                                key={item.id}
                                className={join(
                                    'min-w-0',
                                    inquiryWidthToGridClass(width)
                                )}
                                data-inquiry-field={item.id}
                                data-inquiry-width={width}
                                data-grid-span={inquiryWidthToGridSpan(width)}
                            >
                                {content}
                            </div>
                        );
                    })}
                </div>
            )}

            {!collapsed && renderSectionFooter?.({
                section,
                sectionIndex,
                items
            })}
        </section>
    );

    return (
        <div
            className={join(INQUIRY_FORM_CANVAS_CLASS, className)}
            data-testid="inquiry-form-canvas"
            data-inquiry-canvas-width={INQUIRY_FORM_CANVAS_WIDTH_PX}
            dir="rtl"
        >
            {compact ? (
                <div
                    className="overflow-hidden rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)]"
                    data-connected-inquiry-sections="true"
                >
                    {visibleSections.map((entry, index) => (
                        <React.Fragment key={entry.section.id}>
                            {index > 0 && (
                                <div
                                    className="h-px bg-[var(--color-border-strong)]"
                                    aria-hidden="true"
                                />
                            )}

                            {renderSection(entry)}

                            {renderBetweenSections && (
                                <div className="flex min-h-8 items-center justify-center border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]/35 px-2 py-1">
                                    {renderBetweenSections({
                                        section: entry.section,
                                        sectionIndex: entry.sectionIndex
                                    })}
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {visibleSections.map((entry) => (
                        <React.Fragment key={entry.section.id}>
                            {renderSection(entry)}
                            {renderBetweenSections?.({
                                section: entry.section,
                                sectionIndex: entry.sectionIndex
                            })}
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    );
};

export default InquiryFormCanvas;
