// Tamar Inquiry View V1: interaction-only; no API, selection store or persistence writes.
export const ROW_VIEW_CLICK_DELAY_MS = 400;
const excludedSelector = 'button, a, input, select, textarea, label, summary, [role="button"], [role="checkbox"], [role="menuitem"], [contenteditable="true"], [data-interactive="true"], [data-row-no-open="true"], .inquiry-icon-chip, svg';
export const isInquiryRowControl = (target) => Boolean(target?.closest?.(excludedSelector));

export function createInquiryRowActivation({ schedule = setTimeout, unschedule = clearTimeout } = {}) {
    let options = {};
    let timer = null;
    let pointer = null;
    let moved = false;
    const cancel = () => { if (timer !== null) unschedule(timer); timer = null; };
    const selectedText = (row) => {
        const selection = row?.ownerDocument?.defaultView?.getSelection?.();
        if (!selection || selection.isCollapsed || !String(selection).trim()) return false;
        return Boolean(row.contains(selection.anchorNode) || row.contains(selection.focusNode));
    };
    const ignored = (event) => event.defaultPrevented || event.button > 0
        || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
        || !event.currentTarget?.contains(event.target) // React portal events may bubble through the row.
        || isInquiryRowControl(event.target);
    const activate = () => {
        if (options.selectionMode) options.onToggleSelection?.();
        else options.onView?.(options.ticket);
    };
    return {
        configure(next) { options = next; },
        cancel,
        onPointerDown(event) {
            cancel();
            pointer = { x: event.clientX, y: event.clientY };
            moved = false;
        },
        onPointerMove(event) {
            if (pointer && event.buttons && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 6) {
                moved = true; cancel();
            }
        },
        onPointerCancel() { moved = true; pointer = null; cancel(); },
        onDragStart(event) { moved = true; cancel(); options.onDragStart?.(event); },
        onClick(event) {
            cancel();
            if (ignored(event) || moved || event.detail > 1) return;
            if (!options.selectionMode && selectedText(event.currentTarget)) return;
            if (options.selectionMode || !options.onEnterSelectionMode || event.detail === 0) { activate(); return; }
            const row = event.currentTarget;
            timer = schedule(() => {
                timer = null;
                if (!moved && !selectedText(row) && row.isConnected !== false) activate();
            }, ROW_VIEW_CLICK_DELAY_MS);
        },
        onDoubleClick(event) {
            cancel();
            if (ignored(event) || moved || options.selectionMode) return;
            options.onEnterSelectionMode?.(options.ticket?.boardItemId);
        },
        onKeyDown(event) {
            if (event.target !== event.currentTarget || event.repeat || event.defaultPrevented
                || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault(); cancel(); activate();
        }
    };
}
