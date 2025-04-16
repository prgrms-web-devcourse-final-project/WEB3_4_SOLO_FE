import classNames from 'classnames';

const Input = ({
  label,
  id,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  helpText,
  className = '',
  disabled = false,
  required = false,
  icon,
  iconPosition = 'left',
  ...props
}) => {
  return (
    <div className="mb-4">
      {label && (
        <label 
          htmlFor={id} 
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className={classNames(
        'relative rounded-md shadow-sm',
        icon && 'flex items-center'
      )}>
        {icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          className={classNames(
            'block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400',
            'focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm',
            error ? 'border-red-300 text-red-900' : 'border-gray-300 text-gray-900',
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white',
            icon && iconPosition === 'left' ? 'pl-10' : '',
            icon && iconPosition === 'right' ? 'pr-10' : '',
            className
          )}
          placeholder={placeholder}
          {...props}
        />
        {icon && iconPosition === 'right' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
};

export default Input; 