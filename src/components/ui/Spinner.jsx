/**
 * 로딩 스피너 컴포넌트
 * size 속성으로 크기 조절 가능 (small, medium, large)
 */
const Spinner = ({ size = 'medium', className = '' }) => {
  const sizeClass = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  }[size] || 'w-8 h-8';
  
  return (
    <div className={`inline-block ${className}`}>
      <div className={`${sizeClass} border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`}></div>
    </div>
  );
};

export default Spinner; 