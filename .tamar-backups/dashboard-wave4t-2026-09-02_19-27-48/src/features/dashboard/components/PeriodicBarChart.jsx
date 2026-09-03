import React, { useEffect, useState } from 'react';
import Icon from '../../../components/common/Icon.jsx';

const PeriodicBarChart = ({
    data,
    onBarClick,
    barsPerPage = 6,
    isExpanded = false,
    resetKey = ''
}) => {
    const [page, setPage] = useState(0);
    const pageCount = Math.max(1, Math.ceil(data.length / barsPerPage));
    const maxVal = Math.max(...data.map((item) => item.total), 0);
    const yAxisMax = Math.max(10, Math.ceil(maxVal / 10) * 10);
    const yAxisSteps = [1, 0.75, 0.5, 0.25, 0];
    const visibleBars = data.slice(
        page * barsPerPage,
        page * barsPerPage + barsPerPage
    );
    const paddedBars = [...visibleBars];

    while (paddedBars.length < barsPerPage) {
        paddedBars.push(null);
    }

    useEffect(() => {
        setPage((currentPage) => Math.min(currentPage, pageCount - 1));
    }, [pageCount, barsPerPage, data.length]);

    useEffect(() => {
        setPage(0);
    }, [resetKey]);

    if (data.length === 0) {
        return (
            <div className="dashboard-chart-empty-v4a">
                <span>אין נתונים לתקופה שנבחרה</span>
                <small>הרחיבו את טווח התאריכים כדי לראות מגמה.</small>
            </div>
        );
    }

    return (
        <div
            className="dashboard-chart-v4a"
            data-expanded={isExpanded ? 'true' : 'false'}
        >
            <div className="dashboard-chart-v4a__plot" dir="ltr">
                <div className="dashboard-chart-v4a__axis">
                    {yAxisSteps.map((step, index) => (
                        <span
                            key={step}
                            className="dashboard-chart-v4a__axis-tick"
                            style={{
                                top: `${(1 - step) * 100}%`,
                                transform:
                                    index === 0
                                        ? 'translateY(0)'
                                        : index === yAxisSteps.length - 1
                                          ? 'translateY(-100%)'
                                          : 'translateY(-50%)'
                            }}
                        >
                            {Math.round(yAxisMax * step)}
                        </span>
                    ))}
                </div>

                <div className="dashboard-chart-v4a__plot-area">
                    {yAxisSteps.map((step, index) => (
                        <div
                            key={step}
                            className={
                                index === yAxisSteps.length - 1
                                    ? 'dashboard-chart-v4a__grid-line dashboard-chart-v4a__grid-line--base'
                                    : 'dashboard-chart-v4a__grid-line'
                            }
                            style={{ top: `${(1 - step) * 100}%` }}
                        />
                    ))}

                    <div className="dashboard-chart-v4a__bars">
                        {paddedBars.map((item, index) => {
                            if (!item) {
                                return (
                                    <div
                                        key={`empty-${index}`}
                                        className="dashboard-chart-v4a__bar-slot"
                                    />
                                );
                            }

                            const normalizedValue = Math.max(
                                0,
                                Math.min(item.total, yAxisMax)
                            );
                            const heightPct =
                                (normalizedValue / yAxisMax) * 100;
                            const isPeak = item.total === maxVal && maxVal > 0;

                            return (
                                <button
                                    key={`${item.label}-${index}`}
                                    type="button"
                                    className="dashboard-chart-v4a__bar-slot"
                                    title={`${item.label} - ${item.total} פניות`}
                                    aria-label={`${item.label}: ${item.total} פניות`}
                                    onClick={() => onBarClick(item)}
                                >
                                    <span
                                        className="dashboard-chart-v4a__value-chip"
                                        style={{
                                            bottom: `calc(${heightPct}% + 7px)`
                                        }}
                                    >
                                        {item.total}
                                    </span>

                                    <span
                                        className="dashboard-chart-v4a__bar"
                                        data-peak={isPeak ? 'true' : 'false'}
                                        style={{ height: `${heightPct}%` }}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="dashboard-chart-v4a__labels" dir="ltr">
                <div />
                <div className="dashboard-chart-v4a__labels-row">
                    {paddedBars.map((item, index) => (
                        <div
                            key={
                                item
                                    ? `${item.label}-label-${index}`
                                    : `empty-label-${index}`
                            }
                            className="dashboard-chart-v4a__label-slot"
                        >
                            {item && (
                                <span
                                    title={item.label}
                                    dir="rtl"
                                    className="dashboard-chart-v4a__label"
                                    data-peak={
                                        item.total === maxVal && maxVal > 0
                                            ? 'true'
                                            : 'false'
                                    }
                                >
                                    {item.label}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {pageCount > 1 && (
                <div className="dashboard-chart-v4a__pager" dir="rtl">
                    <button
                        type="button"
                        onClick={() =>
                            setPage((currentPage) =>
                                Math.max(0, currentPage - 1)
                            )
                        }
                        disabled={page === 0}
                        className="dashboard-chart-v4a__pager-btn"
                    >
                        <Icon name="arrowRight" className="h-3.5 w-3.5" />
                        הקודם
                    </button>

                    <span className="dashboard-chart-v4a__pager-summary">
                        מציג{' '}
                        <strong>{page * barsPerPage + 1}</strong>–
                        <strong>
                            {Math.min(data.length, (page + 1) * barsPerPage)}
                        </strong>{' '}
                        מתוך <strong>{data.length}</strong>
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setPage((currentPage) =>
                                Math.min(pageCount - 1, currentPage + 1)
                            )
                        }
                        disabled={page >= pageCount - 1}
                        className="dashboard-chart-v4a__pager-btn"
                    >
                        הבא
                        <Icon name="arrowLeft" className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default PeriodicBarChart;
