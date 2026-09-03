/* ==========================================================================
   TAMAR DESIGN SYSTEM — WAVE 2 COMPONENT PRIMITIVES

   This file is intentionally additive.
   Existing FormControls exports remain untouched so their props / call sites
   cannot regress. Only primitives absent from FormControls are defined here.
   ========================================================================== */

const cx = (...parts) => parts.filter(Boolean).join(' ');


export const IconButton = ({
    size = 'md',
    variant = 'default',
    round = false,
    className = '',
    type = 'button',
    children,
    ...props
}) => (
    <button
        type={type}
        className={cx(
            'tamar-ui-icon-btn',
            size === 'sm' && 'tamar-ui-icon-btn--sm',
            variant === 'ghost' && 'tamar-ui-icon-btn--ghost',
            round && 'tamar-ui-icon-btn--round',
            className
        )}
        {...props}
    >
        {children}
    </button>
);

export const Checkbox = ({
    label,
    children,
    className = '',
    inputClassName = '',
    ...props
}) => (
    <label className={cx('tamar-ui-checkbox', className)}>
        <input type="checkbox" className={inputClassName} {...props} />
        {(label ?? children) != null && <span>{label ?? children}</span>}
    </label>
);

export const Switch = ({
    checked = false,
    onChange,
    disabled = false,
    className = '',
    type = 'button',
    ...props
}) => (
    <button
        type={type}
        role="switch"
        aria-checked={checked ? 'true' : 'false'}
        disabled={disabled}
        className={cx('tamar-ui-switch', className)}
        onClick={(event) => {
            props.onClick?.(event);
            if (!event.defaultPrevented && !disabled) {
                onChange?.(!checked, event);
            }
        }}
        {...Object.fromEntries(
            Object.entries(props).filter(([key]) => key !== 'onClick')
        )}
    >
        <span className="tamar-ui-switch__knob" aria-hidden="true" />
    </button>
);

export const SearchInput = ({
    icon = null,
    className = '',
    inputClassName = '',
    ...props
}) => (
    <div className={cx('tamar-ui-control-wrap', className)}>
        {icon && <span className="tamar-ui-control-wrap__icon">{icon}</span>}
        <input
            type="search"
            className={cx('tamar-ui-control', inputClassName)}
            {...props}
        />
    </div>
);

export const Card = ({
    variant = 'default',
    interactive = false,
    selected = false,
    className = '',
    children,
    ...props
}) => (
    <section
        className={cx(
            'tamar-ui-card',
            variant !== 'default' && `tamar-ui-card--${variant}`,
            interactive && 'tamar-ui-card--interactive',
            selected && 'tamar-ui-card--selected',
            className
        )}
        {...props}
    >
        {children}
    </section>
);

export const Panel = ({
    inset = false,
    className = '',
    children,
    ...props
}) => (
    <section
        className={cx(
            'tamar-ui-panel',
            inset && 'tamar-ui-panel--inset',
            className
        )}
        {...props}
    >
        {children}
    </section>
);

export const CardHeader = ({
    title,
    subtitle,
    icon = null,
    actions = null,
    dense = false,
    divided = true,
    className = '',
    children,
    ...props
}) => (
    <header
        className={cx(
            'tamar-ui-surface-header',
            dense && 'tamar-ui-surface-header--dense',
            divided && 'tamar-ui-surface-header--divided',
            className
        )}
        {...props}
    >
        <div className="tamar-ui-surface-header__titles">
            <div className="tamar-ui-surface-header__row">
                {icon && <span className="tamar-ui-icon-chip">{icon}</span>}
                {title != null && (
                    <h2 className="tamar-ui-surface-header__title">{title}</h2>
                )}
                {children}
            </div>
            {subtitle != null && (
                <p className="tamar-ui-surface-header__subtitle">{subtitle}</p>
            )}
        </div>
        {actions != null && (
            <div className="tamar-ui-surface-header__actions">{actions}</div>
        )}
    </header>
);

export const CountChip = ({
    neutral = false,
    className = '',
    children,
    ...props
}) => (
    <span
        className={cx(
            'tamar-ui-count-chip',
            neutral && 'tamar-ui-count-chip--neutral',
            className
        )}
        {...props}
    >
        {children}
    </span>
);

export const Toolbar = ({
    className = '',
    children,
    ...props
}) => (
    <div className={cx('tamar-ui-toolbar', className)} {...props}>
        {children}
    </div>
);

