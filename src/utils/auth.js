/**
 * 인증 관련 유틸리티 함수
 */

// 토큰 저장
export const setToken = (token) => {
  if (!token) return false;
  try {
    localStorage.setItem('token', token);
    return true;
  } catch (e) {
    console.error('토큰 저장 오류:', e);
    return false;
  }
};

/**
 * 사용자가 로그인 상태인지 확인하는 함수
 * @returns {boolean} 로그인 상태 여부
 */
export const isAuthenticated = () => {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem('token');
  return !!token;
};

/**
 * 저장된 토큰을 가져오는 함수
 * @returns {string|null} JWT 토큰 또는 null
 */
export const getToken = () => {
  if (typeof window === 'undefined') return null;
  
  return localStorage.getItem('token');
};

// 토큰 삭제 (로그아웃)
export const removeToken = () => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('isAuthenticated');
    return true;
  } catch (e) {
    console.error('토큰 삭제 오류:', e);
    return false;
  }
};

// 인증 헤더 생성
export const getAuthHeaders = () => {
  const token = getToken();
  if (!token) return {};
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
};

// API 오류 응답 파싱 함수
export const parseErrorResponse = async (response) => {
  try {
    // JSON 형식으로 응답이 왔는지 확인
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      
      // 서버에서 정의한 오류 응답 포맷에 맞춰 처리
      if (errorData && errorData.message) {
        console.error('서버 오류 응답:', errorData);
        return {
          status: response.status,
          statusText: response.statusText,
          message: errorData.message,
          errorCode: errorData.errorCode || 'UNKNOWN_ERROR',
          details: errorData.details || {},
          timestamp: errorData.timestamp,
          path: errorData.path
        };
      }
    }
    
    // JSON이 아닌 경우 텍스트로 처리
    const errorText = await response.text();
    return {
      status: response.status,
      statusText: response.statusText,
      message: errorText || '알 수 없는 오류가 발생했습니다.',
      errorCode: 'UNKNOWN_ERROR'
    };
  } catch (error) {
    console.error('오류 응답 파싱 실패:', error);
    return {
      status: response.status,
      statusText: response.statusText,
      message: '서버 응답을 처리할 수 없습니다.',
      errorCode: 'PARSE_ERROR'
    };
  }
};

/**
 * 토큰을 사용하여 인증된 API 요청을 보내는 함수
 * @param {string} url - 요청할 URL
 * @param {Object} options - fetch 요청 옵션
 * @returns {Promise<Response>} fetch 응답 프로미스
 */
export const fetchWithAuth = async (url, options = {}) => {
  // 토큰 가져오기
  const token = getToken();
  
  // 토큰이 없으면 로그인 페이지로 리다이렉트
  if (!token) {
    console.log('인증 토큰이 없어 로그인 페이지로 리다이렉트합니다.');
    redirectToLogin();
    return null;
  }
  
  // 헤더에 인증 토큰 추가
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };
  
  try {
    console.log(`API 호출: ${url}`, { method: options.method || 'GET', headers: { ...headers, 'Authorization': '토큰 있음' } });
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    console.log(`API 응답: ${url}`, { status: response.status, statusText: response.statusText });
    
    // 401 Unauthorized 응답 시 토큰 만료로 간주하고 로그인 페이지로 리다이렉트
    if (response.status === 401) {
      console.log('인증 만료로 로그인 페이지로 리다이렉트합니다.');
      redirectToLogin();
      return null;
    }
    
    return response;
  } catch (error) {
    console.error(`API 호출 오류 (${url}):`, error);
    throw error;
  }
};

/**
 * 사용자 로그아웃 함수
 * @param {Function} callback - 로그아웃 후 실행할 콜백 함수
 */
export const logout = (callback) => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  if (callback) {
    callback();
  }
}; 