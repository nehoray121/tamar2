import React from 'react';
import LegacyIcon from './Icon.jsx';

/*
 * TamarIcon — exact dashboard icon language from the approved Claude prototype.
 *
 * Contract:
 * - 24x24 viewBox
 * - stroke width 2
 * - round caps / joins
 * - outline only
 *
 * For names that are outside the approved dashboard/sidebar set,
 * fall back to the existing app Icon component so other behavior remains safe.
 */

const ICONS = {
    bell: [
        ['path', { d: 'M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9' }],
        ['path', { d: 'M10 21h4' }]
    ],
inbox: [
        ['path', { d: 'M4 8h16v11a1 1 0 01-1 1H5a1 1 0 01-1-1V8z' }],
        ['path', { d: 'M4 8l3-5h10l3 5' }],
        ['line', { x1: 9, y1: 12, x2: 15, y2: 12 }]
    ],
    alertTriangle: [
        ['path', { d: 'M12 3l9 16H3z' }],
        ['line', { x1: 12, y1: 9, x2: 12, y2: 14 }],
        ['circle', { cx: 12, cy: 17, r: 0.6, fill: 'currentColor' }]
    ],
    alertCircle: [
        ['circle', { cx: 12, cy: 12, r: 9 }],
        ['line', { x1: 12, y1: 7, x2: 12, y2: 13 }],
        ['circle', { cx: 12, cy: 16.3, r: 0.6, fill: 'currentColor' }]
    ],
    userX: [
        ['circle', { cx: 9, cy: 8, r: 3 }],
        ['path', { d: 'M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6' }],
        ['line', { x1: 16, y1: 8, x2: 20, y2: 12 }],
        ['line', { x1: 20, y1: 8, x2: 16, y2: 12 }]
    ],
    checkCircle: [
        ['circle', { cx: 12, cy: 12, r: 9 }],
        ['polyline', { points: '9,12 11,14.2 15,9.8' }]
    ],
    percent: [
        ['line', { x1: 19, y1: 5, x2: 5, y2: 19 }],
        ['circle', { cx: 6.5, cy: 6.5, r: 2.3 }],
        ['circle', { cx: 17.5, cy: 17.5, r: 2.3 }]
    ],
    clock: [
        ['circle', { cx: 12, cy: 12, r: 9 }],
        ['polyline', { points: '12,7 12,12 15.5,14' }]
    ],
    barChart: [
        ['line', { x1: 6, y1: 20, x2: 6, y2: 12 }],
        ['line', { x1: 12, y1: 20, x2: 12, y2: 6 }],
        ['line', { x1: 18, y1: 20, x2: 18, y2: 15 }]
    ],
    pie: [
        ['circle', { cx: 12, cy: 12, r: 9 }],
        ['path', { d: 'M12 3v9l7.8 4.3' }]
    ],
    users: [
        ['circle', { cx: 8.5, cy: 8, r: 3 }],
        ['path', { d: 'M2.5 20c0-3.3 2.7-6 6-6s6 2.7 6 6' }],
        ['circle', { cx: 16.5, cy: 7.5, r: 2.3 }],
        ['path', { d: 'M14.8 14.3c2.2.4 4.2 2.4 4.7 5.7' }]
    ],
    max: [
        ['polyline', { points: '15,3 21,3 21,9' }],
        ['line', { x1: 21, y1: 3, x2: 14, y2: 10 }],
        ['polyline', { points: '9,21 3,21 3,15' }],
        ['line', { x1: 3, y1: 21, x2: 10, y2: 14 }]
    ],
    min: [
        ['polyline', { points: '4,14 10,14 10,20' }],
        ['line', { x1: 10, y1: 14, x2: 3, y2: 21 }],
        ['polyline', { points: '20,10 14,10 14,4' }],
        ['line', { x1: 14, y1: 10, x2: 21, y2: 3 }]
    ],
    x: [
        ['line', { x1: 6, y1: 6, x2: 18, y2: 18 }],
        ['line', { x1: 18, y1: 6, x2: 6, y2: 18 }]
    ],
    plus: [
        ['line', { x1: 12, y1: 5, x2: 12, y2: 19 }],
        ['line', { x1: 5, y1: 12, x2: 19, y2: 12 }]
    ],
    edit: [
        ['path', { d: 'M12 20h9' }],
        ['path', { d: 'M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z' }]
    ],
    download: [
        ['path', { d: 'M12 3v11' }],
        ['polyline', { points: '7.5,10 12,15 16.5,10' }],
        ['path', { d: 'M5 21h14' }]
    ],
    chevron: [
        ['polyline', { points: '15,6 9,12 15,18' }]
    ],
    up: [
        ['polyline', { points: '6,15 12,9 18,15' }]
    ],
    down: [
        ['polyline', { points: '6,9 12,15 18,9' }]
    ],
    arrowDownUp: [
        ['line', { x1: 7.5, y1: 4, x2: 7.5, y2: 20 }],
        ['polyline', { points: '4,16.5 7.5,20 11,16.5' }],
        ['line', { x1: 16.5, y1: 20, x2: 16.5, y2: 4 }],
        ['polyline', { points: '13,7.5 16.5,4 20,7.5' }]
    ],
    prev: [
        ['polyline', { points: '15,6 9,12 15,18' }]
    ],
    next: [
        ['polyline', { points: '9,6 15,12 9,18' }]
    ],

    /* Additional Tamar aliases rendered in the same exact line language. */
    user: [
        ['circle', { cx: 12, cy: 8, r: 3.2 }],
        ['path', { d: 'M5.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5' }]
    ],
    shield: [
        ['path', { d: 'M12 3l7 3v5.4c0 4.5-2.8 7.6-7 9.6-4.2-2-7-5.1-7-9.6V6z' }],
        ['polyline', { points: '9,12 11,14 15,10' }]
    ],
    filePlus: [
        ['path', { d: 'M6 3h8l4 4v14H6z' }],
        ['path', { d: 'M14 3v5h5' }],
        ['line', { x1: 12, y1: 11, x2: 12, y2: 17 }],
        ['line', { x1: 9, y1: 14, x2: 15, y2: 14 }]
    ],
    filter: [
        ['path', { d: 'M3 5h18l-7 8v5l-4 2v-7z' }]
    ],
    calendar: [
        ['rect', { x: 4, y: 5, width: 16, height: 15, rx: 2 }],
        ['line', { x1: 8, y1: 3, x2: 8, y2: 7 }],
        ['line', { x1: 16, y1: 3, x2: 16, y2: 7 }],
        ['line', { x1: 4, y1: 9, x2: 20, y2: 9 }]
    ],
    search: [
        ['circle', { cx: 10.5, cy: 10.5, r: 6.5 }],
        ['line', { x1: 15.5, y1: 15.5, x2: 21, y2: 21 }]
    ],
    eye: [
        ['path', { d: 'M2.8 12s3.4-6 9.2-6 9.2 6 9.2 6-3.4 6-9.2 6-9.2-6-9.2-6z' }],
        ['circle', { cx: 12, cy: 12, r: 2.5 }]
    ],
    location: [
        ['path', { d: 'M12 21s6-5.2 6-11a6 6 0 10-12 0c0 5.8 6 11 6 11z' }],
        ['circle', { cx: 12, cy: 10, r: 2 }]
    ],
    phone: [
        ['path', { d: 'M6.2 3.5l3 4-2 2.2c1.2 2.6 3.3 4.7 5.9 5.9l2.2-2 4 3c.3.2.4.7.2 1-1 2-2.6 3-4.8 2.5-5.1-1.2-9.2-5.3-10.4-10.4C3.1 7 4.1 5.4 6.2 4.4c.3-.2.7-.1 1 .1z' }]
    ],
    check: [
        ['polyline', { points: '5,12 10,17 19,7' }]
    ],
    trash: [
        ['line', { x1: 4, y1: 7, x2: 20, y2: 7 }],
        ['path', { d: 'M9 7V5.3c0-.7.6-1.3 1.3-1.3h3.4c.7 0 1.3.6 1.3 1.3V7' }],
        ['path', { d: 'M7 7l1 12h8l1-12' }],
        ['line', { x1: 10.2, y1: 10.5, x2: 10.5, y2: 16 }],
        ['line', { x1: 13.8, y1: 10.5, x2: 13.5, y2: 16 }]
    ]
};

