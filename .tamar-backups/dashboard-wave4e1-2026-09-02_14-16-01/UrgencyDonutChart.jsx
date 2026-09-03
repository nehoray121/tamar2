import React, { useState } from 'react';

const UrgencyDonutChart = ({
    data = [],
    onSegmentClick,
    isExpanded = false,
    hideCenter = false,
    totalOverride
}) => {
    const [hoveredSegment, setHoveredSegment] = useState(null);

    const items = Array.isArray(data)
        ? data.filter((item) => Number(item?.value || 0) > 0)
        : [];

    const segmentTotal = items.reduce(
        (sum, item) => sum + Number(item.value || 0),
        0
    );

    const total = totalOverride ?? segmentTotal;
    const size = isExpanded ? 196 : 154;
    const strokeWidth = isExpanded ? 28 : 24;
    const center = size / 2;
    const radius = (size - strokeWidth) / 2 - 2;

    const pointOnCircle = (angle) => {
        const radians = angle * Math.PI / 180;
        return {
            x: center + radius * Math.cos(radians),
            y: center + radius * Math.sin(radians)
        };
    };

    const describeArc = (startAngle, endAngle) => {
        const start = pointOnCircle(startAngle);
        const end = pointOnCircle(endAngle);
        const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

        return [
            'M',
            start.x,
            start.y,
            'A',
            radius,
            radius,
            0,
            largeArcFlag,
            1,
            end.x,
            end.y
        ].join(' ');
    };

    if (segmentTotal <= 0) {
        return (
            <div
                className={`dashboard-donut-v4b ${
                    isExpanded ? 'dashboard-donut-v4b--expanded' : ''
                }`}
                aria-label="אין נתוני דחיפות להצגה"
            >
                <svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    aria-hidden="true"
                >
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="var(--chart-track)"
                        strokeWidth={strokeWidth}
                    />
                </svg>

                {!hideCenter && (
                    <div className="dashboard-donut-v4b__center">
                        <strong>0</strong>
                        <span>סה״כ פניות</span>
                    </div>
                )}
            </div>
        );
    }

    let currentAngle = -90;

    return (
        <div
            className={`dashboard-donut-v4b ${
                isExpanded ? 'dashboard-donut-v4b--expanded' : ''
            }`}
            aria-label={`התפלגות ${total} פניות`}
        >
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="dashboard-donut-v4b__svg"
                role="img"
                aria-hidden="true"
            >
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="var(--chart-track)"
                    strokeWidth={strokeWidth}
                />

                {items.map((item, index) => {
                    const value = Number(item.value || 0);
                    const segmentAngle = (value / segmentTotal) * 360;
                    const startAngle = currentAngle;
                    const endAngle = currentAngle + segmentAngle;
                    const isHovered = hoveredSegment === item.label;
                    currentAngle = endAngle;

                    const interaction = {
                        onMouseEnter: () => setHoveredSegment(item.label),
                        onMouseLeave: () => setHoveredSegment(null),
                        onClick: () => onSegmentClick?.(item)
                    };

                    if (segmentAngle >= 359.999) {
                        return (
                            <circle
                                key={`${item.label}-${index}`}
                                cx={center}
                                cy={center}
                                r={radius}
                                fill="none"
                                stroke={item.color || 'var(--color-primary)'}
                                strokeWidth={
                                    isHovered ? strokeWidth + 2 : strokeWidth
                                }
                                className="dashboard-donut-v4b__segment"
                                {...interaction}
                            />
                        );
                    }

                    return (
                        <path
                            key={`${item.label}-${index}`}
                            d={describeArc(startAngle, endAngle)}
                            fill="none"
                            stroke={item.color || 'var(--color-primary)'}
                            strokeWidth={
                                isHovered ? strokeWidth + 2 : strokeWidth
                            }
                            strokeLinecap="butt"
                            opacity={
                                hoveredSegment && !isHovered ? 0.72 : 1
                            }
                            className="dashboard-donut-v4b__segment"
                            {...interaction}
                        />
                    );
                })}

                <circle
                    cx={center}
                    cy={center}
                    r={Math.max(0, radius - (strokeWidth / 2) - 3)}
                    fill="var(--color-surface)"
                    pointerEvents="none"
                />
            </svg>

            {!hideCenter && (
                <div className="dashboard-donut-v4b__center" aria-hidden="true">
                    <strong>{total}</strong>
                    <span>סה״כ פניות</span>
                </div>
            )}
        </div>
    );
};

export default UrgencyDonutChart;
