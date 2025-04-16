import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../ui/Button';
import { formatCurrency, formatAccountNumber, numberToKorean } from '../../utils/formatters';
import accountService from '../../api/accountService';
import transferService from '../../api/transferService';

const TransferForm = ({ initialFromAccountId }) => {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    fromAccountId: initialFromAccountId || '',
    toAccountId: '',
    toAccountNumber: '',
    amount: '',
    description: '',
    transferType: 'internal', // internal 또는 external
  });
  
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // 계좌 목록 불러오기
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        console.log('계좌 목록 가져오기 시도 중...');
        const data = await accountService.getAllAccounts();
        console.log('계좌 목록 데이터 수신:', data);
        
        // 데이터가 배열인지 확인 (배열이 아닌 경우 처리)
        const accountsData = Array.isArray(data) ? data : 
                            (data && data.content && Array.isArray(data.content)) ? 
                            data.content : [];
                            
        console.log('처리된 계좌 데이터:', accountsData);
        
        // 활성 계좌만 필터링
        const activeAccounts = accountsData.filter(account => account.isActive !== false);
        console.log('활성 계좌만 필터링:', activeAccounts);
        
        setAccounts(activeAccounts);
        
        // 처음 로드될 때 계좌가 있으면 첫 번째 계좌를 선택
        if (activeAccounts.length > 0) {
          // URL에서 전달된 계좌ID가 있으면 우선 사용, 없으면 첫 번째 계좌 선택
          const accountToSelect = initialFromAccountId ? 
            activeAccounts.find(acc => acc.id.toString() === initialFromAccountId.toString()) : 
            activeAccounts[0];
          
          if (accountToSelect) {
            console.log('선택된 계좌:', accountToSelect.id);
            setFormData(prev => ({ ...prev, fromAccountId: accountToSelect.id.toString() }));
          } else if (!formData.fromAccountId && activeAccounts.length > 0) {
            // URL 계좌 못찾으면 첫번째 계좌 선택
            console.log('첫 번째 계좌 선택:', activeAccounts[0].id);
            setFormData(prev => ({ ...prev, fromAccountId: activeAccounts[0].id.toString() }));
          }
        } else {
          console.log('사용 가능한 계좌가 없습니다.');
          setError('이체 가능한 계좌가 없습니다. 계좌를 먼저 개설해주세요.');
        }
      } catch (err) {
        console.error('계좌 목록을 불러오는 중 오류가 발생했습니다:', err);
        setError('계좌 정보를 불러올 수 없습니다. 로그인 상태를 확인해주세요.');
      }
    };

    fetchAccounts();
  }, [initialFromAccountId]);

  // 입력 필드 값 변경 처리
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // 금액 입력일 경우 숫자만 입력 가능
    if (name === 'amount') {
      // 콤마와 숫자 외의 문자 제거
      const numberValue = value.replace(/[^\d]/g, '');
      setFormData(prev => ({ ...prev, [name]: numberValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // 에러 메시지 초기화
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // 이체 타입 변경 처리
  const handleTransferTypeChange = (type) => {
    setFormData(prev => ({ 
      ...prev, 
      transferType: type,
      toAccountId: '',
      toAccountNumber: ''
    }));
  };

  // 폼 유효성 검사
  const validateForm = () => {
    const errors = {};
    
    if (!formData.fromAccountId) {
      errors.fromAccountId = '출금 계좌를 선택해주세요.';
    }
    
    if (formData.transferType === 'internal' && !formData.toAccountId) {
      errors.toAccountId = '입금 계좌를 선택해주세요.';
    }
    
    if (formData.transferType === 'external' && !formData.toAccountNumber) {
      errors.toAccountNumber = '입금 계좌번호를 입력해주세요.';
    }
    
    if (!formData.amount || parseInt(formData.amount) <= 0) {
      errors.amount = '이체 금액을 입력해주세요.';
    }
    
    // 잔액 확인
    const fromAccount = accounts.find(acc => acc.id === parseInt(formData.fromAccountId));
    if (fromAccount && parseInt(formData.amount) > fromAccount.balance) {
      errors.amount = '잔액이 부족합니다.';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 폼 제출 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      console.log('이체 폼 제출 데이터:', formData);
      
      // 이체 실행
      if (formData.transferType === 'internal') {
        await transferService.transferMoney({
          fromAccountId: parseInt(formData.fromAccountId, 10),
          toAccountId: parseInt(formData.toAccountId, 10),
          amount: parseInt(formData.amount, 10),
          description: formData.description || '계좌 이체'
        });
      } else {
        await transferService.sendMoney({
          fromAccountId: parseInt(formData.fromAccountId, 10),
          toAccountNumber: formData.toAccountNumber,
          amount: parseInt(formData.amount, 10),
          description: formData.description || '계좌 이체'
        });
      }
      
      setSuccess(true);
      
      // 3초 후 해당 계좌 상세 페이지로 이동
      setTimeout(() => {
        router.push(`/accounts/${formData.fromAccountId}`);
      }, 3000);
    } catch (err) {
      console.error('이체 실행 중 오류가 발생했습니다:', err);
      setError(err.response?.data?.message || '이체 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 출금 계좌 선택 옵션
  const fromAccountOptions = accounts.map(account => (
    <option key={account.id} value={account.id.toString()}>
      {account.accountType === 'CHECKING' ? '입출금' : 
       account.accountType === 'SAVINGS' ? '저축' : '계좌'} : {formatAccountNumber(account.accountNumber)} ({formatCurrency(account.balance)})
    </option>
  ));

  // 내 계좌로 이체할 때 입금 계좌 선택 옵션 (출금 계좌는 제외)
  const toAccountOptions = accounts
    .filter(account => account.id.toString() !== formData.fromAccountId.toString())
    .map(account => {
      // 대출 계좌인지 확인
      const isLoanAccount = account.accountType === 'LOAN';
      // 계좌 유형에 따른 표시 텍스트
      const accountTypeText = isLoanAccount ? '대출' : 
                             account.accountType === 'CHECKING' ? '입출금' : 
                             account.accountType === 'SAVINGS' ? '저축' : '계좌';
                             
      return (
        <option key={account.id} value={account.id.toString()}>
          {accountTypeText}: {formatAccountNumber(account.accountNumber)}
          {isLoanAccount ? ' (대출 상환)' : ''}
        </option>
      );
    });

  // 선택된 출금 계좌 정보
  const selectedAccount = accounts.find(acc => acc.id.toString() === formData.fromAccountId.toString());

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      {success ? (
        <div className="text-center py-8">
          <div className="mb-4 flex justify-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">이체가 완료되었습니다!</h3>
          <p className="text-gray-600 mb-4">
            {formatCurrency(parseInt(formData.amount))}을 성공적으로 이체했습니다.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            잠시 후 계좌 상세 페이지로 이동합니다...
          </p>
          <Button 
            variant="primary" 
            onClick={() => router.push(`/accounts/${formData.fromAccountId}`)}
          >
            계좌 상세 보기
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <h2 className="text-xl font-bold mb-6">계좌 이체</h2>
          
          {/* 이체 유형 선택 */}
          <div className="mb-6">
            <div className="flex space-x-2 mb-2">
              <button 
                type="button"
                className={`flex-1 py-2 px-4 rounded-md text-center ${
                  formData.transferType === 'internal' 
                    ? 'bg-blue-100 text-blue-800 font-medium border-2 border-blue-400' 
                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                }`}
                onClick={() => handleTransferTypeChange('internal')}
              >
                내 계좌로 이체
              </button>
              <button 
                type="button"
                className={`flex-1 py-2 px-4 rounded-md text-center ${
                  formData.transferType === 'external' 
                    ? 'bg-blue-100 text-blue-800 font-medium border-2 border-blue-400' 
                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                }`}
                onClick={() => handleTransferTypeChange('external')}
              >
                다른 계좌로 이체
              </button>
            </div>
          </div>
          
          {/* 출금 계좌 선택 */}
          <div className="mb-6">
            <label htmlFor="fromAccountId" className="block text-sm font-medium text-gray-700 mb-1">
              출금 계좌
            </label>
            <select
              id="fromAccountId"
              name="fromAccountId"
              value={formData.fromAccountId}
              onChange={handleChange}
              className={`w-full p-3 border rounded-md ${formErrors.fromAccountId ? 'border-red-500' : 'border-gray-300'}`}
              disabled={loading}
            >
              <option value="">출금 계좌 선택</option>
              {fromAccountOptions}
            </select>
            {formErrors.fromAccountId && (
              <p className="mt-1 text-sm text-red-600">{formErrors.fromAccountId}</p>
            )}
            
            {selectedAccount && (
              <div className="mt-2 text-sm text-gray-600">
                사용 가능 잔액: {formatCurrency(selectedAccount.balance)}
              </div>
            )}
          </div>
          
          {/* 내 계좌로 이체 - 입금 계좌 선택 */}
          {formData.transferType === 'internal' && (
            <div className="mb-6">
              <label htmlFor="toAccountId" className="block text-sm font-medium text-gray-700 mb-1">
                입금 계좌
              </label>
              <select
                id="toAccountId"
                name="toAccountId"
                value={formData.toAccountId}
                onChange={handleChange}
                className={`w-full p-3 border rounded-md ${formErrors.toAccountId ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
              >
                <option value="">입금 계좌 선택</option>
                {toAccountOptions}
              </select>
              {formErrors.toAccountId && (
                <p className="mt-1 text-sm text-red-600">{formErrors.toAccountId}</p>
              )}
              
              {/* 대출 계좌 선택 시 안내 메시지 표시 */}
              {formData.toAccountId && accounts.find(acc => acc.id === parseInt(formData.toAccountId))?.accountType === 'LOAN' && (
                <p className="mt-2 text-sm text-blue-600">
                  * 대출 계좌를 선택하셨습니다. 이체하신 금액만큼 대출 잔액이 상환됩니다.
                </p>
              )}
            </div>
          )}
          
          {/* 다른 계좌로 이체 - 계좌번호 입력 */}
          {formData.transferType === 'external' && (
            <div className="mb-6">
              <label htmlFor="toAccountNumber" className="block text-sm font-medium text-gray-700 mb-1">
                입금 계좌번호
              </label>
              <input
                type="text"
                id="toAccountNumber"
                name="toAccountNumber"
                placeholder="계좌번호를 입력하세요 (예: 1234-5678-9012-3456)"
                value={formData.toAccountNumber}
                onChange={handleChange}
                className={`w-full p-3 border rounded-md ${formErrors.toAccountNumber ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
              />
              {formErrors.toAccountNumber && (
                <p className="mt-1 text-sm text-red-600">{formErrors.toAccountNumber}</p>
              )}
            </div>
          )}
          
          {/* 이체 금액 */}
          <div className="mb-6">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              이체 금액
            </label>
            <div className="relative">
              <input
                type="text"
                id="amount"
                name="amount"
                placeholder="0"
                value={formData.amount ? Number(formData.amount).toLocaleString() : ''}
                onChange={handleChange}
                className={`w-full p-3 border rounded-md pl-12 ${formErrors.amount ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <span className="text-gray-500">KRW</span>
              </div>
            </div>
            {formErrors.amount && (
              <p className="mt-1 text-sm text-red-600">{formErrors.amount}</p>
            )}
            {formData.amount && (
              <p className="mt-1 text-sm text-blue-600">
                {numberToKorean(formData.amount)}
              </p>
            )}
          </div>
          
          {/* 내용(설명) */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              이체 내용 <span className="text-gray-400">(선택사항)</span>
            </label>
            <input
              type="text"
              id="description"
              name="description"
              placeholder="이체 내용을 입력하세요"
              value={formData.description}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-md"
              disabled={loading}
            />
          </div>
          
          {/* 에러 메시지 */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          {/* 제출 버튼 */}
          <div className="mt-8">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth={true}
              disabled={loading}
            >
              {loading ? '처리 중...' : '이체하기'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

// 체크 아이콘
function CheckCircleIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  );
}

export default TransferForm; 