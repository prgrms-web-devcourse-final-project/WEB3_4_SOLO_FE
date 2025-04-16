import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import accountService from '../../api/accountService';
import transferService from '../../api/transferService';
import { toast } from 'react-hot-toast';

const AccountDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  
  const [account, setAccount] = useState(null);
  const [productInfo, setProductInfo] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [closeAccountModal, setCloseAccountModal] = useState(false);
  const [otherAccounts, setOtherAccounts] = useState([]);
  const [selectedTransferAccount, setSelectedTransferAccount] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [closeError, setCloseError] = useState('');

  // 계좌 정보 및 거래 내역 불러오기
  useEffect(() => {
    const fetchAccountDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // 계좌 정보 불러오기
        const accountData = await accountService.getAccountById(id);
        setAccount(accountData);
        
        // 다른 활성 계좌 목록 불러오기
        const allAccounts = await accountService.getAllAccounts();
        const filteredAccounts = Array.isArray(allAccounts) 
          ? allAccounts.filter(acc => acc.id !== parseInt(id) && acc.status === 'ACTIVE')
          : [];
        setOtherAccounts(filteredAccounts);

        // 첫 번째 계좌를 기본 선택
        if (filteredAccounts.length > 0) {
          setSelectedTransferAccount(filteredAccounts[0].id.toString());
        }
        
        // 대출계좌일 경우 다른 계좌 중 첫번째를 기본 선택
        if ((accountData.accountType === 'LOAN') && filteredAccounts.length > 0) {
          setSelectedTransferAccount(filteredAccounts[0].id.toString());
        }
        
        // 금융 상품 정보 불러오기 (계좌에 연결된 상품 ID 사용)
        if (accountData.productId) {
          try {
            const productData = await accountService.getProductById(accountData.productId);
            setProductInfo(productData);
          } catch (productErr) {
            console.error('금융 상품 정보를 불러오는 중 오류가 발생했습니다:', productErr);
            // 금융 상품 정보가 없어도 계좌 정보는 계속 표시
          }
        }
        
        // 거래 내역 불러오기
        const transactionsData = await transferService.getTransfersByAccountId(id, {
          page: 0,
          size: 10,
          sort: 'transactionDate,desc'
        }).catch(() => ({ content: [], totalPages: 0 })); // 거래 내역 에러가 전체 페이지에 영향을 주지 않도록 함
        
        setTransactions(transactionsData.content || []);
        setHasMore((transactionsData.totalPages || 0) > 1);
        setError(null);
      } catch (err) {
        console.error('계좌 정보를 불러오는 중 오류가 발생했습니다:', err);
        setError('계좌 정보를 불러올 수 없습니다. 나중에 다시 시도해 주세요.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAccountDetails();
    }
  }, [id]);

  // 계좌 거래 내역 불러오기
  const fetchTransactions = async () => {
    try {
      setLoadingMore(true);
      const transactionsData = await transferService.getTransfersByAccountId(
        id,
        {
          page: page,
          size: 10,
          sort: 'transactionDate,desc'
        }
      );
      
      if (page === 0) {
        setTransactions(transactionsData.content);
      } else {
        setTransactions(prev => [...prev, ...transactionsData.content]);
      }
      
      setPage(prev => prev + 1);
      setHasMore(transactionsData.number < transactionsData.totalPages - 1);
    } catch (err) {
      console.error('거래 내역을 불러오는 중 오류가 발생했습니다:', err);
    } finally {
      setLoadingMore(false);
    }
  };
  
  // 잔액 이체 후 계좌 해지 처리
  const handleTransferAndClose = async () => {
    setIsClosing(true);
    setCloseError(null);
    
    try {
      // 대출 계좌 상환 또는 일반 계좌 해지 처리
      if (account.balance > 0) {
        if (!selectedTransferAccount) {
          setCloseError('이체할 계좌를 선택해주세요.');
          setIsClosing(false);
          return;
        }

        // 대출 계좌 상환 또는 일반 계좌 잔액 이체
        if (productInfo?.category === 'LOAN' || account.accountType === 'LOAN') {
          // 대출금 상환 - transferData에 description 추가
          const transferData = {
            amount: account.balance,
            description: `[${account.accountNumber}] 대출금 상환`,
            transactionType: 'LOAN_PAYMENT' // 명시적으로 거래 유형 설정
          };
          
          console.log('대출금 상환 데이터:', transferData);
          
          await accountService.transferBetweenAccounts(
            selectedTransferAccount, // 출금계좌 (사용자 선택)
            id, // 대출 계좌 (현재 상세 페이지의 계좌)
            transferData
          );
        } else {
          // 잔액 이체 - transferData에 description 추가
          const transferData = {
            amount: account.balance,
            description: `[${account.accountNumber}] 계좌 해지 잔액 이체`
          };
          
          await accountService.transferBetweenAccounts(
            id, // 출금계좌 (현재 상세 페이지의 계좌)
            selectedTransferAccount, // 입금계좌 (사용자 선택)
            transferData
          );
        }
      }
      
      // 계좌 해지 API 호출
      console.log(`계좌 ID ${id}에 대한 해지 요청`);
      await accountService.closeAccount(id);
      console.log(`계좌 ID ${id} 해지 완료`);
      
      // 성공 메시지 표시
      toast.success(
        (productInfo?.category === 'LOAN' || account.accountType === 'LOAN') ?
        '대출 계좌가 정상적으로 상환되었습니다.' :
        '계좌가 정상적으로 해지되었습니다.'
      );
      
      // 모달 닫기 및 홈 페이지로 이동
      setCloseAccountModal(false);
      router.push('/');
    } catch (error) {
      console.error('계좌 해지 중 오류 발생:', error);
      setCloseError(
        error.response?.data?.message || 
        '계좌 해지 중 오류가 발생했습니다. 고객센터에 문의하세요.'
      );
      setIsClosing(false);
    }
  };

  // 거래 유형에 따른 스타일
  const getTransactionStyle = (transaction) => {
    const type = transaction.transactionType;
    
    if (type === 'DEPOSIT' || type === 'INTEREST') {
      return {
        amountClass: 'text-green-600',
        icon: <PlusIcon className="h-4 w-4 text-green-500" />,
        prefix: '+'
      };
    } else if (type === 'WITHDRAWAL' || type === 'TRANSFER' || type === 'PAYMENT' || type === 'FEE' || type === 'LOAN_PAYMENT') {
      return {
        amountClass: 'text-red-600',
        icon: <MinusIcon className="h-4 w-4 text-red-500" />,
        prefix: '-'
      };
    } else {
      return {
        amountClass: 'text-gray-600',
        icon: <ArrowIcon className="h-4 w-4 text-gray-500" />,
        prefix: ''
      };
    }
  };

  // 계좌 유형에 따른 라벨
  const getAccountTypeLabel = (type) => {
    switch (type) {
      case 'CHECKING':
        return '입출금 자유';
      case 'SAVINGS':
        return '저축 계좌';
      case 'LOAN':
        return '대출 계좌';
      default:
        return '기타 계좌';
    }
  };

  // 거래 유형 표시 함수 수정
  const renderTransactionType = (type, account, transaction) => {
    // type이 없는 경우 기본값
    if (!type) return '기타';

    // 대문자로 변환하여 일관성 있게 처리
    const transactionType = type.toUpperCase();
    
    if (account.accountType === 'LOAN' || productInfo?.category === 'LOAN') {
      // 대출 계좌일 경우 거래 유형 확인
      
      // 대출 실행 확인 (금액이 양수이고 초기 거래인 경우)
      if (['INITIAL_DEPOSIT', 'LOAN_DISBURSEMENT'].includes(transactionType) || 
          (transaction.amount > 0 && transaction.description?.includes('실행'))) {
        return '대출금 실행';
      }
      
      // 대출 상환 확인 (입금 거래이면서 상환 관련 내용이 있는 경우)
      const isRepayment = 
        (transaction.toAccountId && parseInt(transaction.toAccountId) === parseInt(id)) || 
        ['DEPOSIT', 'TRANSFER_IN', 'LOAN_PAYMENT'].includes(transactionType) ||
        (transaction.description && (
          transaction.description.includes('상환') || 
          transaction.description.includes('대출금')
        ));
      
      if (isRepayment) {
        return '대출금 상환';
      }
      
      // 기타 거래 유형
      switch (transactionType) {
        case 'WITHDRAWAL':
        case 'WITHDRAW':
          return '출금';
        case 'TRANSFER':
        case 'TRANSFER_OUT':
          return '이체 출금';
        default:
          return transactionType;
      }
    } else {
      // 일반 계좌
      switch (transactionType) {
        case 'DEPOSIT':
          return '입금';
        case 'WITHDRAWAL':
        case 'WITHDRAW':
          return '출금';
        case 'TRANSFER':
          // 입금인지 출금인지 구분
          if (transaction.toAccountId === parseInt(id)) {
            return '이체 입금';
          } else {
            return '이체 출금';
          }
        case 'TRANSFER_IN':
          return '이체 입금';
        case 'TRANSFER_OUT':
          return '이체 출금';
        case 'INTEREST':
          return '이자';
        case 'FEE':
          return '수수료';
        case 'INITIAL_DEPOSIT':
          return '초기 입금';
        case 'LOAN_DISBURSEMENT':
          return '대출금 실행';
        case 'LOAN_PAYMENT':
          return '대출금 상환';
        default:
          return transactionType;
      }
    }
  };

  // 금액 색상 결정 함수 수정
  const determineAmountColor = (type, amount, account) => {
    if (account.accountType === 'LOAN' || productInfo?.category === 'LOAN') {
      switch (type) {
        case 'DEPOSIT':
        case 'TRANSFER_IN':
        case 'LOAN_PAYMENT':
          return 'text-blue-600'; // 대출 상환(잔액 감소)은 파란색
        case 'LOAN_DISBURSEMENT':
        case 'INITIAL_DEPOSIT':
          return 'text-red-600';  // 대출 실행은 빨간색
        case 'WITHDRAW':
        case 'TRANSFER_OUT':
          return 'text-red-600';  // 출금은 빨간색
        default:
          return 'text-gray-900';
      }
    } else {
      // 기존 로직
      switch (type) {
        case 'DEPOSIT':
        case 'TRANSFER_IN':
          return 'text-blue-600'; // 입금은 파란색
        case 'WITHDRAW':
        case 'TRANSFER_OUT':
          return 'text-red-600';  // 출금은 빨간색
        default:
          return 'text-gray-900';
      }
    }
  };

  // 트랜잭션 설명 표시 함수 수정
  const formatTransactionDescription = (transaction) => {
    if (!transaction.type) return transaction.description || '정보 없음';
    
    const type = transaction.type.toUpperCase();
    
    if (account.accountType === 'LOAN' || productInfo?.category === 'LOAN') {
      // 대출 실행 거래 확인
      if (['INITIAL_DEPOSIT', 'LOAN_DISBURSEMENT'].includes(type) || 
          (transaction.amount > 0 && transaction.description?.includes('실행'))) {
        return transaction.description || '대출금 실행';
      }
      
      // 대출 상환 거래 확인
      if (['DEPOSIT', 'TRANSFER_IN', 'LOAN_PAYMENT'].includes(type) ||
          (transaction.description && (
            transaction.description.includes('상환') || 
            transaction.description.includes('대출금')
          ))) {
        return transaction.description || '대출금 상환';
      }
      
      // 기타 거래
      return transaction.description || type;
    } else {
      switch (type) {
        case 'INITIAL_DEPOSIT':
          return '계좌 개설 초기 입금';
        case 'DEPOSIT':
          return transaction.description || '입금';
        case 'WITHDRAWAL':
          return transaction.description || '출금';
        case 'TRANSFER_IN':
          return transaction.description || '계좌이체 받음';
        case 'TRANSFER_OUT':
          return transaction.description || '계좌이체 보냄';
        case 'LOAN_PAYMENT':
          return transaction.description || '대출 상환';
        case 'LOAN_DISBURSEMENT':
          return transaction.description || '대출금 실행';
        default:
          return transaction.description || type;
      }
    }
  };

  // 트랜잭션 금액 표시 함수 수정
  const formatTransactionAmount = (transaction) => {
    // 대출 계좌인 경우
    if (productInfo?.category === 'LOAN' || account.accountType === 'LOAN') {
      const transactionType = transaction.type?.toUpperCase() || '';
      
      // 대출 실행 여부 확인 (금액이 양수이고 초기 거래 또는 설명에 '실행'이 포함된 경우)
      const isDisbursement = 
        ['INITIAL_DEPOSIT', 'LOAN_DISBURSEMENT'].includes(transactionType) ||
        (transaction.amount > 0 && transaction.description?.includes('실행'));
      
      if (isDisbursement) {
        // 대출 실행은 '+'로 표시 (대출금을 받았으므로)
        return `+${formatCurrency(Math.abs(transaction.amount), account.currency)}`;
      }
      
      // 대출 상환 여부 확인
      const isRepayment = 
        (transaction.toAccountId && parseInt(transaction.toAccountId) === parseInt(id)) || 
        ['DEPOSIT', 'TRANSFER_IN', 'LOAN_PAYMENT'].includes(transactionType) ||
        (transaction.description && (
          transaction.description.includes('상환') || 
          transaction.description.includes('대출금')
        ));
      
      if (isRepayment) {
        // 대출 상환은 '-'로 표시 (갚은 금액이므로)
        return `-${formatCurrency(Math.abs(transaction.amount), account.currency)}`;
      }
      
      // 이체 출금 처리
      if (['TRANSFER', 'TRANSFER_OUT'].includes(transactionType) && 
          transaction.fromAccountId && parseInt(transaction.fromAccountId) === parseInt(id)) {
        return `+${formatCurrency(Math.abs(transaction.amount), account.currency)}`;
      }
      
      // 기타 거래 처리
      return transaction.amount > 0
        ? `+${formatCurrency(Math.abs(transaction.amount), account.currency)}`
        : `-${formatCurrency(Math.abs(transaction.amount), account.currency)}`;
    } else {
      // 일반 계좌(입출금 계좌 등)인 경우 
      const transactionType = transaction.transactionType?.toUpperCase() || transaction.type?.toUpperCase() || '';
      
      // 입금/이체 입금 여부 확인
      const isDeposit = 
        ['DEPOSIT', 'TRANSFER_IN', 'INITIAL_DEPOSIT'].includes(transactionType) ||
        (transaction.toAccountId && parseInt(transaction.toAccountId) === parseInt(id));
      
      // 출금/이체 출금 여부 확인
      const isWithdrawal = 
        ['WITHDRAWAL', 'WITHDRAW', 'TRANSFER_OUT', 'FEE'].includes(transactionType) ||
        (transactionType === 'TRANSFER' && transaction.fromAccountId && 
         parseInt(transaction.fromAccountId) === parseInt(id));
      
      if (isDeposit) {
        // 입금은 항상 + 표시
        return `+${formatCurrency(Math.abs(transaction.amount), account.currency)}`;
      } else if (isWithdrawal) {
        // 출금은 항상 - 표시
        return `-${formatCurrency(Math.abs(transaction.amount), account.currency)}`;
      }
      
      // 그 외 거래는 부호에 따라 처리
      return transaction.amount > 0
        ? `+${formatCurrency(Math.abs(transaction.amount), account.currency)}`
        : `-${formatCurrency(Math.abs(transaction.amount), account.currency)}`;
    }
  };

  return (
    <MainLayout>
      <div className="pb-8">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">계좌 정보를 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-600">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => router.push('/')}
            >
              홈으로 가기
            </Button>
          </div>
        ) : account ? (
          <>
            {/* 뒤로 가기 버튼 */}
            <div className="mb-4">
              <button 
                onClick={() => router.push('/')} 
                className="inline-flex items-center text-blue-600 hover:text-blue-800"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                <span>홈으로</span>
              </button>
            </div>

            {/* 금융 상품 정보 */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">
                  {productInfo?.name || (account.accountType === 'CHECKING' ? '입출금 계좌' : 
                   account.accountType === 'SAVINGS' ? '저축 계좌' : 
                   account.accountType === 'LOAN' ? '대출 계좌' : '계좌')}
                </h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  account.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {account.status === 'ACTIVE' ? '진행중' : '해지됨'}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* 좌측: 계좌 기본 정보 */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h2 className="text-lg font-medium mb-2">계좌 정보</h2>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">금융상품명</span>
                        <span className="font-medium">{productInfo?.name || '정보 없음'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">계좌번호</span>
                        <span className="font-medium">{account.accountNumber.replace(/(\d{3})(\d{3})(\d{6})/, '$1-$2-$3')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">계좌 유형</span>
                        <span className="font-medium">{getAccountTypeLabel(account.accountType)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">가입일</span>
                        <span className="font-medium">{formatDate(account.createdAt, 'short')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">연 이자율</span>
                        <span className="font-medium text-blue-700">{productInfo?.interestRate ? `${productInfo.interestRate}%` : '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 우측: 잔액 및 버튼 */}
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-md">
                    <h2 className="text-sm text-gray-600 mb-1">
                      {(productInfo?.category === 'LOAN' || account.accountType === 'LOAN') ? 
                        '대출 잔액' : '현재 잔액'}
                    </h2>
                    <p className="text-3xl font-bold text-blue-700">
                      {(productInfo?.category === 'LOAN' || account.accountType === 'LOAN') ?
                        // 대출 잔액은 절대값으로 표시 (음수를 양수로 변환)
                        formatCurrency(Math.abs(account.balance), account.currency) :
                        formatCurrency(account.balance, account.currency)
                      }
                    </p>
                    
                    {/* 대출 계좌 안내 문구 */}
                    {(productInfo?.category === 'LOAN' || account.accountType === 'LOAN') && (
                      <p className="mt-2 text-sm text-red-600">
                        * 상환해야 할 남은 금액입니다
                      </p>
                    )}
                    
                    {/* 버튼 영역 - 계좌가 활성 상태인 경우만 표시 */}
                    {account.status === 'ACTIVE' && (
                      <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        {/* 대출 상품이 아닌 경우에만 계좌이체 버튼 표시 */}
                        {!(productInfo?.category === 'LOAN' || account.accountType === 'LOAN') && (
                          <Link href={`/transfer?fromAccount=${account.id}`} className="flex-1">
                            <Button variant="primary" fullWidth>계좌이체</Button>
                          </Link>
                        )}
                        <Button 
                          variant="danger" 
                          fullWidth
                          className="flex-1"
                          onClick={() => setCloseAccountModal(true)}
                        >
                          {(productInfo?.category === 'LOAN' || account.accountType === 'LOAN') ? '대출금 상환' : '계좌해지'}
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* 상품 설명 */}
                  {(productInfo?.description || account.accountType === 'CHECKING' || account.accountType === 'LOAN') && (
                    <div className="bg-yellow-50 p-4 rounded-md">
                      <h2 className="text-sm font-medium text-yellow-800 mb-2">상품 안내</h2>
                      <p className="text-sm text-yellow-700">
                        {productInfo?.description || 
                         account.accountType === 'CHECKING' ? '입출금 계좌는 별도의 가입 금액 없이 언제든지 입출금이 가능합니다.' : 
                         account.accountType === 'LOAN' ? '대출 계좌는 출금 및 이체가 불가능하며, 상환만 가능합니다.' : ''}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 거래 내역 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
              <h2 className="text-xl font-bold px-6 py-4 border-b">거래 내역</h2>
              
              {transactions.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  거래 내역이 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          거래 일시
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          거래 유형
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          금액
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          내용
                        </th>
                        {(productInfo?.category !== 'LOAN' && account.accountType !== 'LOAN') && (
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            잔액
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.map((transaction, index) => (
                        <tr key={transaction.id || index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.transactionDate ? new Date(transaction.transactionDate).toLocaleString('ko-KR') : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {renderTransactionType(transaction.transactionType || transaction.type, account, transaction)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium 
                            ${determineAmountColor(transaction.transactionType || transaction.type, transaction.amount, account)}`}>
                            {formatTransactionAmount(transaction)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTransactionDescription(transaction)}
                          </td>
                          {(productInfo?.category !== 'LOAN' && account.accountType !== 'LOAN') && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {transaction.balanceAfterTransaction !== undefined ? 
                                formatCurrency(transaction.balanceAfterTransaction, account.currency) : 
                                '-'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {hasMore && (
                    <div className="py-4 px-6 border-t flex justify-center">
                      <button
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md focus:outline-none"
                        onClick={fetchTransactions}
                        disabled={loadingMore}
                      >
                        {loadingMore ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            거래 내역 불러오는 중...
                          </span>
                        ) : (
                          "더 불러오기"
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 계좌 해지 확인 모달 */}
            {closeAccountModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
                  <h3 className="text-lg font-bold mb-4">
                    {(productInfo?.category === 'LOAN' || account.accountType === 'LOAN') ? '대출금 상환 확인' : '계좌 해지 확인'}
                  </h3>
                  
                  {/* 잔액이 있는 경우 이체 안내 */}
                  {account.balance > 0 ? (
                    <div className="mb-4">
                      <p className="text-yellow-700 bg-yellow-50 p-3 rounded-md mb-3">
                        {(productInfo?.category === 'LOAN' || account.accountType === 'LOAN') ? 
                          `대출금 잔액 ${formatCurrency(account.balance)}을(를) 상환해야 합니다. 선택하신 자유입출금 계좌에서 해당 금액이 차감됩니다.` : 
                          `이 계좌의 잔액 ${formatCurrency(account.balance)}을(를) 다른 계좌로 이체한 후 해지합니다.`}
                      </p>
                      
                      {(productInfo?.category === 'LOAN' || account.accountType === 'LOAN') ? (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            대출금 상환에 사용할 계좌 선택
                          </label>
                          {otherAccounts.length > 0 ? (
                            <select
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              value={selectedTransferAccount}
                              onChange={(e) => setSelectedTransferAccount(e.target.value)}
                            >
                              {otherAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.accountNumber.replace(/(\d{3})(\d{3})(\d{6})/, '$1-$2-$3')} ({formatCurrency(acc.balance)})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-red-600 mt-2">
                              대출금 상환에 사용할 계좌가 없습니다. 다른 계좌를 개설한 후 다시 시도해주세요.
                            </p>
                          )}
                        </div>
                      ) : (
                        (otherAccounts.length > 0) ? (
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              잔액을 이체할 계좌 선택
                            </label>
                            <select
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              value={selectedTransferAccount}
                              onChange={(e) => setSelectedTransferAccount(e.target.value)}
                            >
                              {otherAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.accountNumber.replace(/(\d{3})(\d{3})(\d{6})/, '$1-$2-$3')} ({formatCurrency(acc.balance)})
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <p className="text-red-600 mt-2">
                            이체할 다른 활성 계좌가 없습니다. 계좌 해지 전에 다른 계좌를 개설하거나 
                            잔액을 인출해주세요.
                          </p>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="mb-6 text-gray-700">
                      {(productInfo?.category === 'LOAN' || account.accountType === 'LOAN') ? 
                        '대출금을 모두 상환하시겠습니까? 이 작업은 되돌릴 수 없습니다.' : 
                        '정말로 이 계좌를 해지하시겠습니까? 이 작업은 되돌릴 수 없습니다.'}
                    </p>
                  )}
                  
                  {/* 오류 메시지 표시 */}
                  {closeError && (
                    <div className="mb-4 text-red-600 bg-red-50 p-3 rounded-md">
                      {closeError}
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setCloseAccountModal(false)}
                      disabled={isClosing}
                    >
                      취소
                    </Button>
                    <Button 
                      variant="danger" 
                      onClick={(e) => {
                        e.preventDefault();
                        console.log('계좌 해지 버튼 클릭됨');
                        handleTransferAndClose();
                      }}
                      disabled={isClosing || 
                        (account.balance > 0 && 
                          ((productInfo?.category === 'LOAN' || account.accountType === 'LOAN') ? 
                            otherAccounts.length === 0 : 
                            otherAccounts.length === 0)
                        )
                      }
                    >
                      {isClosing ? '처리 중...' : 
                       (productInfo?.category === 'LOAN' || account.accountType === 'LOAN') ? 
                        (account.balance > 0 ? '대출금 상환' : '대출 해지') : 
                        (account.balance > 0 ? '이체 후 해지' : '계좌 해지')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </MainLayout>
  );
};

// 아이콘 컴포넌트
function ArrowLeftIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props} className="h-4 w-4">
      <path fillRule="evenodd" d="M11.03 3.97a.75.75 0 010 1.06l-6.22 6.22H21a.75.75 0 010 1.5H4.81l6.22 6.22a.75.75 0 11-1.06 1.06l-7.5-7.5a.75.75 0 010-1.06l7.5-7.5a.75.75 0 011.06 0z" clipRule="evenodd" />
    </svg>
  );
}

function PlusIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props} className="h-4 w-4">
      <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
    </svg>
  );
}

function MinusIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props} className="h-4 w-4">
      <path fillRule="evenodd" d="M4.5 12a.75.75 0 01.75-.75h13.5a.75.75 0 010 1.5H5.25a.75.75 0 01-.75-.75z" clipRule="evenodd" />
    </svg>
  );
}

function ArrowIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props} className="h-4 w-4">
      <path fillRule="evenodd" d="M12.97 3.97a.75.75 0 011.06 0l7.5 7.5a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 11-1.06-1.06l6.22-6.22H3a.75.75 0 010-1.5h16.19l-6.22-6.22a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
  );
}

export default AccountDetailPage; 