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
    if (isBrowser()) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    // 요청 URL 로깅 (디버깅용)
    console.log(`API 요청: ${config.method?.toUpperCase() || 'GET'} ${config.baseURL || ''}${config.url}`);
    
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터 - 에러 처리
instance.interceptors.response.use(
  (response) => {
    // 요청 성공 로깅 (디버깅용)
    console.log(`API 응답 성공: ${response.config.url}`, response.status);
    return response;
  },
  (error) => {
    // 오류 정보 상세 로깅
    console.error('API 오류 발생:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
    });
    
    // 자유입출금 계좌 생성 관련 오류 특별 처리
    if (error.config?.url?.includes('/api/products/subscriptions') && 
        error.response?.status === 500) {
      // 자유입출금 계좌 생성 제한 오류로 처리
      if (error.config?.data && JSON.parse(error.config.data).productId === 3) {
        error.customMessage = '자유입출금 계좌는 최대 2개까지만 개설할 수 있습니다.';
      }
    }
    
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

// 금융 상품 서비스 함수
const productService = {
  /**
   * 모든 금융 상품 목록을 가져옵니다.
   * @param {Object} params - 페이징, 정렬 등 추가 매개변수
   * @returns {Promise<Object>} 금융 상품 목록 (페이징 처리)
   */
  getAllProducts: async (params = {}) => {
    try {
      // 로그인한 사용자인 경우 인증 토큰 사용
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await instance.get('/api/products', {
        params,
        headers
      });
      
      return response.data;
    } catch (error) {
      console.error('금융 상품 목록 조회 실패:', error);
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
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 로그인이 필요합니다.');
      }

      const response = await instance.get(`/api/v1/products/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`상품 ID ${productId} 상세 조회 실패:`, error);
      throw error;
    }
  },

  /**
   * 금융 상품 유형별로 상품 목록을 가져옵니다.
   * @param {string} type - 금융 상품 유형 (예: SAVINGS, DEPOSIT, FUND 등)
   * @param {Object} params - 페이징, 정렬 등 추가 매개변수
   * @returns {Promise<Object>} 금융 상품 목록 (페이징 처리)
   */
  getProductsByType: async (type, params = {}) => {
    try {
      const response = await instance.get(`/api/v1/products/type/${type}`, { params });
      return response.data;
    } catch (error) {
      console.error(`${type} 유형의 금융 상품 목록 조회 실패:`, error);
      throw error;
    }
  },

  /**
   * 최고 금리 상품 목록을 가져옵니다.
   * @param {number} limit - 조회할 상품 수 (기본값: 5)
   * @returns {Promise<Array>} 최고 금리 상품 목록
   */
  getTopRateProducts: async (limit = 5) => {
    try {
      const response = await instance.get(`/api/products/top-rate?limit=${limit}`);
      
      // 백엔드에서 반환하는 데이터 구조에 따라 처리
      let result = response.data;
      
      // 데이터가 배열이 아닌 경우 content 필드를 확인
      if (!Array.isArray(result) && result.content) {
        result = result.content;
      }
      
      // 각 상품의 필수 필드 확인 및 기본값 설정
      return result.map(product => ({
        id: product.id,
        name: product.name || '상품명 없음',
        category: product.category || 'UNKNOWN',
        interestRate: product.interestRate || 0,
        term: product.term || null,
        description: product.description || '',
        minAmount: product.minAmount || 0,
        maxAmount: product.maxAmount || null
      }));
    } catch (error) {
      console.error('최고 금리 상품 목록 조회 실패:', error);
      throw error;
    }
  },

  /**
   * 금융 상품 가입을 신청합니다.
   * @param {Object} subscriptionData - 가입 신청 데이터
   * @param {number} subscriptionData.productId - 금융 상품 ID
   * @param {number} subscriptionData.accountId - 연결 계좌 ID
   * @param {number} subscriptionData.amount - 가입 금액
   * @param {string} subscriptionData.term - 가입 기간 (상품에 따라 다름)
   * @returns {Promise<Object>} 가입 신청 결과
   */
  subscribeProduct: async (subscriptionData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 로그인이 필요합니다.');
      }

      const response = await instance.post('/api/v1/myproducts', subscriptionData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('금융 상품 가입 실패:', error);
      throw error;
    }
  },

  /**
   * 사용자의 금융 상품 가입 목록을 가져옵니다.
   * @param {Object} params - 페이징, 정렬 등 추가 매개변수
   * @returns {Promise<Object>} 가입 상품 목록 (페이징 처리)
   */
  getMySubscriptions: async (params = {}) => {
    try {
      const response = await instance.get('/api/v1/subscriptions/my', { params });
      return response.data;
    } catch (error) {
      console.error('가입 상품 목록 조회 실패:', error);
      throw error;
    }
  },

  /**
   * 금융 상품 가입 상세 정보를 가져옵니다.
   * @param {number} subscriptionId - 가입 ID
   * @returns {Promise<Object>} 가입 상세 정보
   */
  getSubscriptionById: async (subscriptionId) => {
    try {
      const response = await instance.get(`/api/v1/subscriptions/${subscriptionId}`);
      return response.data;
    } catch (error) {
      console.error(`가입 ID ${subscriptionId} 조회 실패:`, error);
      throw error;
    }
  },

  /**
   * 금융 상품 가입을 해지합니다.
   * @param {number} subscriptionId - 가입 ID
   * @returns {Promise<Object>} 해지 결과
   */
  cancelSubscription: async (subscriptionId) => {
    try {
      const response = await instance.delete(`/api/v1/subscriptions/${subscriptionId}`);
      return response.data;
    } catch (error) {
      console.error(`가입 ID ${subscriptionId} 해지 실패:`, error);
      throw error;
    }
  },

  /**
   * 사용자의 총 투자/가입 금액을 조회합니다.
   * @returns {Promise<Object>} 총 투자 금액 정보
   */
  getTotalInvestedAmount: async () => {
    try {
      const response = await instance.get('/api/v1/subscriptions/my/total-amount');
      return response.data;
    } catch (error) {
      console.error('총 투자 금액 조회 실패:', error);
      throw error;
    }
  }
};

export default productService; 