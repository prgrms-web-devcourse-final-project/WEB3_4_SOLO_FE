import axios from '../utils/axios';

// 백엔드 API URL 기본값 설정
const API_URL = 'http://localhost:8080';

// 브라우저 환경인지 확인하는 함수
const isBrowser = () => typeof window !== 'undefined';

// axios 인스턴스 생성 (절대 경로 사용)
const instance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 요청 인터셉터 - 토큰 추가
instance.interceptors.request.use(
  (config) => {
    // 브라우저 환경에서만 localStorage 접근
    if (isBrowser()) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    // 요청 URL 로깅 (디버깅용)
    console.log(`Account API 요청: ${config.method?.toUpperCase() || 'GET'} ${config.baseURL || ''}${config.url}`);
    
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터 - 에러 처리
instance.interceptors.response.use(
  (response) => {
    // 요청 성공 로깅 (디버깅용)
    console.log(`Account API 응답 성공: ${response.config.url}`, response.status);
    return response;
  },
  (error) => {
    // 오류 정보 상세 로깅
    console.error('Account API 오류 발생:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
    });
    
    // 브라우저 환경에서만 실행
    if (isBrowser()) {
      // 401 에러 (인증 만료) 처리
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// 백엔드 DTO를 프론트엔드 형식으로 변환하는 함수
const transformAccountData = (account) => {
  if (!account) return null;
  
  // 대출 계좌인 경우 잔액을 음수로 표시
  if (account.accountType === 'LOAN') {
    return {
      ...account,
      balance: account.balance ? account.balance.toString().startsWith('-') 
        ? account.balance 
        : account.balance.mul(-1) 
      : 0
    };
  }
  
  return account;
};

// 금융 상품 DTO 변환 함수
const transformProductData = (product) => {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    interestRate: product.interestRate,
    minAmount: product.minAmount,
    maxAmount: product.maxAmount,
    term: product.term,
    features: product.features,
    isActive: product.isActive,
    status: product.status,
    imageUrl: product.imageUrl,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
};

// 계좌 서비스 함수
const accountService = {
  /**
   * 사용자의 계좌 목록을 가져옵니다.
   * @param {Object} params - 페이징, 정렬 등 추가 매개변수
   * @returns {Promise<Object>} 계좌 목록 (페이징 처리)
   */
  getMyAccounts: async (params = {}) => {
    try {
      const response = await instance.get('/api/accounts/my', { params });
      
      // 백엔드 응답이 페이지네이션 형식인 경우 (content 필드가 있는 경우)
      if (response.data && response.data.content) {
        const transformedAccounts = response.data.content.map(transformAccountData);
        return {
          ...response.data,
          content: transformedAccounts
        };
      }
      
      // 배열로 직접 반환된 경우
      if (Array.isArray(response.data)) {
        return response.data.map(transformAccountData);
      }
      
      return response.data;
    } catch (error) {
      console.error('내 계좌 목록을 가져오는 중 오류가 발생했습니다:', error);
      // 서버가 다운되었거나 네트워크 장애인 경우 빈 배열 반환
      return [];
    }
  },

  /**
   * 모든 계좌 목록을 가져옵니다. (홈페이지 사용)
   * @returns {Promise<Array>} 계좌 목록 배열
   */
  getAllAccounts: async () => {
    try {
      // 현재 인증된 사용자의 계좌만 필요하므로 getMyAccounts 호출
      return await accountService.getMyAccounts();
    } catch (error) {
      console.error('계좌 목록을 가져오는 중 오류가 발생했습니다:', error);
      return [];
    }
  },
  
  /**
   * 계좌 ID로 상세 정보를 가져옵니다.
   * @param {number} accountId - 계좌 ID
   * @returns {Promise<Object>} 계좌 상세 정보
   */
  getAccountById: async (accountId) => {
    try {
      const response = await instance.get(`/api/accounts/${accountId}`);
      return transformAccountData(response.data);
    } catch (error) {
      console.error(`계좌 ID ${accountId} 조회 실패:`, error);
      throw error;
    }
  },

  /**
   * 금융 상품 ID로 상세 정보를 가져옵니다.
   * @param {number} productId - 금융 상품 ID
   * @returns {Promise<Object>} 금융 상품 상세 정보
   */
  getProductById: async (productId) => {
    try {
      const response = await instance.get(`/api/products/${productId}`);
      return transformProductData(response.data);
    } catch (error) {
      console.error(`금융 상품 ID ${productId} 조회 실패:`, error);
      throw error;
    }
  },

  /**
   * 새 계좌를 개설합니다.
   * @param {Object} accountData - 계좌 개설 데이터
   * @param {string} accountData.accountName - 계좌 이름
   * @param {string} accountData.accountType - 계좌 유형 (예: SAVINGS, CHECKING 등)
   * @returns {Promise<Object>} 새로 개설된 계좌 정보
   */
  createAccount: async (accountData) => {
    try {
      console.log('계좌 생성 요청 데이터:', accountData);
      
      // 대출 계좌인 경우 초기 잔액을 음수로 변환
      if (accountData.accountType === 'LOAN' && accountData.initialBalance) {
        accountData = {
          ...accountData,
          initialBalance: accountData.initialBalance.toString().startsWith('-') 
            ? accountData.initialBalance 
            : `-${accountData.initialBalance}`
        };
      }
      
      const response = await instance.post('/api/accounts', accountData);
      console.log('계좌 생성 응답:', response.data);
      return transformAccountData(response.data);
    } catch (error) {
      console.error('계좌 생성 오류:', error);
      throw error;
    }
  },

  /**
   * 계좌 정보를 수정합니다. (예: 이름 변경)
   * @param {number} accountId - 계좌 ID
   * @param {Object} accountData - 변경할 계좌 데이터
   * @returns {Promise<Object>} 수정된 계좌 정보
   */
  updateAccount: async (accountId, accountData) => {
    try {
      const response = await instance.put(`/api/accounts/${accountId}`, accountData);
      return transformAccountData(response.data);
    } catch (error) {
      console.error(`계좌 ID ${accountId} 정보 수정 실패:`, error);
      throw error;
    }
  },

  /**
   * 계좌를 해지합니다.
   * @param {number} accountId - 계좌 ID
   * @returns {Promise<Object>} 해지 결과
   */
  closeAccount: async (accountId) => {
    console.log(`계좌 해지 API 함수 호출: 계좌 ID ${accountId}`);
    try {
      // 요청 URL과 헤더 확인
      console.log(`계좌 해지 요청 URL: ${API_URL}/api/accounts/${accountId}/close`);
      
      // API 호출 전 토큰 확인
      const token = isBrowser() && localStorage.getItem('token');
      console.log('인증 토큰 존재 여부:', !!token);
      
      // 우선 PATCH 메서드로 시도
      try {
        const response = await instance.patch(`/api/accounts/${accountId}/close`);
        console.log('계좌 해지 API 응답 (PATCH):', response.status, response.data);
        return transformAccountData(response.data);
      } catch (patchError) {
        console.error('PATCH 메서드 실패:', patchError);
        console.log('PUT 메서드로 시도합니다.');
        
        // PATCH 실패 시 PUT 메서드로 시도 (일부 백엔드는 PATCH 대신 PUT 사용)
        const response = await instance.put(`/api/accounts/${accountId}/close`, {
          status: 'CLOSED',
          updateReason: '사용자 요청에 의한 계좌 해지'
        });
        console.log('계좌 해지 API 응답 (PUT):', response.status, response.data);
        return transformAccountData(response.data);
      }
    } catch (error) {
      console.error(`계좌 ID ${accountId} 해지 실패:`, error);
      console.error('오류 상태 코드:', error.response?.status);
      console.error('오류 응답 데이터:', error.response?.data);
      
      // 최후의 방법: 직접 요청 객체 생성
      if (!error.response || error.response.status === 405) { // Method Not Allowed
        try {
          console.log('직접 axios 요청으로 시도합니다.');
          const directResponse = await axios({
            method: 'patch',
            url: `${API_URL}/api/accounts/${accountId}/close`,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': isBrowser() && localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
            }
          });
          console.log('직접 요청 응답:', directResponse.status, directResponse.data);
          return transformAccountData(directResponse.data);
        } catch (directError) {
          console.error('직접 요청도 실패:', directError);
          throw directError;
        }
      }
      
      throw error;
    }
  },

  /**
   * 계좌 거래 내역을 가져옵니다.
   * @param {number} accountId - 계좌 ID
   * @param {Object} params - 페이징, 정렬, 기간 등 추가 매개변수
   * @returns {Promise<Object>} 거래 내역 (페이징 처리)
   */
  getAccountTransactions: async (accountId, params = {}) => {
    try {
      const response = await instance.get(`/api/accounts/${accountId}/transactions`, { params });
      return response.data;
    } catch (error) {
      console.error(`계좌 ID ${accountId} 거래 내역 조회 실패:`, error);
      throw error;
    }
  },

  /**
   * 계좌 입금을 처리합니다.
   * @param {number} accountId - 계좌 ID
   * @param {Object} depositData - 입금 데이터
   * @param {number} depositData.amount - 입금액
   * @param {string} depositData.description - 입금 설명 (선택)
   * @returns {Promise<Object>} 입금 결과 및 거래 정보
   */
  depositToAccount: async (accountId, depositData) => {
    try {
      const response = await instance.post(`/api/accounts/${accountId}/deposit`, depositData);
      return transformAccountData(response.data);
    } catch (error) {
      console.error(`계좌 ID ${accountId} 입금 실패:`, error);
      throw error;
    }
  },

  /**
   * 계좌 출금을 처리합니다.
   * @param {number} accountId - 계좌 ID
   * @param {Object} withdrawData - 출금 데이터
   * @param {number} withdrawData.amount - 출금액
   * @param {string} withdrawData.description - 출금 설명 (선택)
   * @returns {Promise<Object>} 출금 결과 및 거래 정보
   */
  withdrawFromAccount: async (accountId, withdrawData) => {
    try {
      const response = await instance.post(`/api/accounts/${accountId}/withdraw`, withdrawData);
      return transformAccountData(response.data);
    } catch (error) {
      console.error(`계좌 ID ${accountId} 출금 실패:`, error);
      throw error;
    }
  },

  /**
   * 계좌 간 이체를 처리합니다.
   * @param {number} fromAccountId - 출금 계좌 ID
   * @param {number} toAccountId - 입금 계좌 ID
   * @param {Object} transferData - 이체 데이터
   * @param {number} transferData.amount - 이체액
   * @param {string} transferData.description - 이체 설명 (선택)
   * @returns {Promise<Object>} 이체 결과 및 거래 정보
   */
  transferBetweenAccounts: async (fromAccountId, toAccountId, transferData) => {
    try {
      // 계좌 유형 확인
      let isLoanRepayment = false;
      let isLoanDisbursement = false;
      
      try {
        // 출금 계좌 정보 확인
        const fromAccount = await accountService.getAccountById(fromAccountId);
        
        // 입금 계좌 정보 확인
        const toAccount = await accountService.getAccountById(toAccountId);
        
        // 대출 상환: 일반 계좌에서 대출 계좌로 이체
        isLoanRepayment = toAccount && (toAccount.accountType === 'LOAN');
        
        // 대출 실행: 대출 계좌에서 일반 계좌로 이체 (초기 대출금 지급)
        isLoanDisbursement = fromAccount && (fromAccount.accountType === 'LOAN') && 
                            transferData.description && transferData.description.includes('실행');
        
        if (isLoanRepayment) {
          // 대출 계좌로의 이체는 대출금 상환으로 처리
          transferData = {
            ...transferData,
            description: transferData.description || '대출금 상환',
            transactionType: 'LOAN_PAYMENT'
          };
          
          console.log('대출금 상환 이체 데이터:', transferData);
        }
        else if (isLoanDisbursement) {
          // 대출 실행으로 이체
          transferData = {
            ...transferData,
            description: transferData.description || '대출금 실행',
            transactionType: 'LOAN_DISBURSEMENT'
          };
          
          console.log('대출금 실행 이체 데이터:', transferData);
        }
      } catch (error) {
        console.warn('계좌 유형 확인 중 오류 발생:', error);
        // 계속 진행 (치명적 오류가 아님)
      }
      
      const response = await instance.post(`/api/accounts/${fromAccountId}/transfer/${toAccountId}`, transferData);
      return transformAccountData(response.data);
    } catch (error) {
      console.error('계좌 이체 실패:', error);
      throw error;
    }
  },

  /**
   * 사용자의 총 계좌 잔액을 조회합니다.
   * @returns {Promise<Object>} 총 잔액 정보
   */
  getTotalBalance: async () => {
    try {
      const response = await instance.get('/api/accounts/my/total-balance');
      return response.data.totalBalance || 0;
    } catch (error) {
      console.error('총 잔액 조회 실패:', error);
      return 0;
    }
  }
};

export default accountService; 