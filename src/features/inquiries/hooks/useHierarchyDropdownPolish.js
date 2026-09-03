import { useEffect } from 'react';

const HIERARCHY_LABELS = ['חדר:', 'תת-סביבה:', 'סביבה:'];

const triggerSelector = [
    'button',
    '[role="button"]',
    '[aria-haspopup="listbox"]',
    '[aria-expanded]'
].join(',');

const textOf = (element) => (element?.textContent || '').replace(/\s+/g, ' ').trim();

const isHierarchyTrigger = (element) => {
    const text = textOf(element);
    return HIERARCHY_LABELS.some((label) => text.includes(label));
};

const findShell = (trigger) => {
    let current = trigger;
    for (let depth = 0; depth < 4 && current; depth += 1) {
        if (
            current instanceof HTMLElement
            && current !== document.body
            && current.offsetWidth >= Math.max(trigger.offsetWidth - 6, 80)
        ) {
            const className = String(current.className || '');
            const computed = window.getComputedStyle(current);
            if (
                className.includes('rounded')
                || className.includes('border')
                || computed.borderRadius !== '0px'
            ) {
                return current;
            }
        }
        current = current.parentElement;
    }
    return trigger.parentElement || trigger;
};

const styleTrigger = (trigger) => {
    if (!(trigger instanceof HTMLElement)) return;
    if (trigger.dataset.hierarchyTriggerPolished === '1') return;

    trigger.dataset.hierarchyTriggerPolished = '1';
    Object.assign(trigger.style, {
        width: '100%',
        minWidth: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        cursor: 'pointer'
    });
};

const styleShell = (shell) => {
    if (!(shell instanceof HTMLElement)) return;
    if (shell.dataset.hierarchyShellPolished === '1') return;

    shell.dataset.hierarchyShellPolished = '1';
    Object.assign(shell.style, {
        width: 'clamp(145px, 13vw, 185px)',
        minWidth: 'clamp(145px, 13vw, 185px)',
        cursor: 'pointer',
        transition: 'box-shadow 160ms ease, border-color 160ms ease, transform 160ms ease',
        overflow: 'hidden'
    });

    const hoverIn = () => {
        shell.style.boxShadow = '0 0 0 1px rgba(96,165,250,0.36), 0 10px 24px rgba(15,23,42,0.18)';
        shell.style.borderColor = 'rgba(96,165,250,0.58)';
    };
    const hoverOut = () => {
        shell.style.boxShadow = '';
        shell.style.borderColor = '';
    };

    shell.addEventListener('mouseenter', hoverIn);
    shell.addEventListener('mouseleave', hoverOut);
};

const makeShellClickable = (shell, trigger) => {
    if (!(shell instanceof HTMLElement) || !(trigger instanceof HTMLElement)) return;
    if (shell.dataset.hierarchyShellClickable === '1') return;

    shell.dataset.hierarchyShellClickable = '1';
    shell.addEventListener('click', (event) => {
        if (!(event.target instanceof HTMLElement)) return;
        if (event.target.closest('button,[role="button"],input,textarea,svg,path')) return;
        trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        trigger.click();
    });
};

const styleDropdownOption = (option) => {
    if (!(option instanceof HTMLElement)) return;
    if (option.dataset.hierarchyDropdownOptionPolished === '1') return;

    option.dataset.hierarchyDropdownOptionPolished = '1';
    Object.assign(option.style, {
        minHeight: '40px',
        borderRadius: '12px',
        padding: '9px 12px',
        margin: '2px 0',
        cursor: 'pointer',
        transition: 'background-color 140ms ease, color 140ms ease'
    });

    const applyState = () => {
        const selected = option.getAttribute('aria-selected') === 'true' || option.dataset.state === 'checked';
        if (selected) {
            option.style.background = 'rgba(59,130,246,0.22)';
            option.style.color = '#eff6ff';
            option.style.fontWeight = '700';
        } else {
            option.style.background = 'transparent';
            option.style.color = '#dbeafe';
            option.style.fontWeight = '600';
        }
    };

    applyState();

    option.addEventListener('mouseenter', () => {
        if (option.getAttribute('aria-selected') === 'true' || option.dataset.state === 'checked') return;
        option.style.background = 'rgba(148,163,184,0.14)';
        option.style.color = '#ffffff';
    });

    option.addEventListener('mouseleave', () => {
        applyState();
    });

    const observer = new MutationObserver(applyState);
    observer.observe(option, {
        attributes: true,
        attributeFilter: ['aria-selected', 'data-state']
    });
};

const styleDropdownPanel = (panel) => {
    if (!(panel instanceof HTMLElement)) return;
    if (panel.dataset.hierarchyDropdownPolished === '1') return;

    panel.dataset.hierarchyDropdownPolished = '1';
    Object.assign(panel.style, {
        background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(21,36,64,0.98))',
        border: '1px solid rgba(96,165,250,0.34)',
        borderRadius: '16px',
        boxShadow: '0 20px 48px rgba(2,6,23,0.46)',
        padding: '8px',
        overflow: 'hidden'
    });

    panel.querySelectorAll('[role="option"], [data-radix-collection-item]').forEach(styleDropdownOption);
};

const enhanceHierarchySelects = () => {
    document.querySelectorAll(triggerSelector).forEach((trigger) => {
        if (!isHierarchyTrigger(trigger)) return;
        styleTrigger(trigger);
        const shell = findShell(trigger);
        styleShell(shell);
        makeShellClickable(shell, trigger);
    });

    document.querySelectorAll('[role="listbox"]').forEach(styleDropdownPanel);
    document.querySelectorAll('[data-radix-popper-content-wrapper]').forEach((wrapper) => {
        const content = wrapper.firstElementChild;
        if (content instanceof HTMLElement) {
            styleDropdownPanel(content);
        }
    });
};

export default function useHierarchyDropdownPolish() {
    useEffect(() => {
        const run = () => enhanceHierarchySelects();
        run();

        const observer = new MutationObserver(() => run());
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'aria-expanded', 'aria-selected', 'data-state']
        });

        window.addEventListener('resize', run);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', run);
        };
    }, []);
}