const ALIASES = {
    chartBar: 'barChart',
    trendUp: 'barChart',
    dashboard: 'barChart',
    history: 'clock',
    settings: 'edit',
    close: 'x',
    chevronLeft: 'prev',
    chevronRight: 'next',
    chevronDown: 'down',
    arrowUpStraight: 'max',
    arrowDownStraight: 'min',
    arrowLeft: 'prev',
    arrowRight: 'next',
    globe: 'inbox',
    link: 'users',
    target: 'alertTriangle'
};

const TamarIcon = ({
    name,
    className = '',
    color,
    size,
    title,
    ...rest
}) => {
    const resolvedName = ALIASES[name] || name;
    const definition = ICONS[resolvedName];

    if (!definition) {
        return (
            <LegacyIcon
                name={name}
                className={className}
                color={color}
                size={size}
                title={title}
                {...rest}
            />
        );
    }

    const children = definition.map(([tag, props], index) =>
        React.createElement(tag, { key: index, ...props })
    );

    const pixelSize = size || 16;

    return (
        <svg
            viewBox="0 0 24 24"
            width={pixelSize}
            height={pixelSize}
            fill="none"
            stroke={color || 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`tamar-claude-icon ${className}`.trim()}
            aria-hidden={title ? undefined : 'true'}
            role={title ? 'img' : undefined}
            {...rest}
        >
            {title ? <title>{title}</title> : null}
            {children}
        </svg>
    );
};

export default TamarIcon;
