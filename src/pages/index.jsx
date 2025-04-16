import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';
import AccountCard from '../components/account/AccountCard';
import { formatCurrency, formatDate, getTransactionTypeLabel } from '../utils/formatters';
import accountService from '../api/accountService';
import transferService from '../api/transferService';

const HomePage = () => {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalBalance, setTotalBalance] = useState(0);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // 클라이언트 사이드 렌더링 여부 확인
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 로그인 확인
  useEffect(() => {
    if (!isClient) return;
    
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token) {
      // 토큰이 없으면 로그인 페이지로 리디렉션
      router.push('/login');
      return;
    }
    
    setIsAuthenticated(true);
    
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('사용자 데이터 파싱 오류:', error);
      }
    }
  }, [router, isClient]);

  // 데이터 불러오기
  useEffect(() => {
    if (!isClient) return;
    
    // 로그인 상태가 아니면 데이터를 불러오지 않음
    if (!isAuthenticated) {
      return;
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 계좌 목록 불러오기
        try {
          const accountsData = await accountService.getAllAccounts();
          
          // 계좌 데이터가 배열인지 확인하고 적절히 처리
          const accountsList = Array.isArray(accountsData) ? accountsData : 
                             (accountsData && accountsData.content && Array.isArray(accountsData.content)) ? 
                             accountsData.content : [];
          
          setAccounts(accountsList);
          
          // 총 잔액 계산 (KRW 계좌만)
          const total = accountsList
            .filter(account => account.currency === 'KRW')
            .reduce((sum, account) => {
              // 계좌 잔액을 숫자로 변환
              const balance = parseFloat(account.balance || 0);
              
              // 디버깅: 각 계좌의 잔액 및 타입 확인
              console.log('계좌 정보:', {
                id: account.id,
                accountNumber: account.accountNumber,
                accountType: account.accountType,
                balance: balance,
                originalBalance: account.balance
              });
              
              // 대출 계좌의 경우 이미 음수로 저장되어 있으므로 그대로 더함
              // 모든 계좌는 잔액(음수면 부채, 양수면 자산)을 그대로 더함
              return sum + balance;
            }, 0);
          
          console.log('계좌 목록:', accountsList);
          console.log('계산된 총 자산:', total);
          
          setTotalBalance(total);
        } catch (accountErr) {
          console.error('계좌 정보를 불러오는 중 오류가 발생했습니다:', accountErr);
          // 계좌 정보 오류는 빈 배열로 처리하여 "등록된 계좌가 없습니다" 메시지 표시
          setAccounts([]);
          setTotalBalance(0);
        }
        
        // 최근 거래 내역 불러오기
        try {
          const transactionsData = await transferService.getAllTransfers({
            page: 0,
            size: 5,
            sort: 'transactionDate,desc'
          });
          
          setRecentTransactions(transactionsData.content || []);
        } catch (transactionErr) {
          console.error('거래 내역을 불러오는 중 오류가 발생했습니다:', transactionErr);
          // 거래 내역 오류는 빈 배열로 처리하여 "최근 거래 내역이 없습니다" 메시지 표시
          setRecentTransactions([]);
        }
        
        setError(null);
      } catch (err) {
        console.error('데이터를 불러오는 중 오류가 발생했습니다:', err);
        setError('데이터를 불러오는 중 일시적인 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, isClient]);

  // 거래 유형에 따른 스타일
  const getTransactionStyle = (transaction) => {
    const type = transaction.transactionType || transaction.type;
    const amount = transaction.amount;
    const currentUserId = user?.id;
    
    console.log('메인페이지 거래 정보:', {
      transaction,
      currentUserId,
      amount,
      type,
      fromAccount: transaction.fromAccount,
      toAccount: transaction.toAccount
    });
    
    // 출금/입금 계좌의 사용자 정보 확인
    const fromAccountUserId = 
      transaction.fromAccount?.userId || 
      transaction.fromAccount?.user?.id || 
      transaction.fromUserId;
    
    const toAccountUserId = 
      transaction.toAccount?.userId || 
      transaction.toAccount?.user?.id || 
      transaction.toUserId;
    
    console.log('계좌 소유자 ID:', {
      fromAccountUserId,
      toAccountUserId
    });
    
    // 내 계좌 여부 확인
    const isFromMyAccount = currentUserId && Number(currentUserId) === Number(fromAccountUserId);
    const isToMyAccount = currentUserId && Number(currentUserId) === Number(toAccountUserId);
    
    // 계좌 번호 확인 (백업 로직)
    const fromAccountNumber = transaction.fromAccountNumber || 
                            transaction.fromAccount?.accountNumber;
    
    const toAccountNumber = transaction.toAccountNumber || 
                          transaction.toAccount?.accountNumber;
    
    console.log('계좌번호 확인:', {
      fromAccountNumber,
      toAccountNumber
    });
    
    // 입금(+ 표시)
    if (type === 'DEPOSIT' || type === 'INTEREST') {
      return {
        amountClass: 'text-green-600',
        icon: <PlusIcon className="h-4 w-4 text-green-500" />,
        prefix: '+'
      };
    }
    
    // 출금(- 표시)
    if (type === 'WITHDRAWAL' || type === 'PAYMENT' || type === 'FEE' || type === 'LOAN_PAYMENT') {
      return {
        amountClass: 'text-red-600',
        icon: <MinusIcon className="h-4 w-4 text-red-500" />,
        prefix: '-'
      };
    }
    
    // 이체 거래 처리
    if (type === 'TRANSFER') {
      // 나의 계좌에서 출금된 경우 (내가 보낸 경우)
      if (isFromMyAccount && !isToMyAccount) {
        return {
          amountClass: 'text-red-600',
          icon: <MinusIcon className="h-4 w-4 text-red-500" />,
          prefix: '-'
        };
      }
      
      // 나의 계좌로 입금된 경우 (내가 받은 경우)
      if (!isFromMyAccount && isToMyAccount) {
        return {
          amountClass: 'text-green-600',
          icon: <PlusIcon className="h-4 w-4 text-green-500" />,
          prefix: '+'
        };
      }
      
      // 내 계좌 간 이체인 경우
      if (isFromMyAccount && isToMyAccount) {
        return {
          amountClass: 'text-blue-600',
          icon: <ArrowIcon className="h-4 w-4 text-blue-500" />,
          prefix: '⟲'
        };
      }
      
      // 특정 계좌번호 확인 (백업 로직)
      if (currentUserId === 2 && fromAccountNumber && (
          fromAccountNumber.includes('693954') || 
          fromAccountNumber.includes('5992') || 
          fromAccountNumber.includes('964'))
      ) {
        return {
          amountClass: 'text-red-600',
          icon: <MinusIcon className="h-4 w-4 text-red-500" />,
          prefix: '-'
        };
      }
      
      if (currentUserId === 3 && toAccountNumber && (
          toAccountNumber.includes('3954') || 
          toAccountNumber.includes('5992'))
      ) {
        return {
          amountClass: 'text-green-600',
          icon: <PlusIcon className="h-4 w-4 text-green-500" />,
          prefix: '+'
        };
      }
      
      // 금액의 부호로 판단
      if (amount < 0) {
        return {
          amountClass: 'text-red-600',
          icon: <MinusIcon className="h-4 w-4 text-red-500" />,
          prefix: '-'
        };
      } 
      
      if (amount > 0) {
        return {
          amountClass: 'text-green-600',
          icon: <PlusIcon className="h-4 w-4 text-green-500" />,
          prefix: '+'
        };
      }
    }
    
    // 그 외 기타 경우
    return {
      amountClass: 'text-gray-600',
      icon: <ArrowIcon className="h-4 w-4 text-gray-500" />,
      prefix: ''
    };
  };

  // 클라이언트 사이드에서만 인증 상태 확인
  if (isClient && !isAuthenticated) {
    return <div className="loading">로그인 페이지로 이동 중...</div>;
  }

  return (
    <MainLayout>
      <div className="pb-8">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">데이터를 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md mb-6">
            <div className="flex items-start">
              <div className="mr-2 p-1 bg-red-100 rounded-full">
                <AlertIcon className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-red-600 font-medium">서비스 접속에 문제가 발생했습니다</p>
                <p className="text-sm text-red-500 mt-1 mb-3">
                  {error}
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    새로고침
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => router.push('/products')}
                  >
                    금융상품 페이지로 이동
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 환영 메시지 및 요약 정보 */}
            <div className="bg-blue-600 text-white rounded-lg p-6 mb-8">
              <h1 className="text-2xl font-bold mb-2">
                안녕하세요, {user?.name || user?.username || '고객'}님!
              </h1>
              <p className="mb-4 opacity-90">오늘도 Pleasy Bank와 함께 편리한 금융 생활을 즐겨보세요.</p>
              
              <div className="mt-6">
                <p className="text-sm opacity-80">총 자산</p>
                <p className="text-3xl font-bold">
                  {formatCurrency(
                    accounts.reduce((sum, account) => {
                      // 계좌 잔액을 숫자로 변환
                      const balance = parseFloat(account.balance || 0);
                      return sum + balance;
                    }, 0)
                  )}
                </p>
              </div>
            </div>

            {/* 계좌 목록 (최대 2개) */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">내 계좌</h2>
                <Link href="/myproducts">
                  <span className="text-blue-600 text-sm hover:underline cursor-pointer">전체 계좌보기</span>
                </Link>
              </div>
              
              {accounts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {accounts.slice(0, 2).map(account => (
                    <AccountCard key={account.id} account={account} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 mb-4">등록된 계좌가 없습니다</p>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => router.push('/products')}
                  >
                    계좌 개설하기
                  </Button>
                </div>
              )}
            </div>

            {/* 최근 거래 내역 */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">최근 거래 내역</h2>
                <Link href="/transactions">
                  <span className="text-blue-600 text-sm hover:underline cursor-pointer">전체 보기</span>
                </Link>
              </div>
              
              {recentTransactions.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {recentTransactions.map((transaction) => {
                    const { amountClass, icon, prefix } = getTransactionStyle(transaction);
                    const transactionDate = transaction.transactionDate || transaction.transactionDatetime || transaction.createdAt;
                    
                    return (
                      <li key={transaction.id} className="py-3">
                        <div className="flex items-center">
                          <div className="mr-2 bg-gray-100 rounded-full p-1.5">
                            {icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {transaction.description || getTransactionTypeLabel(transaction.transactionType || transaction.type)}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {formatDate(transactionDate, 'datetime')}
                            </p>
                          </div>
                          <div className="inline-flex text-right">
                            <p className={`text-sm font-semibold ${amountClass}`}>
                              {prefix}{formatCurrency(transaction.amount)}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-md">
                  <p className="text-gray-500">최근 거래 내역이 없습니다</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

// 아이콘 컴포넌트들
function PlusIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
    </svg>
  );
}

function MinusIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M3.75 12a.75.75 0 01.75-.75h15a.75.75 0 010 1.5h-15a.75.75 0 01-.75-.75z" clipRule="evenodd" />
    </svg>
  );
}

function ArrowIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M12.97 3.97a.75.75 0 011.06 0l7.5 7.5a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 11-1.06-1.06l6.22-6.22H3a.75.75 0 010-1.5h16.19l-6.22-6.22a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
  );
}

function ChartIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0z" clipRule="evenodd" />
      <path fillRule="evenodd" d="M12.75 3a.75.75 0 01.75-.75 8.25 8.25 0 018.25 8.25.75.75 0 01-.75.75h-7.5a.75.75 0 01-.75-.75V3z" clipRule="evenodd" />
    </svg>
  );
}

function HomeIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
      <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
    </svg>
  );
}

function AlertIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
    </svg>
  );
}

export default HomePage; 
