import { useEffect } from 'react';

const DESCRIPTION_LABEL = 'תיאור תקלה';
const DESCRIPTION_PLACEHOLDER_SNIPPETS = [
    'לדוגמה: תיאור הפנייה',
    'דרך פתרון'
];

const text = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const matchesDescriptionField = (element) => {
    if (!(element instanceof HTMLElement)) return false;

    const placeholder = text(
        element.getAttribute('placeholder')
        || element.getAttribute('aria-label')
        || ''
    );

    if (DESCRIPTION_PLACEHOLDER_SNIPPETS.some((snippet) => placeholder.includes(snippet))) {
        return true;
    }

    let current = element.parentElement;
    for (let depth = 0; depth < 5 && current; depth += 1) {
        if (text(current.textContent).includes(DESCRIPTION_LABEL)) {
            return true;
        }
        current = current.parentElement;
    }

    return false;
};

const findFieldShell = (element) => {
    let current = element.parentElement;
    for (let depth = 0; depth < 5 && current; depth += 1) {
        if (
            current instanceof HTMLElement
            && current.offsetWidth >= Math.max(element.offsetWidth - 10, 180)
            && current.offsetHeight >= Math.max(element.offsetHeight, 48)
        ) {
            return current;
        }
        current = current.parentElement;
    }

    return element.parentElement || element;
};

const applyDescriptionPadding = () => {
    const candidates = Array.from(
        document.querySelectorAll('textarea, [role="textbox"], [contenteditable="true"]')
    );

    candidates.forEach((candidate) => {
        if (!(candidate instanceof HTMLElement)) return;
        if (!matchesDescriptionField(candidate)) return;

        candidate.dataset.descriptionPaddingFixed = '1';
        candidate.style.paddingTop = '3px';

        const shell = findFieldShell(candidate);
        if (shell instanceof HTMLElement) {
            shell.dataset.descriptionPaddingShellFixed = '1';
            shell.style.paddingTop = '3px';
        }
    });
};

export default function useIncidentDescriptionPaddingFix() {
    useEffect(() => {
        const apply = () => applyDescriptionPadding();
        apply();

        const observer = new MutationObserver(() => apply());
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'placeholder', 'aria-label']
        });

        window.addEventListener('resize', apply);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', apply);
        };
    }, []);
}
