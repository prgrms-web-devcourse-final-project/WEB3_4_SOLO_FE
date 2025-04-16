import axios from 'axios';

// API 기본 인스턴스 설정
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // 쿠키 인증 정보 전송 설정
});

// 브라우저 환경인지 확인하는 함수
const isBrowser = () => typeof window !== 'undefined';

// Request 인터셉터 (모든 요청에 공통 헤더 추가 등)
axiosInstance.interceptors.request.use(
  (config) => {
    // 브라우저 환경에서만 localStorage 접근
    if (isBrowser()) {
      // 토큰이 있으면 Authorization 헤더에 추가
      const token = localStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response 인터셉터 (에러 처리 등)
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 서버 응답 없음
    if (!error.response) {
      console.error('서버에 연결할 수 없습니다.');
      return Promise.reject(error);
    }
    
    // 브라우저 환경에서만 실행
    if (isBrowser()) {
      // 401 에러 (인증 실패)
      if (error.response.status === 401) {
        console.log('인증이 필요합니다. 로그인 페이지로 이동합니다.');
        // 로컬 스토리지에서 토큰 제거
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // 로그인 페이지로 리디렉션
        window.location.href = '/login';
      }
      
      // 403 에러 (권한 없음)
      if (error.response.status === 403) {
        console.log('접근 권한이 없습니다.');
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance; 