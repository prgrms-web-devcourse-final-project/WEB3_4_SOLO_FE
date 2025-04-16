import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import { formatCurrency, formatDate, formatAccountNumber } from '../../utils/formatters';
import { isAuthenticated, fetchWithAuth } from '../../utils/auth';

// 예상 이자 계산 함수 추가
const calculateExpectedInterest = (product) => {
  if (!product || !product.amount || !product.interestRate) return 0;
  
  // 예금 상품은 계산 로직이 다를 수 있음
  if (product.productCategory === 'DEPOSIT') {
    return (product.amount || 0) * (product.interestRate / 100) / 12; // 월 기준 이자 (매우 단순 계산)
  }
  
  // 일반 상품 (적금 등)
  const principal = product.amount || 0;
  const rate = product.interestRate / 100;
  const term = product.term || 12; // 기간이 없으면 12개월로 가정
  
  // 단리 계산 (매우 단순화된 계산)
  return principal * rate * (term / 12);
};

const MyProductsPage = () => {
  const router = useRouter();
  const [myProducts, setMyProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const refreshTimer = useRef(null);

  // 로그인 상태 확인
  useEffect(() => {
    const is_authenticated = isAuthenticated();
    if (!is_authenticated) {
      router.push('/auth/login');
      return;
    }
    setAuthenticated(true);
  }, [router]);

  // 내 금융상품 불러오기
  useEffect(() => {
    if (!authenticated) return;

    const fetchMyProducts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('내 금융상품 데이터 로딩 시작...');
        // 인증 정보 확인
        console.log('인증 정보 확인:', isAuthenticated());
        
        const response = await fetchWithAuth('http://localhost:8080/api/products/subscriptions');
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API 오류 응답:', response.status, errorText);
          throw new Error(`금융상품 정보를 불러오는데 실패했습니다. 상태 코드: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('내 금융상품 데이터 응답 (원본):', data);
        console.log('응답 데이터 타입:', typeof data);
        console.log('응답이 배열인가?', Array.isArray(data));
        console.log('응답에 content 속성이 있는가?', data.content !== undefined);
        
        // 데이터 형식 처리
        const subscriptionList = Array.isArray(data) ? data : 
                              (data.content && Array.isArray(data.content)) ? data.content : [];
                              
        console.log('가공된 금융상품 데이터:', subscriptionList);
        console.log('가공된 데이터 길이:', subscriptionList.length);
        
        // 가입일 정보 디버깅
        if (subscriptionList.length > 0) {
          console.log('첫 번째 상품 데이터 구조:', {
            id: subscriptionList[0].id,
            startDate: subscriptionList[0].startDate,
            createdAt: subscriptionList[0].createdAt,
            subscriptionDate: subscriptionList[0].subscriptionDate,
            날짜관련필드: Object.keys(subscriptionList[0]).filter(key => 
              key.toLowerCase().includes('date') || 
              key.toLowerCase().includes('created') || 
              key.toLowerCase().includes('time')
            )
          });
          
          // 계좌번호 관련 정보 디버깅 추가
          console.log('계좌번호 관련 필드:', {
            accountNumber: subscriptionList[0].accountNumber,
            account: subscriptionList[0].account,
            accountId: subscriptionList[0].accountId,
            linkedAccount: subscriptionList[0].linkedAccount,
            linkedAccountNumber: subscriptionList[0].linkedAccountNumber,
            계좌관련필드: Object.keys(subscriptionList[0]).filter(key => 
              key.toLowerCase().includes('account') || 
              key.toLowerCase().includes('number')
            ),
            전체필드: Object.keys(subscriptionList[0])
          });
        }
        
        // 필요한 필드가 없는 경우 백엔드 데이터 구조에 맞게 보강
        const enhancedSubscriptions = subscriptionList.map(subscription => {
          // 날짜 필드 보강
          let updatedSubscription = { ...subscription };
          
          // 가입일이 없는 경우 다른 날짜 필드로 대체
          if (!updatedSubscription.startDate) {
            updatedSubscription.startDate = subscription.createdAt || 
                                        subscription.subscriptionDate || 
                                        subscription.createdTime;
          }
          
          // 입출금계좌의 경우 이자율이 누락되거나 0이면 기본값 1.8% 적용
          if (subscription.productCategory === 'CHECKING' && 
              (!subscription.interestRate || subscription.interestRate === 0)) {
            updatedSubscription.interestRate = 1.8;
            console.log('입출금계좌 이자율 기본값 설정:', updatedSubscription);
          }
          
          // 계좌번호 정보 보강
          // 계좌번호 정보를 다양한 필드에서 추출
          updatedSubscription.displayAccountNumber = 
            // 1. 직접 연결된 account 객체에서 추출
            (subscription.account && subscription.account.accountNumber) ||
            // 2. 직접 accountNumber 필드
            subscription.accountNumber ||
            // 3. 연결된 계좌 정보에서 추출
            (subscription.linkedAccount && subscription.linkedAccount.accountNumber) ||
            subscription.linkedAccountNumber;
          
          // 계좌를 찾을 수 없지만 accountId가 있는 경우 accounts 배열에서 찾기 시도
          if (!updatedSubscription.displayAccountNumber && subscription.accountId && accounts.length > 0) {
            const linkedAccount = accounts.find(a => a.id === subscription.accountId);
            if (linkedAccount && linkedAccount.accountNumber) {
              updatedSubscription.displayAccountNumber = linkedAccount.accountNumber;
            }
          }
          
          return updatedSubscription;
        });
        
        console.log('보강된 구독 데이터:', enhancedSubscriptions);
        setMyProducts(enhancedSubscriptions);
      } catch (error) {
        console.error('내 금융상품 데이터 가져오기 오류:', error);
        setError(error.message || '금융상품 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    // 계좌 정보도 가져오기
    const fetchMyAccounts = async () => {
      try {
        console.log('계좌 정보 불러오기 API 호출...');
        const response = await fetchWithAuth('http://localhost:8080/api/accounts/my');
        
        if (!response || !response.ok) {
          console.error('계좌 정보 API 호출 오류:', response?.status);
          setAccounts([]);
          return;
        }
        
        const data = await response.json();
        console.log('계좌 정보 응답:', data);
        
        const accountsList = Array.isArray(data) ? data : 
                         (data.content && Array.isArray(data.content) ? data.content : []);
                           
        setAccounts(accountsList);
      } catch (error) {
        console.error('계좌 정보 불러오기 오류:', error);
        setAccounts([]);
      }
    };

    // 페이지 로드 시 내 금융상품 목록 조회
    fetchMyProducts();
    
    // 계좌 정보도 가져오기
    fetchMyAccounts();
    
    // 페이지 이탈 시 타이머 해제
    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, [authenticated]);

  // 상품 유형에 따른 레이블
  const getProductTypeLabel = (type) => {
    const types = {
      'SAVINGS': '적금',
      'DEPOSIT': '예금',
      'LOAN': '대출',
      'FUND': '펀드',
      'CHECKING': '입출금',
      'INSURANCE': '보험'
    };
    return types[type] || type;
  };

  // 상품 상태에 따른 레이블과 색상
  const getStatusInfo = (status) => {
    switch (status) {
      case 'ACTIVE':
        return { label: '진행중', color: 'green' };
      case 'MATURED':
        return { label: '만기', color: 'blue' };
      case 'CANCELED':
        return { label: '해지', color: 'red' };
      default:
        return { label: status, color: 'gray' };
    }
  };

  // 안전한 합계 계산을 위한 도우미 함수
  const safeSum = (arr, selector) => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    return arr.reduce((sum, item) => sum + (selector(item) || 0), 0);
  };

  // 투자 상품과 대출 상품을 분리해서 합계 계산
  const getTotalInvestment = () => {
    return safeSum(myProducts.filter(p => p.productCategory !== 'LOAN'), 
      product => Math.abs(product.amount || 0));
  };

  const getTotalLoan = () => {
    return safeSum(myProducts.filter(p => p.productCategory === 'LOAN'), 
      product => Math.abs(product.amount || 0));
  };

  if (!authenticated) {
    return null; // 로그인 페이지로 리디렉션되기 전에 빈 화면 표시
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-4 min-h-screen">
          <div className="flex justify-center items-center min-h-screen">
            <p className="text-lg">금융상품 정보를 불러오는 중...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-4 max-w-5xl">
        <h1 className="text-2xl font-bold mb-6">내 금융상품</h1>
        
        {error ? (
          <div className="bg-red-50 p-4 rounded-md border border-red-200 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        ) : myProducts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600 mb-4">현재 보유하고 계신 금융상품이 없습니다.</p>
            <p className="text-gray-500 mb-4">'금융상품'에서 금융상품을 가입해주세요.</p>
            <div className="bg-yellow-100 p-4 mb-4 rounded-md">
              <p className="text-yellow-700 font-semibold mb-1">상태 정보</p>
              <p className="text-yellow-700 text-sm">
                {authenticated ? '✓ 인증 완료' : '✗ 미인증'} | 
                {loading ? ' ⌛ 로딩 중' : ' ✓ 로딩 완료'} | 
                상품: {myProducts.length}개 | 
                {accounts.length > 0 ? `계좌: ${accounts.length}개` : '계좌 없음'}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => router.push('/products')}
            >
              금융상품 페이지로 이동
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 총 요약 정보 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-3">내 금융상품 요약</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-md">
                  <p className="text-gray-600 text-sm">총 가입 상품</p>
                  <p className="text-xl font-bold text-blue-700">{Array.isArray(myProducts) ? myProducts.length : 0}개</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-md">
                  <p className="text-gray-600 text-sm">총 투자/예금액</p>
                  <p className="text-xl font-bold text-blue-700">
                    {formatCurrency(getTotalInvestment())}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-md">
                  <p className="text-gray-600 text-sm">총 대출잔액</p>
                  <p className="text-xl font-bold text-blue-700">
                    {formatCurrency(getTotalLoan())}
                  </p>
                </div>
              </div>
            </div>
            
            {/* 상품 목록 */}
            <div className="space-y-4">
              {Array.isArray(myProducts) && myProducts.map((subscription) => {
                const statusInfo = getStatusInfo(subscription.status);
                const isChecking = subscription.productCategory === 'CHECKING';
                const isLoan = subscription.productCategory === 'LOAN';
                
                return (
                  <div key={subscription.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold">{subscription.productName}</h3>
                        <span 
                          className={`px-2 py-1 text-xs font-semibold rounded-full bg-${statusInfo.color}-100 text-${statusInfo.color}-800`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {getProductTypeLabel(subscription.productCategory)}
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <div className="space-y-3">
                            {!isChecking && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">{isLoan ? '대출 잔액' : '가입 금액'}</span>
                                <span className="font-medium">{formatCurrency(Math.abs(subscription.amount))}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-600">연 이자율</span>
                              <span className="font-medium">
                                {isChecking && (!subscription.interestRate || subscription.interestRate === 0) 
                                  ? '1.8%' 
                                  : `${subscription.interestRate || 0}%`}
                              </span>
                            </div>
                            {isChecking && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">금융상품명</span>
                                <span className="font-medium">{subscription.productName || '기본 입출금계좌'}</span>
                              </div>
                            )}
                            {isChecking && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">현재 잔액</span>
                                <span className="font-medium">{formatCurrency(Math.abs(subscription.amount || 0))}</span>
                              </div>
                            )}
                            {isChecking && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">계좌 유형</span>
                                <span className="font-medium">입출금 자유</span>
                              </div>
                            )}
                            {!isChecking && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">가입 기간</span>
                                <span className="font-medium">
                                  {subscription.term ? `${subscription.term}개월` : '없음'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">가입일</span>
                              <span className="font-medium">{formatDate(subscription.startDate)}</span>
                            </div>
                            {!isChecking && subscription.endDate && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">만기일</span>
                                <span className="font-medium">{formatDate(subscription.endDate)}</span>
                              </div>
                            )}
                            {isChecking && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">계좌번호</span>
                                <span className="font-medium">
                                  {subscription.displayAccountNumber || '정보 없음'}
                                </span>
                              </div>
                            )}
                            {!isChecking && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">연계 계좌</span>
                                <span className="font-medium">
                                  {subscription.displayAccountNumber ? 
                                   formatAccountNumber(subscription.displayAccountNumber) : 
                                   '연결 계좌 없음'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {isChecking && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="bg-yellow-50 p-3 rounded-md text-yellow-700 text-sm">
                            입출금 계좌는 별도의 가입 금액 없이 언제든지 입출금이 가능합니다.
                          </div>
                        </div>
                      )}
                      
                      {isLoan && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="bg-blue-50 p-3 rounded-md text-blue-700 text-sm">
                            대출 잔액은 현재 상환해야 할 금액입니다. 계좌 관리에서 상환할 수 있습니다.
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-6 flex justify-end">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => router.push(`/accounts/${subscription.id}`)}
                        >
                          계좌 관리하기
                        </Button>
                        
                        {/* {!isChecking && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-2"
                          >
                            해지하기
                          </Button>
                        )} */}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MyProductsPage; 