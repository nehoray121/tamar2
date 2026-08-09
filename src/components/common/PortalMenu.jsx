import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

const PortalMenu = ({ anchorRef, open, onClose, children }) => {
    const menuRef = useRef(null);
    const [style, setStyle] = useState({});

    useEffect(() => {
        if (!open || !anchorRef.current) return undefined;

        const closeAndRestoreFocus = () => {
            onClose();
            window.setTimeout(() => anchorRef.current?.focus(), 0);
        };

        const updatePosition = () => {
            if (!anchorRef.current || !menuRef.current) return;
            const anchorRect = anchorRef.current.getBoundingClientRect();
            const menuRect = menuRef.current.getBoundingClientRect();

            let top = anchorRect.bottom + 8;
            let left = anchorRect.right - menuRect.width;

            if (top + menuRect.height > window.innerHeight - 16 && anchorRect.top - menuRect.height - 8 > 16) {
                top = anchorRect.top - menuRect.height - 8;
            }

            if (left < 16) {
                left = 16;
            }

            if (left + menuRect.width > window.innerWidth - 16) {
                left = window.innerWidth - menuRect.width - 16;
            }

            setStyle({
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`,
                zIndex: 9999
            });
        };

        updatePosition();
        setTimeout(updatePosition, 0);

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                closeAndRestoreFocus();
            }
        };

        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target) && anchorRef.current && !anchorRef.current.contains(event.target)) {
                closeAndRestoreFocus();
            }
        };

        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        document.addEventListener('keydown', handleEscape);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open, anchorRef, onClose]);

    if (!open) return null;

    return createPortal(
        <div ref={menuRef} style={style} onClick={(event) => event.stopPropagation()}>
            {children}
        </div>,
        document.body
    );
};

export default PortalMenu;
