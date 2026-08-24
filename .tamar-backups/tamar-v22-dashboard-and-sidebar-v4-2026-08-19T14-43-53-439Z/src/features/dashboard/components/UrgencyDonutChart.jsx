import React, { useState } from 'react';

const UrgencyDonutChart = ({
    data,
    onSegmentClick,
    isExpanded = false,
    hideCenter = false,
    totalOverride,
    showLabels: showLabelsOverride,
    showHalo = true
}) => {
    const [hoveredSegment, setHoveredSegment] = useState(null);
    const chartSize = isExpanded ? 172 : 154;
    const defaultShowLabels = data.length <= (isExpanded ? 6 : 4);
    const showLabels = showLabelsOverride ?? defaultShowLabels;
    const labelPadding = showLabels ? (isExpanded ? 42 : 30) : 8;
    const size = chartSize + (labelPadding * 2);
    const strokeWidth = isExpanded ? 28 : 26;
    const radius = (chartSize - strokeWidth) / 2;
    const segmentTotal = data.reduce((sum, item) => sum + item.value, 0);
    const total = totalOverride ?? segmentTotal;
    const centerRadius = Math.max(0, radius - (strokeWidth / 2) - 7);
    const center = size / 2;
    const chartOffsetY = isExpanded ? 0 : -2;
    const labelInset = isExpanded ? 22 : 16;
    let currentAngle = 0;

    const pointOnCircle = (angle, pointRadius = radius) => {
        const radians = (angle - 90) * Math.PI / 180;
        return {
            x: center + pointRadius * Math.cos(radians),
            y: center + pointRadius * Math.sin(radians)
        };
    };

    const describeArc = (startAngle, endAngle) => {
        const start = pointOnCircle(endAngle);
        const end = pointOnCircle(startAngle);
        const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
        return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
    };

    if (segmentTotal === 0) {
        return (
            <div className="flex h-full min-h-[140px] w-full items-center justify-center text-sm font-bold text-[var(--color-text-muted)]">
                אין נתונים להצגה
            </div>
        );
    }

    return (
        <div className="tamar-v22-donut-chart relative flex items-center justify-center p-1.5">
            {showHalo && (
                <div
                    className={`${isExpanded ? 'h-40 w-40' : 'h-32 w-32'} donut-halo pointer-events-none absolute rounded-full bg-[var(--color-surface-muted)] shadow-inner ring-1 ring-[var(--color-border)]`}
                    style={{ transform: `translateY(${chartOffsetY}px)` }}
                />
            )}

            <svg
                width={size}
                height={size}
                className="relative z-10 overflow-visible drop-shadow-sm"
                style={{ transform: `translateY(${chartOffsetY}px)` }}
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke="var(--chart-track)"
                    strokeWidth={strokeWidth}
                />

                {data.map((item) => {
                    if (item.value === 0) return null;
                    const startAngle = currentAngle;
                    const segmentAngle = (item.value / segmentTotal) * 360;
                    const endAngle = startAngle + segmentAngle;
                    const labelAngle = startAngle + (segmentAngle / 2);
                    const outerRingRadius = radius + (strokeWidth / 2);
                    const connectorStart = pointOnCircle(labelAngle, outerRingRadius + (isExpanded ? 10 : 6));
                    const connectorBend = pointOnCircle(labelAngle, outerRingRadius + (isExpanded ? 28 : 20));
                    const isRightSide = connectorBend.x >= center;
                    const connectorEndX = Math.min(
                        size - labelInset,
                        Math.max(
                            labelInset,
                            connectorBend.x + (isRightSide ? (isExpanded ? 24 : 18) : (isExpanded ? -24 : -18))
                        )
                    );
                    const labelPoint = {
                        x: Math.min(
                            size - labelInset,
                            Math.max(labelInset, connectorEndX + (isRightSide ? (isExpanded ? 8 : 7) : (isExpanded ? -8 : -7)))
                        ),
                        y: Math.min(
                            size - (isExpanded ? 24 : 16),
                            Math.max(isExpanded ? 24 : 16, connectorBend.y)
                        )
                    };
                    const labelAnchor = isRightSide ? 'start' : 'end';
                    const connectorPath = `M ${connectorStart.x} ${connectorStart.y} L ${connectorBend.x} ${connectorBend.y} L ${connectorEndX} ${connectorBend.y}`;
                    const shortLabel = item.label.replace(/-\d+$/, '');
                    const path = segmentAngle >= 359.99 ? null : describeArc(startAngle, endAngle);
                    const isHovered = hoveredSegment === item.label;
                    currentAngle = endAngle;

                    return (
                        <g key={item.label}>
                            {path ? (
                                <>
                                    <path
                                        d={path}
                                        fill="transparent"
                                        stroke={item.color}
                                        strokeLinecap="round"
                                        strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                                        opacity={hoveredSegment && !isHovered ? 0.84 : 1}
                                        className="transition-all duration-200"
                                        style={{ pointerEvents: 'none' }}
                                    />
                                    <path
                                        d={path}
                                        fill="transparent"
                                        stroke="transparent"
                                        strokeWidth={strokeWidth + 8}
                                        className="cursor-pointer"
                                        style={{ pointerEvents: 'stroke' }}
                                        onMouseEnter={() => setHoveredSegment(item.label)}
                                        onMouseLeave={() => setHoveredSegment(null)}
                                        onClick={() => onSegmentClick(item)}
                                    />
                                </>
                            ) : (
                                <circle
                                    cx={size / 2}
                                    cy={size / 2}
                                    r={radius}
                                    fill="transparent"
                                    stroke={item.color}
                                    strokeLinecap="round"
                                    strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                                    className="cursor-pointer transition-all duration-200"
                                    onMouseEnter={() => setHoveredSegment(item.label)}
                                    onMouseLeave={() => setHoveredSegment(null)}
                                    onClick={() => onSegmentClick(item)}
                                />
                            )}

                            {showLabels && (
                                <>
                                    <path
                                        d={connectorPath}
                                        fill="none"
                                        stroke="var(--chart-connector)"
                                        strokeWidth="1.25"
                                        strokeLinecap="round"
                                        className="pointer-events-none"
                                    />
                                    <text
                                        x={labelPoint.x}
                                        y={labelPoint.y}
                                        textAnchor={labelAnchor}
                                        dominantBaseline="middle"
                                        fill="var(--chart-label)"
                                        className={`${isExpanded ? 'text-[11px]' : 'text-[10px]'} font-semibold`}
                                        style={{ pointerEvents: 'none' }}
                                    >
                                        {shortLabel}
                                    </text>
                                </>
                            )}
                        </g>
                    );
                })}

                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={centerRadius}
                    fill="var(--color-surface-raised)"
                    style={{ pointerEvents: 'none' }}
                />
            </svg>

            {!hideCenter && (
                <div
                    className={`${isExpanded ? 'px-6 py-5' : 'px-4 py-3.5'} donut-center absolute z-20 flex cursor-default flex-col items-center justify-center rounded-full bg-[var(--color-surface-raised)]`}
                    style={{ transform: `translateY(${chartOffsetY}px)` }}
                >
                    <span className={`${isExpanded ? 'text-[30px]' : 'text-[28px]'} font-black`} style={{ color: 'var(--chart-label)' }}>
                        {total}
                    </span>
                    <span className={`${isExpanded ? 'text-sm' : 'text-xs'} font-bold`} style={{ color: 'var(--chart-label-secondary)' }}>
                        סה״כ פניות
                    </span>
                </div>
            )}
        </div>
    );
};

export default UrgencyDonutChart;
