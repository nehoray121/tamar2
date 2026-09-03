import React, { useState } from 'react';

const UrgencyDonutChart = ({
    data = [],
    onSegmentClick,
    isExpanded = false,
    hideCenter = false,
    totalOverride
}) => {
    const [hovered, setHovered] = useState(null);
    const items = data.filter((item) => Number(item?.value || 0) > 0);
    const segmentTotal = items.reduce(
        (sum, item) => sum + Number(item.value || 0),
        0
    );
    const total = totalOverride ?? segmentTotal;
    const size = isExpanded ? 196 : 168;
    const strokeWidth = isExpanded ? 34 : 24;
    const center = size / 2;
    const radius = (size - strokeWidth) / 2;

    const point = (angle) => {
        const radians = angle * Math.PI / 180;
        return {
            x: center + radius * Math.cos(radians),
            y: center + radius * Math.sin(radians)
        };
    };

    const arc = (startAngle, endAngle) => {
        const start = point(startAngle);
        const end = point(endAngle);
        const large = endAngle - startAngle > 180 ? 1 : 0;
        return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`;
    };

    let angle = -90;

    return (
        <div
            className={`tamar-claude-donut ${
                isExpanded ? 'tamar-claude-donut--expanded' : ''
            }`}
        >
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="var(--chart-track)"
                    strokeWidth={strokeWidth}
                />

                {items.map((item, index) => {
                    const degrees = segmentTotal
                        ? (Number(item.value) / segmentTotal) * 360
                        : 0;
                    const start = angle;
                    const end = angle + degrees;
                    const active = hovered === item.label;
                    angle = end;

                    const handlers = {
                        onMouseEnter: () => setHovered(item.label),
                        onMouseLeave: () => setHovered(null),
                        onClick: () => onSegmentClick?.(item)
                    };

                    if (degrees >= 359.99) {
                        return (
                            <circle
                                key={`${item.label}-${index}`}
                                cx={center}
                                cy={center}
                                r={radius}
                                fill="none"
                                stroke={item.color}
                                strokeWidth={strokeWidth}
                                className="tamar-claude-donut__segment"
                                {...handlers}
                            />
                        );
                    }

                    return (
                        <path
                            key={`${item.label}-${index}`}
                            d={arc(start, end)}
                            fill="none"
                            stroke={item.color}
                            strokeWidth={strokeWidth}
                            strokeLinecap="butt"
                            opacity={hovered && !active ? 0.76 : 1}
                            className="tamar-claude-donut__segment"
                            {...handlers}
                        />
                    );
                })}
            </svg>

            {!hideCenter && (
                <div className="tamar-claude-donut__center">
                    <strong>{total}</strong>
                    <span>סה״כ פניות</span>
                </div>
            )}
        </div>
    );
};

export default UrgencyDonutChart;
