import axios from 'axios'

// API 기본 URL 설정
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// 기본 API 클라이언트 생성
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 요청 인터셉터 설정
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 응답 인터셉터 설정
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    // 401 에러 처리 (인증 만료)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // 여기에 토큰 갱신 로직 추가 가능
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (provider: string) => apiClient.get(`/oauth2/authorize/${provider}`),
  getToken: (code: string, provider: string) => 
    apiClient.get(`/auth/token?code=${code}&provider=${provider}`),
  logout: () => apiClient.post('/auth/logout'),
}

// User API
export const userAPI = {
  getCurrentUser: () => apiClient.get('/user/me'),
  updateProfile: (data: any) => apiClient.put('/user/me', data),
}

// 오픈뱅킹 인증 URL 가져오기
export const getOpenBankingAuthUrl = async () => {
  try {
    const response = await apiClient.get('/openbanking/auth-url')
    return response.data
  } catch (error) {
    console.error('오픈뱅킹 인증 URL 요청 실패:', error)
    throw error
  }
}

export default apiClient 