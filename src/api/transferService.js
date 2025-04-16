import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// 브라우저 환경인지 확인하는 함수
const isBrowser = () => typeof window !== 'undefined';

// API 기본 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 추가
api.interceptors.request.use(
  (config) => {
    // 브라우저 환경에서만 localStorage 접근
    if (isBrowser()) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터 - 에러 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
const transformTransactionData = (transaction) => {
  // 거래 유형과 설명 초기화
  let transactionType = transaction.type;
  let description = transaction.description || '';
  
  if (transaction.type) {
    const upperType = transaction.type.toUpperCase();
    
    // 대출금 실행 확인
    if (['INITIAL_DEPOSIT', 'LOAN_DISBURSEMENT'].includes(upperType) || 
        (description && description.includes('실행'))) {
      transactionType = 'LOAN_DISBURSEMENT';
      if (!description) {
        description = '대출금 실행';
      }
    }
    // 대출금 상환 확인 - 계좌 유형 확인 추가
    else if (['DEPOSIT', 'TRANSFER_IN'].includes(upperType) && 
        transaction.amount > 0 &&
        (
          // 명시적으로 대출 계좌로의 이체인 경우에만 대출 상환으로 처리
          (transaction.counterpartyAccountType === 'LOAN') || 
          (transaction.toAccountId && transaction.toAccountNumber && 
           (transaction.description && transaction.description.includes('대출') && 
            transaction.description.includes('상환')))
        )) {
      transactionType = 'LOAN_PAYMENT';
      if (!description) {
        description = '대출금 상환';
      }
    }
  }
  
  // 백엔드 TransactionResponse 구조에서 프론트엔드 형식으로 변환
  return {
    id: transaction.id,
    fromAccountId: transaction.fromAccountId,
    fromAccountNumber: transaction.fromAccountNumber,
    toAccountId: transaction.toAccountId,
    toAccountNumber: transaction.toAccountNumber,
    amount: transaction.amount,
    type: transactionType, // 원래 필드 이름도 수정된 타입으로 반환
    transactionType: transactionType, // 수정된 거래 유형 적용
    description: description,
    fee: transaction.fee || 0,
    status: transaction.status,
    transactionDatetime: transaction.transactionDatetime || transaction.createdAt,
    transactionDate: transaction.transactionDatetime || transaction.createdAt, // 날짜 필드 매핑
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
    balanceAfterTransaction: transaction.balanceAfterTransaction, // 잔액 정보 추가
    // 계좌 유형 정보 (백엔드가 제공하는 경우)
    accountType: transaction.accountType || null,
    // 해당 거래의 상대 계좌 유형 (백엔드가 제공하는 경우)
    counterpartyAccountType: transaction.counterpartyAccountType || null
  };
};

// 이체 서비스 함수
const transferService = {
  /**
   * 계좌 간 이체를 수행합니다.
   * @param {Object} transferData - 이체 데이터
   * @param {number} transferData.fromAccountId - 출금 계좌 ID
   * @param {number} transferData.toAccountId - 입금 계좌 ID
   * @param {number} transferData.amount - 이체 금액
   * @param {string} transferData.description - 이체 내용
   * @returns {Promise<Object>} 이체 처리 결과
   */
  transferMoney: async (transferData) => {
    try {
      console.log('이체 요청 데이터:', transferData);
      
      // 금액이 0 이하인 경우 오류 발생
      if (!transferData.amount || parseFloat(transferData.amount) <= 0) {
        throw new Error('이체 금액은 0보다 커야 합니다.');
      }
      
      // 출금 계좌와 입금 계좌가 같은 경우 오류 발생
      if (transferData.fromAccountId === transferData.toAccountId) {
        throw new Error('출금 계좌와 입금 계좌가 동일합니다.');
      }
      
      const response = await api.post('/api/transactions/transfer', transferData);
      console.log('이체 응답 데이터:', response.data);
      
      return transformTransactionData(response.data);
    } catch (error) {
      console.error('이체 중 오류가 발생했습니다:', error);
      
      // 백엔드에서 반환한 오류 메시지가 있으면 그대로 사용
      if (error.response && error.response.data && error.response.data.message) {
        throw new Error(error.response.data.message);
      }
      
      // 일반적인 오류
      throw error;
    }
  },

  /**
   * 다른 사용자에게 송금을 수행합니다.
   * @param {Object} transferData - 송금 데이터
   * @param {number} transferData.fromAccountId - 출금 계좌 ID
   * @param {string} transferData.toAccountNumber - 입금 계좌번호
   * @param {number} transferData.amount - 송금 금액
   * @param {string} transferData.description - 송금 내용
   * @returns {Promise<Object>} 송금 처리 결과
   */
  sendMoney: async (transferData) => {
    try {
      const response = await api.post('/api/transactions/send', transferData);
      return transformTransactionData(response.data);
    } catch (error) {
      console.error('외부 이체 중 오류가 발생했습니다:', error);
      throw error;
    }
  },

  /**
   * 모든 이체/송금 내역을 가져옵니다.
   * @param {Object} params - 페이징, 정렬 등 추가 매개변수
   * @returns {Promise<Object>} 이체/송금 내역 목록 (페이징 처리)
   */
  getAllTransfers: async (params = {}) => {
    try {
      const response = await api.get('/api/transactions', { params });
      return response.data;
    } catch (error) {
      console.error('거래 내역을 가져오는 중 오류가 발생했습니다:', error);
      throw error;
    }
  },

  /**
   * 특정 이체/송금 내역을 ID로 조회합니다.
   * @param {number} transferId - 이체 ID
   * @returns {Promise<Object>} 이체/송금 상세 정보
   */
  getTransferById: async (transferId) => {
    try {
      const response = await api.get(`/api/transactions/${transferId}`);
      return transformTransactionData(response.data);
    } catch (error) {
      console.error(`이체 ID ${transferId} 조회 실패:`, error);
      throw error;
    }
  },

  getTransfersByAccountId: async (accountId, params = {}) => {
    try {
      const response = await api.get(`/api/transactions/account/${accountId}`, { params });
      
      // 응답 데이터에 content 필드가 있고 배열인 경우에만 변환 수행
      if (response.data && response.data.content && Array.isArray(response.data.content)) {
        return {
          ...response.data,
          content: response.data.content.map(transformTransactionData)
        };
      }
      
      return response.data;
    } catch (error) {
      console.error(`계좌 ${accountId}의 거래 내역을 가져오는 중 오류가 발생했습니다:`, error);
      throw error;
    }
  }
};

export default transferService; 