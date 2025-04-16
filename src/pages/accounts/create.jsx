import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';

const CreateAccountPage = () => {
  const [formData, setFormData] = useState({
    accountNumber: '',
    accountName: '',
    bank: '플레이지은행',
    accountType: 'CHECKING',
    initialBalance: 0,
    fintechUseNum: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  
  // 계좌 유형이 0원으로 생성 가능한지 검사하는 함수
  const canCreateWithZeroBalance = (accountType) => {
    return accountType === 'CHECKING' || accountType === 'LOAN';
  };
  
  // 계좌 유형이 변경될 때마다 초기 잔액 검사 및 조정
  useEffect(() => {
    if (!canCreateWithZeroBalance(formData.accountType) && formData.initialBalance === 0) {
      setFormData(prev => ({
        ...prev,
        initialBalance: 10000 // 최소 금액 설정
      }));
    }
  }, [formData.accountType]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'accountType') {
      // 계좌 유형이 변경될 때 처리
      setFormData(prev => ({
        ...prev,
        [name]: value,
        // 초기 잔액 자동 설정
        initialBalance: canCreateWithZeroBalance(value) ? 0 : Math.max(prev.initialBalance, 10000)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'initialBalance' ? Number(value) : value
      }));
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 초기 잔액 검증
    if (!canCreateWithZeroBalance(formData.accountType) && formData.initialBalance <= 0) {
      setError(`${formData.accountType === 'DEPOSIT' ? '정기예금' : 
                formData.accountType === 'SAVINGS' ? '적금' : 
                formData.accountType === 'FUND' ? '펀드' : '선택된'} 계좌는 초기 잔액이 필요합니다.`);
      return;
    }
    
    // 계좌번호 형식 검증 (숫자와 하이픈만 허용)
    const accountNumberPattern = /^[0-9\-]+$/;
    if (!accountNumberPattern.test(formData.accountNumber)) {
      setError('계좌번호는 숫자와 하이픈(-)만 포함할 수 있습니다');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // currency 필드 제거 - 백엔드 모델에 없는 필드임
      const requestData = { ...formData };
      
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '계좌 생성 중 오류가 발생했습니다');
      }
      
      const data = await response.json();
      console.log('생성된 계좌:', data);
      
      setSuccess(true);
      setFormData({
        accountNumber: '',
        accountName: '',
        bank: '플레이지은행',
        accountType: 'CHECKING',
        initialBalance: 0,
        fintechUseNum: ''
      });
      
      // 3초 후 홈 페이지로 이동
      setTimeout(() => {
        router.push('/');
      }, 3000);
      
    } catch (error) {
      console.error('계좌 생성 오류:', error);
      setError(error.message || '계좌 생성 중 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 계좌번호 도움말 텍스트
  const getAccountNumberHelperText = () => {
    if (formData.accountType === 'CHECKING') {
      return '입출금계좌 예시: 110-123-456789';
    } else if (formData.accountType === 'SAVINGS') {
      return '적금계좌 예시: 210-123-456789';
    } else if (formData.accountType === 'DEPOSIT') {
      return '정기예금계좌 예시: 310-123-456789';
    } else if (formData.accountType === 'FUND') {
      return '펀드계좌 예시: 510-123-456789';
    } else if (formData.accountType === 'LOAN') {
      return '대출계좌 예시: 410-123-456789';
    }
    return '실제 은행의 계좌번호 형식을 사용해주세요.';
  };
  
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">새 계좌 등록</h1>
        
        {success ? (
          <div className="bg-green-50 p-4 rounded-md mb-6">
            <p className="text-green-800 font-medium">계좌가 성공적으로 생성되었습니다!</p>
            <p className="text-green-600 mt-1">잠시 후 홈 페이지로 이동합니다...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
            {error && (
              <div className="bg-red-50 p-4 rounded-md mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}
            
            <div className="mb-4">
              <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
                계좌번호
              </label>
              <input
                type="text"
                id="accountNumber"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="예: 123-456-789012"
                required
              />
              <p className="text-xs text-gray-500 mt-1">{getAccountNumberHelperText()}</p>
            </div>
            
            <div className="mb-4">
              <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-1">
                계좌 별명
              </label>
              <input
                type="text"
                id="accountName"
                name="accountName"
                value={formData.accountName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="예: 급여 계좌"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="bank" className="block text-sm font-medium text-gray-700 mb-1">
                은행
              </label>
              <input
                type="text"
                id="bank"
                name="bank"
                value={formData.bank}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                readOnly
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 mb-1">
                계좌 종류
              </label>
              <select
                id="accountType"
                name="accountType"
                value={formData.accountType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="CHECKING">입출금 계좌</option>
                <option value="SAVINGS">적금 계좌</option>
                <option value="DEPOSIT">정기예금 계좌</option>
                <option value="FUND">펀드 계좌</option>
                <option value="LOAN">대출 계좌</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                참고: 입출금 계좌와 대출 계좌는 초기 잔액 없이 개설 가능합니다. 
                다른 유형의 계좌는 초기 입금이 필요합니다.
              </p>
            </div>
            
            {/* 계좌 유형 설명 */}
            <div className="mb-4 p-3 bg-blue-50 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 mb-2">선택한 계좌 유형 안내</h4>
              {formData.accountType === 'CHECKING' && (
                <p className="text-xs text-blue-700">
                  입출금 계좌는 언제든지 자유롭게, 초기 잔액 없이 개설하고 이체 및 출금이 자유롭습니다. 
                  일반적인 거래 계좌로 사용하기 적합합니다.
                </p>
              )}
              {formData.accountType === 'SAVINGS' && (
                <p className="text-xs text-blue-700">
                  적금 계좌는 일정 기간 동안 정기적으로 금액을 납입하여 목돈을 모으는 계좌입니다. 
                  초기 입금이 필요하며, 만기 전 해지 시 약정 이자율보다 낮은 이자가 적용될 수 있습니다.
                </p>
              )}
              {formData.accountType === 'DEPOSIT' && (
                <p className="text-xs text-blue-700">
                  정기예금 계좌는 일정 금액을 예치하고 약정된 기간이 지난 후 원금과 이자를 받는 계좌입니다. 
                  적금보다 높은 초기 입금이 필요하며, 만기 전 해지 시 이자 손실이 있을 수 있습니다.
                </p>
              )}
              {formData.accountType === 'FUND' && (
                <p className="text-xs text-blue-700">
                  펀드 계좌는 주식, 채권 등에 투자하여 수익을 추구하는 계좌입니다. 
                  초기 투자금이 필요하며, 시장 상황에 따라 원금 손실의 가능성이 있습니다.
                </p>
              )}
              {formData.accountType === 'LOAN' && (
                <p className="text-xs text-blue-700">
                  대출 계좌는 금융 기관으로부터 자금을 빌리는 계좌입니다. 
                  초기 잔액 없이 개설 가능하며, 약정된 이자율에 따라 원금과 이자를 상환해야 합니다.
                </p>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="initialBalance" className="block text-sm font-medium text-gray-700 mb-1">
                초기 잔액
                {!canCreateWithZeroBalance(formData.accountType) && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>
              <input
                type="number"
                id="initialBalance"
                name="initialBalance"
                value={formData.initialBalance}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min={canCreateWithZeroBalance(formData.accountType) ? "0" : "1000"}
                step="1000"
                required={!canCreateWithZeroBalance(formData.accountType)}
              />
              {!canCreateWithZeroBalance(formData.accountType) && (
                <p className="text-xs text-red-500 mt-1">
                  {formData.accountType === 'DEPOSIT' ? '정기예금' : 
                  formData.accountType === 'SAVINGS' ? '적금' : 
                  formData.accountType === 'FUND' ? '펀드' : ''} 계좌 개설에는 초기 입금이 필요합니다.
                </p>
              )}
            </div>
            
            <div className="mb-6">
              <label htmlFor="fintechUseNum" className="block text-sm font-medium text-gray-700 mb-1">
                핀테크 이용 번호 (선택)
              </label>
              <input
                type="text"
                id="fintechUseNum"
                name="fintechUseNum"
                value={formData.fintechUseNum}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="오픈뱅킹 연동 시 사용"
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md mr-2"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md disabled:opacity-50"
              >
                {isSubmitting ? '처리 중...' : '계좌 등록'}
              </button>
            </div>
          </form>
        )}
      </div>
    </MainLayout>
  );
};

export default CreateAccountPage; 