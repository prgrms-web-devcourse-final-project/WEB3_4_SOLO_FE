import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Button from '../components/ui/Button';
import MainLayout from '../components/layout/MainLayout';

const LoginPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.username || !formData.password) {
      setError('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }
    
    try {
      setLoading(true);
      
      // 백엔드 로그인 API 호출
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.username, // username 필드를 email로 변경
          password: formData.password
        }),
        credentials: 'include' // 쿠키 저장을 위해 필요
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '로그인에 실패했습니다.');
      }
      
      const data = await response.json();
      
      // 토큰을 로컬 스토리지에 저장
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      console.log('로그인 성공:', data);
      
      // 리디렉션 (이전 페이지나 홈으로)
      const redirectTo = router.query.redirect || '/';
      console.log('리디렉션 경로:', redirectTo);
      router.push(redirectTo);
      
    } catch (err) {
      console.error('로그인 중 오류가 발생했습니다:', err);
      setError(err.message || '로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = (provider) => {
    // OAuth2 로그인 URL로 리디렉션
    console.log(`${provider} 로그인 시도`);
    if (provider === 'kakao') {
      const kakaoLoginUrl = 'http://localhost:8080/api/auth/kakao/login';
      console.log('카카오 로그인 redirect: ' + kakaoLoginUrl);
      window.location.href = kakaoLoginUrl;
    }
  };

  return (
    <MainLayout>
      <div className="flex justify-center py-12">
        <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">로그인</h1>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                아이디
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="ID를 입력하세요"
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="비밀번호를 입력하세요"
              />
            </div>
            
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
              className="mb-4"
            >
              {loading ? '로그인 중...' : '로그인'}
            </Button>
            
            <div className="flex items-center my-4">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="mx-4 text-sm text-gray-500">또는</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>
            
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleOAuthLogin('kakao')}
                className="w-full py-2 px-4 border border-yellow-400 bg-yellow-300 text-yellow-900 rounded-md hover:bg-yellow-400 flex items-center justify-center"
              >
                <KakaoIcon className="h-5 w-5 mr-2" />
                카카오로 로그인
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-600">
            <span>계정이 없으신가요? </span>
            <Link href="/register">
              <span className="text-blue-600 hover:text-blue-500 cursor-pointer">
                회원가입
              </span>
            </Link>
          </div>
          
          {/* 개발 환경용 힌트 */}
          <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              <strong>개발용 관리자 계정:</strong><br />
              ID: admin@pleasybank.com<br />
              PW: admin1234
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

// 아이콘 컴포넌트
function KakaoIcon(props) {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" {...props}>
      <g clipPath="url(#clip0_123_456)">
        <path
          fill="#000000"
          d="M12 3C6.48 3 2 6.48 2 10.8c0 2.67 1.46 5.01 3.69 6.52-.16.57-.61 2.05-.7 2.37-.11.4.15.39.32.28.13-.08 2.02-1.37 2.36-1.61.77.11 1.55.17 2.33.17 5.52 0 10-3.48 10-7.8S17.52 3 12 3z"
        />
      </g>
      <defs>
        <clipPath id="clip0_123_456">
          <rect width="24" height="24" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

export default LoginPage; 