export const Segmented = ({
    options = [],
    value,
    onChange,
    className = '',
    getKey = (option) => option?.value ?? option,
    getLabel = (option) => option?.label ?? option,
    getValue = (option) => option?.value ?? option,
    ...props
}) => (
    <div className={cx('tamar-ui-segmented', className)} {...props}>
        {options.map((option) => {
            const optionValue = getValue(option);
            return (
                <button
                    key={getKey(option)}
                    type="button"
                    className="tamar-ui-segmented__option"
                    data-active={optionValue === value ? 'true' : 'false'}
                    onClick={() => onChange?.(optionValue)}
                >
                    {getLabel(option)}
                </button>
            );
        })}
    </div>
);

export const Table = ({
    columns,
    className = '',
    style,
    children,
    ...props
}) => (
    <div
        className={cx('tamar-ui-table', className)}
        style={{
            ...style,
            ...(columns ? { '--table-cols': columns } : null)
        }}
        {...props}
    >
        {children}
    </div>
);

export const TableRow = ({
    clickable = false,
    selected = false,
    pinned = false,
    className = '',
    children,
    ...props
}) => (
    <div
        className={cx(
            'tamar-ui-table__row',
            clickable && 'tamar-ui-table__row--clickable',
            className
        )}
        data-selected={selected ? 'true' : 'false'}
        data-pinned={pinned ? 'true' : 'false'}
        {...props}
    >
        {children}
    </div>
);

export const Pager = ({
    from,
    to,
    total,
    onPrevious,
    onNext,
    previousDisabled = false,
    nextDisabled = false,
    previousLabel = 'הקודם',
    nextLabel = 'הבא',
    className = ''
}) => (
    <div className={cx('tamar-ui-pager', className)}>
        <button
            type="button"
            className="tamar-ui-btn tamar-ui-btn--sm tamar-ui-btn--secondary"
            onClick={onPrevious}
            disabled={previousDisabled}
        >
            {previousLabel}
        </button>

        <span className="tamar-ui-pager__summary">
            {from != null && to != null && total != null
                ? <>מציג <strong>{from}</strong>–<strong>{to}</strong> מתוך <strong>{total}</strong></>
                : null}
        </span>

        <button
            type="button"
            className="tamar-ui-btn tamar-ui-btn--sm tamar-ui-btn--secondary"
            onClick={onNext}
            disabled={nextDisabled}
        >
            {nextLabel}
        </button>
    </div>
);

export const EmptyState = ({
    icon = null,
    title,
    description,
    action = null,
    dense = false,
    className = '',
    ...props
}) => (
    <div
        className={cx(
            'tamar-ui-empty',
            dense && 'tamar-ui-empty--dense',
            className
        )}
        {...props}
    >
        {icon && <span className="tamar-ui-empty__icon">{icon}</span>}
        {title != null && <div className="tamar-ui-empty__title">{title}</div>}
        {description != null && (
            <div className="tamar-ui-empty__text">{description}</div>
        )}
        {action}
    </div>
);

export const Skeleton = ({
    variant = 'text',
    className = '',
    ...props
}) => (
    <span
        aria-hidden="true"
        className={cx(
            'tamar-ui-skeleton',
            `tamar-ui-skeleton--${variant}`,
            className
        )}
        {...props}
    />
);

export const Modal = ({
    open = true,
    size = 'md',
    title,
    subtitle,
    onClose,
    footer = null,
    className = '',
    bodyClassName = '',
    children,
    closeOnScrim = true,
    ...props
}) => {
    if (!open) return null;

    return (
        <div className="tamar-ui-modal-layer" dir="rtl">
            <button
                type="button"
                className="tamar-ui-modal-scrim"
                aria-label="סגירת חלון"
                tabIndex={-1}
                onClick={closeOnScrim ? onClose : undefined}
            />
            <section
                role="dialog"
                aria-modal="true"
                className={cx(
                    'tamar-ui-modal',
                    `tamar-ui-modal--${size}`,
                    className
                )}
                {...props}
            >
                {(title != null || subtitle != null || onClose) && (
                    <header className="tamar-ui-modal__header">
                        <div>
                            {title != null && (
                                <h2 className="tamar-ui-modal__title">{title}</h2>
                            )}
                            {subtitle != null && (
                                <p className="tamar-ui-modal__subtitle">{subtitle}</p>
                            )}
                        </div>
                        {onClose && (
                            <button
                                type="button"
                                className="tamar-ui-icon-btn tamar-ui-icon-btn--sm tamar-ui-icon-btn--ghost"
                                aria-label="סגירה"
                                onClick={onClose}
                            >
                                ×
                            </button>
                        )}
                    </header>
                )}
                <div className={cx('tamar-ui-modal__body', bodyClassName)}>
                    {children}
                </div>
                {footer != null && (
                    <footer className="tamar-ui-modal__footer">{footer}</footer>
                )}
            </section>
        </div>
    );
};
