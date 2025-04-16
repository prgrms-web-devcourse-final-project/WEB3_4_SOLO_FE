import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import axios from '../../utils/axiosConfig';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/formatters';

const ProductDetail = () => {
  const router = useRouter();
  const { id } = router.query;
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    term: '',
    agreedToTerms: false
  });
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 상품 가입 모달 상태
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [subscriptionAmount, setSubscriptionAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState('');

  // 클라이언트 사이드 렌더링 여부 확인
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 로그인 확인
  useEffect(() => {
    if (!isClient) return;
    
    const token = localStorage.getItem('token');
    
    if (!token) {
      // 토큰이 없으면 로그인 페이지로 리디렉션
      router.push(`/login?redirect=/products/${id}`);
      return;
    }
    
    setIsAuthenticated(true);
  }, [router, id, isClient]);

  useEffect(() => {
    if (!id) return;
    
    // 로그인 상태가 아니면 데이터를 불러오지 않음
    if (!isClient || !isAuthenticated) {
      return;
    }

    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/products/${id}`);
        setProduct(response.data);
        setError(null);
      } catch (err) {
        console.error('상품 정보를 불러오는데 실패했습니다:', err);
        setError('상품 정보를 불러오는데 실패했습니다. 다시 시도해주세요.');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id, isAuthenticated, isClient]);

  // 계좌 목록 불러오기
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        // 실제 API 연동 시 사용할 코드
        // const response = await axios.get('/api/accounts');
        // setAccounts(response.data);
        
        // 임시 데이터
        setAccounts([
          { id: 1, accountNumber: '111-222-333444', balance: 1500000, name: '주거래 계좌' },
          { id: 2, accountNumber: '555-666-777888', balance: 3200000, name: '급여 계좌' },
        ]);
      } catch (err) {
        console.error('계좌 목록을 불러오는 중 오류가 발생했습니다:', err);
      }
    };

    if (showSubscribeModal) {
      fetchAccounts();
    }
  }, [showSubscribeModal]);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.agreedToTerms) {
      alert('약관에 동의해주세요.');
      return;
    }
    
    try {
      // 로그인 여부 확인
      const token = localStorage.getItem('token');
      if (!token) {
        router.push(`/login?redirect=/products/${id}`);
        return;
      }
      
      // 신청 API 호출
      await axios.post('/api/applications', {
        productId: id,
        amount: parseFloat(formData.amount),
        term: parseInt(formData.term),
      });
      
      // 성공 메시지와 함께 신청 완료 페이지로 이동
      router.push('/applications/success');
    } catch (err) {
      console.error('상품 신청에 실패했습니다:', err);
      alert('상품 신청에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 가입 신청 처리
  const handleSubscribe = async () => {
    try {
      setSubmitting(true);
      setSubscriptionError('');
      
      // 입력값 검증
      const amount = Number(subscriptionAmount);
      if (!amount || isNaN(amount)) {
        setSubscriptionError('유효한 금액을 입력해 주세요.');
        return;
      }
      
      if (!selectedAccount) {
        setSubscriptionError('연결 계좌를 선택해 주세요.');
        return;
      }
      
      // 금액 범위 검증
      if (product.minAmount && amount < product.minAmount) {
        setSubscriptionError(`최소 가입 금액은 ${formatCurrency(product.minAmount)}입니다.`);
        return;
      }
      
      if (product.maxAmount && amount > product.maxAmount) {
        setSubscriptionError(`최대 가입 금액은 ${formatCurrency(product.maxAmount)}입니다.`);
        return;
      }
      
      // 계좌 잔액 확인
      const account = accounts.find(acc => acc.id === Number(selectedAccount));
      if (account && account.balance < amount) {
        setSubscriptionError('계좌 잔액이 부족합니다.');
        return;
      }
      
      // 가입 API 호출
      const subscriptionData = {
        productId: Number(id),
        accountId: Number(selectedAccount),
        amount: amount,
        term: product.minTerm // 기본적으로 최소 기간으로 설정
      };
      
      console.log('상품 가입 신청 데이터:', subscriptionData);
      
      // 실제 API 호출
      const response = await axios.post('/api/products/subscriptions', subscriptionData);
      console.log('가입 성공 응답:', response.data);
      
      // 성공 메시지 표시 및 모달 닫기
      alert('상품 가입이 완료되었습니다.');
      setShowSubscribeModal(false);
      
      // 내 상품 목록 페이지로 이동
      router.push('/myproducts');
      
    } catch (err) {
      console.error('상품 가입 중 오류가 발생했습니다:', err);
      console.error('오류 상세 정보:', err.response?.data || err.message);
      
      if (err.response?.status === 500) {
        setSubscriptionError('서버 내부 오류가 발생했습니다. 관리자에게 문의해 주세요.');
      } else if (err.response?.data?.message) {
        setSubscriptionError(err.response.data.message);
      } else {
        setSubscriptionError('상품 가입 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 로그인 상태가 아니면 빈 페이지 렌더링 (로그인 페이지로 리디렉션 중)
  if (isClient && !isAuthenticated) {
    return <div className="loading">로그인 페이지로 이동 중...</div>;
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }

  if (error || !product) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center p-6 bg-red-50 rounded-lg">
            <p className="text-red-500">{error || '상품을 찾을 수 없습니다.'}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              이전 페이지로 돌아가기
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // 카테고리별 한글 이름 설정
  const categoryNames = {
    SAVINGS: '예금',
    LOANS: '대출',
    INVESTMENTS: '투자',
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            상품 목록으로 돌아가기
          </button>
        </div>

        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* 상품 헤더 */}
          <div className="bg-blue-700 text-white p-6 sm:p-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">{product.name}</h1>
                <p className="mt-2 text-blue-100">{product.description}</p>
              </div>
              {product.logoUrl && (
                <img
                  src={product.logoUrl}
                  alt={`${product.name} 로고`}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain bg-white p-2 rounded-lg"
                />
              )}
            </div>
          </div>

          {/* 상품 상세 정보 */}
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h2 className="text-xl font-semibold mb-4">상품 정보</h2>
                <div className="space-y-3">
                  <div className="flex justify-between pb-2 border-b border-gray-200">
                    <span className="text-gray-600">상품 유형</span>
                    <span className="font-medium">{categoryNames[product.category] || product.category}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-gray-200">
                    <span className="text-gray-600">금리</span>
                    <span className="font-medium">{product.interestRate ? `${product.interestRate.toFixed(2)}%` : 'N/A'}</span>
                  </div>
                  {product.minTerm && (
                    <div className="flex justify-between pb-2 border-b border-gray-200">
                      <span className="text-gray-600">최소 가입 기간</span>
                      <span className="font-medium">{product.minTerm} {product.termUnit || '개월'}</span>
                    </div>
                  )}
                  {product.maxTerm && (
                    <div className="flex justify-between pb-2 border-b border-gray-200">
                      <span className="text-gray-600">최대 가입 기간</span>
                      <span className="font-medium">{product.maxTerm} {product.termUnit || '개월'}</span>
                    </div>
                  )}
                  {product.minAmount && (
                    <div className="flex justify-between pb-2 border-b border-gray-200">
                      <span className="text-gray-600">최소 금액</span>
                      <span className="font-medium">
                        {formatCurrency(product.minAmount)}
                      </span>
                    </div>
                  )}
                  {product.maxAmount && (
                    <div className="flex justify-between pb-2 border-b border-gray-200">
                      <span className="text-gray-600">최대 금액</span>
                      <span className="font-medium">
                        {formatCurrency(product.maxAmount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-4">상품 혜택</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  {product.benefits && product.benefits.length > 0 ? (
                    product.benefits.map((benefit, index) => (
                      <li key={index}>{benefit}</li>
                    ))
                  ) : (
                    <li>추가 혜택 정보가 없습니다.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* 상품 신청 버튼 */}
            <div className="mt-8 flex justify-center">
              <Button
                variant="primary"
                size="large"
                onClick={() => setShowSubscribeModal(true)}
                className="w-full md:w-1/2"
              >
                상품 가입하기
              </Button>
            </div>
          </div>
        </div>

        {/* 상품 가입 모달 */}
        <Modal
          isOpen={showSubscribeModal}
          onClose={() => setShowSubscribeModal(false)}
          title={`${product.name} 가입하기`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                연결 계좌 선택
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
              >
                <option value="">계좌를 선택하세요</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} - {account.accountNumber} (잔액: {formatCurrency(account.balance)})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                가입 금액
              </label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="가입 금액을 입력하세요"
                value={subscriptionAmount}
                onChange={(e) => setSubscriptionAmount(e.target.value)}
                min={product.minAmount || 0}
                max={product.maxAmount || 999999999999}
              />
              <p className="text-xs text-gray-500 mt-1">
                {product.minAmount && `최소 가입 금액: ${formatCurrency(product.minAmount)}`}
                {product.minAmount && product.maxAmount && ' / '}
                {product.maxAmount && `최대 가입 금액: ${formatCurrency(product.maxAmount)}`}
              </p>
            </div>
            
            {subscriptionError && (
              <div className="bg-red-50 p-3 rounded-md border border-red-200">
                <p className="text-red-600 text-sm">{subscriptionError}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-3">
              <Button
                variant="outline"
                onClick={() => setShowSubscribeModal(false)}
                disabled={submitting}
              >
                취소
              </Button>
              <Button
                variant="primary"
                onClick={handleSubscribe}
                disabled={submitting}
              >
                {submitting ? '처리 중...' : '가입 신청'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
};

export default ProductDetail; 