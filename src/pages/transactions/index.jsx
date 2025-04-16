import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import axios from '../../utils/axiosConfig';

// 거래내역 페이지 컴포넌트
const TransactionsPage = () => {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize, setPageSize] = useState(10);

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
      router.push('/login');
      return;
    }
    
    setIsAuthenticated(true);
    fetchTransactions(currentPage, pageSize);
  }, [isClient, currentPage, pageSize, router]);

  // 현재 로그인한 사용자 ID 가져오기
  const getCurrentUserId = () => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          console.log('현재 로그인한 사용자:', user);
          return user.id;
        } catch (e) {
          console.error('사용자 정보 파싱 오류:', e);
        }
      }
    }
    return null;
  };

  const fetchTransactions = async (page, size) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/transactions?page=${page}&size=${size}`);
      console.log('거래내역 응답:', response.data); // 디버깅용 로그
      
      // API 응답 구조에 따라 데이터 추출
      let content = [];
      if (response.data && Array.isArray(response.data)) {
        // 응답이 바로 배열인 경우
        content = response.data;
        setTotalPages(Math.ceil(response.data.length / size) || 1);
      } else if (response.data && response.data.content && Array.isArray(response.data.content)) {
        // content 속성에 배열이 있는 경우
        content = response.data.content;
        setTotalPages(response.data.totalPages || Math.ceil(content.length / size) || 1);
      } else if (response.data && typeof response.data === 'object') {
        // 다른 구조인 경우
        content = [response.data];
        setTotalPages(1);
      }
      
      // 데이터 직접 확인을 위한 로깅
      console.log('처리된 거래내역 데이터:', content);
      
      setTransactions(content);
      setError(null);
    } catch (err) {
      console.error('거래내역을 불러오는 중 오류가 발생했습니다:', err);
      setError('거래내역을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // 금액 포맷팅 함수
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '-';
    
    return new Intl.NumberFormat('ko-KR', { 
      style: 'currency', 
      currency: 'KRW',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  // 계좌번호 포맷팅 함수 (마스킹 처리)
  const formatAccountNumber = (accountNumber) => {
    if (!accountNumber) return '-';
    
    // 계좌번호가 충분히 길면 마스킹 처리
    if (accountNumber.length > 8) {
      const first = accountNumber.substring(0, 4);
      const last = accountNumber.substring(accountNumber.length - 4);
      return `${first}-****-${last}`;
    }
    
    return accountNumber;
  };
  
  // 날짜 포맷팅 함수 - 연도(2자리)-월(2자리)-일(2자리) 형식으로 변경
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    // 날짜가 "Invalid Date"인 경우 바로 확인
    if (dateString === "Invalid Date") return '-';
    
    // 날짜 객체 생성 시도
    let date;
    
    // 날짜가 숫자인 경우 타임스탬프로 처리
    if (!isNaN(Number(dateString)) && Number(dateString) > 1000000000) {
      try {
        date = new Date(Number(dateString));
      } catch (error) {
        console.error('타임스탬프 변환 오류:', error);
      }
    } 
    // YYYYMMDD 형식인 경우
    else if (typeof dateString === 'string' && /^\d{8}$/.test(dateString)) {
      const year = dateString.substring(2, 4); // YY (마지막 2자리)
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      
      return `${year}-${month}-${day}`;
    }
    // ISO 형식이거나 일반 날짜 문자열인 경우
    else if (typeof dateString === 'string') {
      try {
        if (dateString.includes('T') || dateString.includes('-') || dateString.includes('/')) {
          date = new Date(dateString);
        } else if (dateString.length === 10 && /^\d{4}\d{2}\d{2}$/.test(dateString)) {
          // YYYYMMDD 형식 (숫자만)
          const year = dateString.substring(2, 4);
          const month = dateString.substring(4, 6);
          const day = dateString.substring(6, 8);
          return `${year}-${month}-${day}`;
        }
      } catch (error) {
        console.error('날짜 변환 오류:', error);
      }
    }
    
    // 날짜 객체가 유효하면 YY-MM-DD 형식으로 포맷팅
    if (date && !isNaN(date.getTime())) {
      const year = date.getFullYear().toString().slice(-2); // 마지막 2자리만
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // 메인 페이지처럼 현재 날짜 표시 (필요 시 백엔드와 협의 필요)
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };
  
  // 시간 포맷팅 함수
  const formatTime = (dateTimeString) => {
    if (!dateTimeString) return '';
    
    // 날짜가 "Invalid Date"인 경우 바로 확인
    if (dateTimeString === "Invalid Date") return '';
    
    let date;
    
    // 날짜가 숫자인 경우 타임스탬프로 처리
    if (!isNaN(Number(dateTimeString)) && Number(dateTimeString) > 1000000000) {
      try {
        date = new Date(Number(dateTimeString));
      } catch (error) {
        console.error('타임스탬프 변환 오류:', error);
      }
    } 
    // HHmmss 형식인 경우
    else if (typeof dateTimeString === 'string' && /^\d{6}$/.test(dateTimeString)) {
      const hour = dateTimeString.substring(0, 2);
      const minute = dateTimeString.substring(2, 4);
      
      return `${hour}:${minute}`;
    } 
    // ISO 형식이거나 일반 날짜 문자열인 경우
    else if (typeof dateTimeString === 'string') {
      try {
        date = new Date(dateTimeString);
      } catch (error) {
        console.error('시간 변환 오류:', error);
      }
    }
    
    // 날짜 객체가 유효하면 HH:MM 형식으로 포맷팅
    if (date && !isNaN(date.getTime())) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    
    return '';
  };

  // 날짜와 시간을 함께 포맷팅하는 함수
  const formatDateTime = (transaction) => {
    // created_at 필드 사용
    const dateSource = transaction.created_at || transaction.createdAt || transaction.transactionDate;
    const timeSource = transaction.transactionDateTime || 
                      transaction.transactionDatetime || 
                      transaction.transaction_datetime || 
                      transaction.created_at ||
                      transaction.createdAt ||
                      transaction.transactionDate;
    
    // 날짜와 시간 포맷팅
    const formattedDate = formatDate(dateSource);
    const formattedTime = formatTime(timeSource);
    
    // 날짜와 시간을 함께 표시
    if (formattedDate === '-' && !formattedTime) {
      return '-';
    } else if (formattedDate === '-') {
      return formattedTime;
    } else if (!formattedTime) {
      return formattedDate;
    }
    
    return `${formattedDate} ${formattedTime}`;
  };

  // 거래 유형에 따른 스타일 및 텍스트
  const getTransactionTypeInfo = (transaction) => {
    const type = transaction.type;
    const amount = transaction.amount;
    const currentUserId = getCurrentUserId();
    
    console.log('거래 분류 정보:', {
      transactionId: transaction.id,
      type: type,
      amount: amount,
      currentUserId: currentUserId,
      fromAccount: transaction.fromAccount,
      toAccount: transaction.toAccount
    });
    
    // 출금/입금 계좌의 사용자 정보 확인 (다양한 API 응답 구조 대응)
    const fromAccountUserId = 
      transaction.fromAccount?.userId || 
      transaction.fromAccount?.user?.id || 
      transaction.fromUserId;
    
    const toAccountUserId = 
      transaction.toAccount?.userId || 
      transaction.toAccount?.user?.id || 
      transaction.toUserId;
    
    console.log('계좌 소유자 ID:', {
      fromAccountUserId: fromAccountUserId,
      toAccountUserId: toAccountUserId
    });
    
    // 내 계좌 여부 확인
    const isFromMyAccount = currentUserId && Number(currentUserId) === Number(fromAccountUserId);
    const isToMyAccount = currentUserId && Number(currentUserId) === Number(toAccountUserId);
    
    console.log('내 계좌 여부:', {
      isFromMyAccount: isFromMyAccount,
      isToMyAccount: isToMyAccount
    });

    // 내 계좌 번호 확인 (백업 로직)
    let myAccounts = [];
    try {
      myAccounts = JSON.parse(localStorage.getItem('userAccounts') || '[]');
    } catch (e) {
      console.error('계좌 정보 파싱 오류:', e);
      myAccounts = [];
    }
    
    const myAccountNumbers = myAccounts.map(acc => acc.accountNumber);
    
    // 출금/입금 계좌번호
    const fromAccountNumber = transaction.fromAccountNumber || 
                            transaction.fromAccount?.accountNumber;
    
    const toAccountNumber = transaction.toAccountNumber || 
                          transaction.toAccount?.accountNumber;
    
    const isFromMyAccountNumber = myAccountNumbers.includes(fromAccountNumber);
    const isToMyAccountNumber = myAccountNumbers.includes(toAccountNumber);

    console.log('계좌번호 확인:', {
      myAccountNumbers,
      fromAccountNumber,
      toAccountNumber,
      isFromMyAccountNumber,
      isToMyAccountNumber
    });

    // 다음의 우선순위로 거래 유형을 판단합니다:
    // 1. 내 계좌가 출금 계좌인지 입금 계좌인지 직접 확인
    // 2. 금액의 부호로 판단
    // 3. 계좌번호로 판단
    // 4. 기타 로직으로 판단
    
    // 기본 유형 처리
    if (type === 'DEPOSIT') {
      return {
        color: 'text-green-600',
        sign: '+',
        label: '입금'
      };
    } 
    
    if (type === 'WITHDRAWAL') {
      return {
        color: 'text-red-600',
        sign: '-',
        label: '출금'
      };
    }
    
    // 이체 유형 처리 (TRANSFER)
    if (type === 'TRANSFER') {
      // 로그인한 사용자가 보낸 이체 (user_id=2인 경우 -로 표시)
      if (isFromMyAccount && !isToMyAccount) {
        return {
          color: 'text-red-600',
          sign: '-',
          label: '이체함'
        };
      }
      
      // 로그인한 사용자가 받은 이체 (user_id=3인 경우 +로 표시)
      if (!isFromMyAccount && isToMyAccount) {
        return {
          color: 'text-green-600',
          sign: '+',
          label: '이체받음'
        };
      }
      
      // 내 계좌 간 이체
      if (isFromMyAccount && isToMyAccount) {
        return {
          color: 'text-blue-600',
          sign: '↔',
          label: '내 계좌 이체'
        };
      }
      
      // 계좌 번호로 추가 확인 (백업 로직)
      if (isFromMyAccountNumber && !isToMyAccountNumber) {
        return {
          color: 'text-red-600',
          sign: '-',
          label: '이체함'
        };
      }
      
      if (!isFromMyAccountNumber && isToMyAccountNumber) {
        return {
          color: 'text-green-600',
          sign: '+',
          label: '이체받음'
        };
      }
      
      // 특정 계좌번호 확인 (백업 로직 2)
      if (currentUserId === 2 && fromAccountNumber && fromAccountNumber.includes('693954')) {
        return {
          color: 'text-red-600',
          sign: '-',
          label: '이체함'
        };
      }
      
      if (currentUserId === 3 && toAccountNumber && toAccountNumber.includes('3954')) {
        return {
          color: 'text-green-600',
          sign: '+',
          label: '이체받음'
        };
      }
      
      // 마지막으로 금액 부호로 판단
      if (amount < 0) {
        return {
          color: 'text-red-600',
          sign: '-',
          label: '이체함'
        };
      } 
      
      if (amount > 0) {
        return {
          color: 'text-green-600',
          sign: '+',
          label: '이체받음'
        };
      }
      
      // 기본값
      return {
        color: 'text-gray-600',
        sign: '',
        label: '이체'
      };
    }
    
    // 기타 거래 유형에 대한 기본값
    return {
      color: 'text-gray-600',
      sign: '',
      label: '기타'
    };
  };

  // 로그인 상태가 아니면 빈 페이지 렌더링 (로그인 페이지로 리디렉션 중)
  if (isClient && !isAuthenticated) {
    return <div className="loading">로그인 페이지로 이동 중...</div>;
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">전체 계좌 거래내역</h1>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md mb-6">
            <p className="text-red-600">{error}</p>
            <button
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              onClick={() => fetchTransactions(currentPage, pageSize)}
            >
              다시 시도
            </button>
          </div>
        ) : (
          <div>
            {transactions.length === 0 ? (
              <div className="bg-white shadow rounded-lg p-6 text-center">
                <p className="text-gray-500">거래내역이 없습니다.</p>
              </div>
            ) : (
              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">출금계좌</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">입금계좌</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">내용</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">유형</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.map((transaction, index) => {
                        // 전체 트랜잭션 데이터 확인 (디버깅용)
                        console.log('트랜잭션 전체 데이터:', transaction);
                        
                        const typeInfo = getTransactionTypeInfo(transaction);
                        
                        // 날짜와 시간을 함께 표시
                        const formattedDateTime = formatDateTime(transaction);
                        
                        // 출금/입금 계좌 정보
                        const fromAccount = transaction.fromAccountNumber ? transaction.fromAccountNumber : 
                                         transaction.fromAccount ? transaction.fromAccount.accountNumber : null;
                        
                        const toAccount = transaction.toAccountNumber ? transaction.toAccountNumber : 
                                       transaction.toAccount ? transaction.toAccount.accountNumber : null;
                        
                        return (
                          <tr key={transaction.id || index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formattedDateTime}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {fromAccount ? formatAccountNumber(fromAccount) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {toAccount ? formatAccountNumber(toAccount) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {transaction.description || '거래내역'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100">
                                {typeInfo.label}
                              </span>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${typeInfo.color}`}>
                              {typeInfo.sign} {formatCurrency(Math.abs(transaction.amount))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                        className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                          currentPage === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        이전
                      </button>
                      <button
                        onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
                        disabled={currentPage === totalPages - 1}
                        className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                          currentPage === totalPages - 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        다음
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          전체 <span className="font-medium">{totalPages}</span> 페이지 중{' '}
                          <span className="font-medium">{currentPage + 1}</span> 페이지
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => handlePageChange(0)}
                            disabled={currentPage === 0}
                            className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                              currentPage === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <span className="sr-only">처음</span>
                            <span>&laquo;</span>
                          </button>
                          <button
                            onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
                            disabled={currentPage === 0}
                            className={`relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium ${
                              currentPage === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <span className="sr-only">이전</span>
                            <span>&lt;</span>
                          </button>
                          
                          {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                            // 현재 페이지를 중심으로 표시할 페이지 번호 계산
                            let pageToShow;
                            if (totalPages <= 5) {
                              pageToShow = idx;
                            } else if (currentPage < 2) {
                              pageToShow = idx;
                            } else if (currentPage > totalPages - 3) {
                              pageToShow = totalPages - 5 + idx;
                            } else {
                              pageToShow = currentPage - 2 + idx;
                            }
                            
                            return (
                              <button
                                key={pageToShow}
                                onClick={() => handlePageChange(pageToShow)}
                                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                                  currentPage === pageToShow
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {pageToShow + 1}
                              </button>
                            );
                          })}
                          
                          <button
                            onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
                            disabled={currentPage === totalPages - 1}
                            className={`relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium ${
                              currentPage === totalPages - 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <span className="sr-only">다음</span>
                            <span>&gt;</span>
                          </button>
                          <button
                            onClick={() => handlePageChange(totalPages - 1)}
                            disabled={currentPage === totalPages - 1}
                            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                              currentPage === totalPages - 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <span className="sr-only">마지막</span>
                            <span>&raquo;</span>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default TransactionsPage; 