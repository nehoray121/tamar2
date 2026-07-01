import React, { useState } from 'react';

const UrgencyDonutChart = ({ data, onSegmentClick, isExpanded = false, hideCenter = false }) => {
    const [hoveredSegment, setHoveredSegment] = useState(null);
    const chartSize = isExpanded ? 172 : 154;
    const labelPadding = isExpanded ? 42 : 30;
    const size = chartSize + (labelPadding * 2);
    const strokeWidth = isExpanded ? 28 : 26;
    const radius = (chartSize - strokeWidth) / 2;
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const centerRadius = Math.max(0, radius - (strokeWidth / 2) - 7);
    const center = size / 2;
    const chartOffsetY = isExpanded ? 0 : -4;
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

    if (total === 0) {
        return <div className="text-sm font-bold text-slate-400">׳׳™׳ ׳ ׳×׳•׳ ׳™׳ ׳׳×׳¦׳•׳’׳”</div>;
    }

    return (
        <div className="relative flex items-center justify-center p-1.5">
            <div className={`donut-halo pointer-events-none absolute rounded-full bg-gradient-to-b from-blue-50 to-white shadow-inner ${isExpanded ? 'h-40 w-40' : 'h-32 w-32'}`} style={{ transform: `translateY(${chartOffsetY}px)` }} />
            <svg width={size} height={size} className="relative z-10 overflow-visible drop-shadow-sm" style={{ transform: `translateY(${chartOffsetY}px)` }}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="var(--chart-track)" strokeWidth={strokeWidth} />
                {data.map(item => {
                    if (item.value === 0) return null;
                    const startAngle = currentAngle;
                    const segmentAngle = (item.value / total) * 360;
                    const endAngle = startAngle + segmentAngle;
                    const labelAngle = startAngle + (segmentAngle / 2);
                    const outerRingRadius = radius + (strokeWidth / 2);
                    const connectorStart = pointOnCircle(labelAngle, outerRingRadius + (isExpanded ? 10 : 6));
                    const connectorBend = pointOnCircle(labelAngle, outerRingRadius + (isExpanded ? 28 : 20));
                    const isRightSide = connectorBend.x >= center;
                    const connectorEndX = Math.min(size - labelInset, Math.max(labelInset, connectorBend.x + (isRightSide ? (isExpanded ? 24 : 18) : (isExpanded ? -24 : -18))));
                    const labelPoint = {
                        x: Math.min(size - labelInset, Math.max(labelInset, connectorEndX + (isRightSide ? (isExpanded ? 8 : 7) : (isExpanded ? -8 : -7)))),
                        y: Math.min(size - (isExpanded ? 24 : 16), Math.max(isExpanded ? 24 : 16, connectorBend.y))
                    };
                    const labelAnchor = isRightSide ? 'start' : 'end';
                    const connectorPath = `M ${connectorStart.x} ${connectorStart.y} L ${connectorBend.x} ${connectorBend.y} L ${connectorEndX} ${connectorBend.y}`;
                    const shortLabel = item.label.replace(/-\d+$/, '');
                    const path = segmentAngle >= 359.99 ? null : describeArc(startAngle, endAngle);
                    const isHovered = hoveredSegment === item.label;
                    currentAngle = endAngle;

                    if (!path) {
                        return (
                            <g key={item.label}>
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
                                    className={`fill-slate-600 font-semibold ${isExpanded ? 'text-[11px]' : 'text-[10px]'}`}
                                    style={{ pointerEvents: 'none' }}
                                >
                                    {shortLabel}
                                </text>
                            </g>
                        );
                    }

                    return (
                        <g key={item.label}>
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
                                strokeLinecap="butt"
                                strokeWidth={strokeWidth + 8}
                                className="cursor-pointer"
                                style={{ pointerEvents: 'stroke' }}
                                onMouseEnter={() => setHoveredSegment(item.label)}
                                onMouseLeave={() => setHoveredSegment(null)}
                                onClick={() => onSegmentClick(item)}
                            />
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
                                className={`fill-slate-600 font-semibold ${isExpanded ? 'text-[11px]' : 'text-[10px]'}`}
                                style={{ pointerEvents: 'none' }}
                            >
                                {shortLabel}
                            </text>
                        </g>
                    );
                })}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={centerRadius}
                    fill="var(--color-surface-raised)"
                    className="cursor-default"
                    style={{ pointerEvents: 'none' }}
                />
            </svg>
            {!hideCenter && (
                <div className={`donut-center absolute z-20 flex cursor-default flex-col items-center justify-center rounded-full bg-white/80 shadow-[0_18px_45px_rgba(37,99,235,0.12)] backdrop-blur-sm ${isExpanded ? 'px-6 py-5' : 'px-4 py-3.5'}`} style={{ transform: `translateY(${chartOffsetY}px)` }}>
                    <span className={`font-black text-slate-900 ${isExpanded ? 'text-[30px]' : 'text-[28px]'}`}>{total}</span>
                    <span className={`font-bold text-slate-500 ${isExpanded ? 'text-sm' : 'text-xs'}`}>׳¡׳”׳´׳› ׳₪׳ ׳™׳•׳×</span>
                </div>
            )}
        </div>
    );
};

export default UrgencyDonutChart;

