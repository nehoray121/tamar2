import React, { useState } from 'react';

        const UrgencyDonutChart = ({ data, onSegmentClick, isExpanded = false }) => {
            const [hoveredSegment, setHoveredSegment] = useState(null);
            const chartSize = 204;
            const labelPadding = isExpanded ? 42 : 32;
            const size = chartSize + (labelPadding * 2);
            const strokeWidth = 32;
            const radius = (chartSize - strokeWidth) / 2;
            const total = data.reduce((sum, item) => sum + item.value, 0);
            const centerRadius = Math.max(0, radius - (strokeWidth / 2) - 7);
            const center = size / 2;
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
                return <div className="text-sm font-bold text-slate-400">אין נתונים לתצוגה</div>;
            }

            return (
                <div className="relative flex items-center justify-center p-2">
                    <div className="pointer-events-none absolute h-48 w-48 rounded-full bg-gradient-to-b from-blue-50 to-white shadow-inner" />
                    <svg width={size} height={size} className="relative z-10 overflow-visible drop-shadow-sm">
                        <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="#EEF4FF" strokeWidth={strokeWidth} />
                        {data.map(item => {
                            if (item.value === 0) return null;
                            const startAngle = currentAngle;
                            const segmentAngle = (item.value / total) * 360;
                            const endAngle = startAngle + segmentAngle;
                            const labelAngle = startAngle + (segmentAngle / 2);
                            const outerRingRadius = radius + (strokeWidth / 2);
                            const connectorStart = pointOnCircle(labelAngle, outerRingRadius + (isExpanded ? 8 : 5));
                            const connectorBend = pointOnCircle(labelAngle, outerRingRadius + (isExpanded ? 22 : 16));
                            const isRightSide = connectorBend.x >= center;
                            const connectorEndX = connectorBend.x + (isRightSide ? (isExpanded ? 24 : 18) : (isExpanded ? -24 : -18));
                            const labelPoint = {
                                x: connectorEndX + (isRightSide ? (isExpanded ? 9 : 6) : (isExpanded ? -9 : -6)),
                                y: Math.min(size - (isExpanded ? 18 : 12), Math.max(isExpanded ? 18 : 12, connectorBend.y))
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
                                            stroke="#CBD5E1"
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
                                        stroke="#CBD5E1"
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
                            fill="white"
                            className="cursor-default"
                            style={{ pointerEvents: 'none' }}
                        />
                    </svg>
                    <div className="donut-center absolute z-20 flex cursor-default flex-col items-center justify-center rounded-full bg-white/80 px-6 py-5 shadow-[0_18px_45px_rgba(37,99,235,0.12)] backdrop-blur-sm">
                        <span className="text-4xl font-black text-slate-900">{total}</span>
                        <span className="text-sm font-bold text-slate-500">סה״כ פניות</span>
                    </div>
                </div>
            );
        };

export default UrgencyDonutChart;
