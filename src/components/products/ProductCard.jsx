import Link from 'next/link';

const ProductCard = ({ product }) => {
  // 카테고리별 배경색 설정
  const categoryColors = {
    SAVINGS: 'bg-green-100 text-green-800',
    LOANS: 'bg-blue-100 text-blue-800',
    INVESTMENTS: 'bg-purple-100 text-purple-800',
  };

  // 카테고리별 한글 이름 설정
  const categoryNames = {
    SAVINGS: '예금',
    LOANS: '대출',
    INVESTMENTS: '투자',
  };

  // 금리 표시를 위한 포맷팅
  const formatInterestRate = (rate) => {
    if (!rate && rate !== 0) return 'N/A';
    return `${rate.toFixed(2)}%`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${categoryColors[product.category] || 'bg-gray-100 text-gray-800'}`}>
              {categoryNames[product.category] || product.category}
            </span>
          </div>
          {product.logoUrl && (
            <img 
              src={product.logoUrl}
              alt={`${product.name} 로고`}
              className="w-12 h-12 object-contain"
            />
          )}
        </div>
        
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{product.description}</p>
        
        <div className="space-y-2 mb-6">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">금리</span>
            <span className="text-sm font-medium text-gray-900">{formatInterestRate(product.interestRate)}</span>
          </div>
          
          {product.minTerm && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">최소 가입 기간</span>
              <span className="text-sm font-medium text-gray-900">{product.minTerm} {product.termUnit || '개월'}</span>
            </div>
          )}
          
          {product.maxAmount && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">최대 금액</span>
              <span className="text-sm font-medium text-gray-900">
                {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(product.maxAmount)}
              </span>
            </div>
          )}
        </div>
        
        <Link href={`/products/${product.id}`}>
          <div className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-md font-medium cursor-pointer transition-colors duration-200">
            상세 정보
          </div>
        </Link>
      </div>
    </div>
  );
};

export default ProductCard; 