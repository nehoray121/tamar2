export const INQUIRY_FORM_CANVAS_WIDTH_PX = 850;
export const INQUIRY_FORM_CANVAS_CLASS = 'mx-auto w-full max-w-[850px]';
export const INQUIRY_FORM_GRID_CLASS = 'grid grid-cols-1 gap-3 sm:grid-cols-12';

export const INQUIRY_WIDTH_GRID_SPANS = Object.freeze({
    'שליש רוחב': 4,
    'חצי רוחב': 6,
    'רוחב מלא': 12
});

export const inquiryWidthToGridSpan = (width) => INQUIRY_WIDTH_GRID_SPANS[width] || INQUIRY_WIDTH_GRID_SPANS['חצי רוחב'];

export const inquiryWidthToGridClass = (width) => {
    if (width === 'שליש רוחב') return 'sm:col-span-4';
    if (width === 'רוחב מלא') return 'sm:col-span-12';
    return 'sm:col-span-6';
};

export const inquiryWidthShortLabel = (width) => ({
    'שליש רוחב': 'שליש',
    'חצי רוחב': 'חצי',
    'רוחב מלא': 'מלא'
}[width] || width);


export const applyInquiryFieldWidth = (settings, fieldId, width) => {
    const nextWidth = Object.hasOwn(INQUIRY_WIDTH_GRID_SPANS, width) ? width : 'חצי רוחב';
    return {
        ...settings,
        fields: (settings.fields || []).map((field) => (
            field.id === fieldId ? { ...field, width: nextWidth } : field
        )),
        sections: (settings.sections || []).map((section) => ({
            ...section,
            fields: (section.fields || []).map((item) => (
                item.id === fieldId ? { ...item, width: nextWidth } : item
            ))
        }))
    };
};
