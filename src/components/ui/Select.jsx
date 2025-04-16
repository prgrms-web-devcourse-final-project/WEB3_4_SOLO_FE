import classNames from 'classnames';

const Select = ({
  label,
  id,
  name,
  value,
  onChange,
  onBlur,
  error,
  helpText,
  className = '',
  disabled = false,
  required = false,
  children,
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
      <div className="relative rounded-md shadow-sm">
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          className={classNames(
            'block w-full px-3 py-2 border rounded-md shadow-sm bg-white',
            'focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm',
            'appearance-none', // 브라우저 기본 드롭다운 화살표 제거
            error ? 'border-red-300 text-red-900' : 'border-gray-300 text-gray-900',
            disabled ? 'bg-gray-100 cursor-not-allowed' : '',
            className
          )}
          {...props}
        >
          {children}
        </select>
        
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
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

export default Select; 