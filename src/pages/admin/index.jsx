import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import { formatCurrency } from '../../utils/formatters';

const AdminPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const router = useRouter();
  
  // 관리자 권한 확인
  useEffect(() => {
    const checkAdminAuth = () => {
      const userData = localStorage.getItem('user');
      
      if (!userData) {
        router.push('/login');
        return;
      }
      
      try {
        const user = JSON.parse(userData);
        
        // 관리자 권한 확인 (user.roles가 없는 경우 빈 배열로 처리)
        const hasAdminRole = (user.roles || []).some(role => 
          role === 'ROLE_ADMIN' || 
          (typeof role === 'object' && role.name === 'ROLE_ADMIN')
        );
        
        // authority 필드 확인
        const hasAdminAuthority = user.authority === 'ROLE_ADMIN';
        
        // 개발용 관리자 이메일 확인
        const isAdminEmail = user.email === 'admin@pleasybank.com';
        
        if (!hasAdminRole && !hasAdminAuthority && !isAdminEmail) {
          router.push('/');
          return;
        }
        
        setIsAdmin(true);
      } catch (error) {
        router.push('/');
      }
    };
    
    checkAdminAuth();
  }, [router]);
  
  // 계좌 목록 불러오기
  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        
        // 관리자 권한으로 모든 계좌 목록 조회
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }
        
        const response = await fetch('http://localhost:8080/api/admin/accounts', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
          
        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('관리자 권한이 필요합니다');
          }
          throw new Error('계좌 목록을 불러오는데 실패했습니다');
        }
          
        const data = await response.json();
        
        // 데이터 구조에 따라 적절히 처리
        const accountsList = Array.isArray(data) ? data : 
                          (data.content && Array.isArray(data.content)) ? data.content : [];
        
        setAccounts(accountsList);
        setError(null);
      } catch (err) {
        setError('계좌 정보를 불러올 수 없습니다. 나중에 다시 시도해 주세요.');
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [isAdmin, router]);
  
  // 계좌 선택 처리
  const handleAccountSelect = (account) => {
    setSelectedAccount(account);
    setSubmitSuccess(false);
    setSubmitError(null);
  };
  
  // 자금 추가 폼 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedAccount) {
      setSubmitError('계좌를 선택해주세요');
      return;
    }
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setSubmitError('유효한 금액을 입력해주세요');
      return;
    }
    
    try {
      setSubmitLoading(true);
      setSubmitError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      
      // 실제 API로 자금 추가 요청
      const response = await fetch(`http://localhost:8080/api/admin/accounts/${selectedAccount.id}/add-funds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: Number(amount),
          type: 'DEPOSIT',
          description: description || '관리자에 의한 자금 추가'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('자금 추가 실패 응답:', errorData);
        throw new Error(errorData || '자금 추가 처리 중 오류가 발생했습니다');
      }
      
      // 성공 후 계좌 목록 새로고침
      const fetchAccounts = async () => {
        const accountsResponse = await fetch('http://localhost:8080/api/admin/accounts', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json();
          const accountsList = Array.isArray(accountsData) ? accountsData : 
                            (accountsData.content && Array.isArray(accountsData.content)) ? accountsData.content : [];
          setAccounts(accountsList);
        }
      };
      
      await fetchAccounts();
      
      // 성공 메시지 표시
      setSubmitSuccess(true);
      setAmount('');
      setDescription('');
    } catch (error) {
      console.error('자금 추가 처리 중 오류가 발생했습니다:', error);
      setSubmitError(error.message || '자금 추가 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitLoading(false);
    }
  };
  
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">관리자 페이지</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 계좌 목록 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">계좌 목록</h2>
            
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 text-red-600 p-4 rounded-md">
                {error}
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-gray-500 py-4">
                등록된 계좌가 없습니다.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용자</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">계좌명</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">계좌번호</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">잔액</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {accounts.map((account) => (
                      <tr 
                        key={account.id} 
                        className={`${selectedAccount?.id === account.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{account.user?.name || '사용자'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{account.accountName}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{account.accountNumber}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{formatCurrency(account.balance)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleAccountSelect(account)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            선택
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* 자금 추가 폼 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">자금 추가</h2>
            
            {selectedAccount ? (
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">선택된 계좌</p>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="font-medium">{selectedAccount.accountName}</p>
                    <p className="text-sm text-gray-600">{selectedAccount.accountNumber}</p>
                    <p className="text-sm text-gray-600">잔액: {formatCurrency(selectedAccount.balance)}</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                    추가할 금액
                  </label>
                  <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="금액 입력"
                    min="1"
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    자금 추가 설명 (선택사항)
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="자금 추가 이유 등"
                    rows="3"
                  />
                </div>
                
                {submitError && (
                  <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
                    {submitError}
                  </div>
                )}
                
                {submitSuccess && (
                  <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-md text-sm">
                    자금이 성공적으로 추가되었습니다.
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {submitLoading ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                      처리 중...
                    </>
                  ) : '자금 추가'}
                </button>
              </form>
            ) : (
              <div className="text-center py-10 text-gray-500">
                <p>왼쪽에서 계좌를 선택해주세요</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminPage; 