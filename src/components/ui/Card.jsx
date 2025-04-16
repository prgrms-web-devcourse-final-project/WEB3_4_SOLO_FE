import classNames from 'classnames';

const Card = ({
  children,
  className = '',
  title,
  subtitle,
  footer,
  isHoverable = false,
  hasBorder = true,
  hasShadow = true,
  ...props
}) => {
  return (
    <div
      className={classNames(
        'bg-white rounded-lg overflow-hidden',
        hasBorder && 'border border-gray-200',
        hasShadow && 'shadow',
        isHoverable && 'transition-all duration-200 hover:shadow-lg',
        className
      )}
      {...props}
    >
      {(title || subtitle) && (
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          {title && (
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div className="px-4 py-5 sm:p-6">{children}</div>

      {footer && (
        <div className="px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-200">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card; 