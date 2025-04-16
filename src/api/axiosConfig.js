import axios from 'axios';

// API 기본 URL 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// axios 인스턴스 생성
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10초 타임아웃
});

// 브라우저 환경인지 확인
const isBrowser = () => typeof window !== 'undefined';

// 요청 인터셉터
axiosInstance.interceptors.request.use(
  (config) => {
    // 브라우저 환경에서만 localStorage 접근
    if (isBrowser()) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    // API 경로에 /api 접두사가 없으면 추가 (단, 이미 완전한 URL이 아닌 경우에만)
    if (config.url && !config.url.startsWith('http') && !config.url.startsWith('/api/')) {
      config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 브라우저 환경에서만 실행
    if (isBrowser()) {
      // 401 에러 (인증 만료) 처리
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      
      // 500 에러 (서버 오류) 로깅
      if (error.response && error.response.status >= 500) {
        console.error('서버 오류가 발생했습니다:', error.response.data);
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance; 