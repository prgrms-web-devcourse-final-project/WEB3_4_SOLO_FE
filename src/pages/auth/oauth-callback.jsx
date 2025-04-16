import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '@/components/layout/MainLayout';
import Spinner from '@/components/ui/Spinner';
import { setToken } from '../../utils/auth';

/**
 * OAuth 인증 후 리다이렉트되는 페이지
 * JWT 토큰을 쿼리 파라미터에서 추출하여 저장
 */
const OAuthCallbackPage = () => {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // 라우터가 준비되지 않은 경우 (router.isReady가 false)
    if (!router.isReady) return;
    
    console.log('OAuth 콜백 받음:', router.query);
    
    const { token, refreshToken, error: queryError } = router.query;
    
    if (queryError) {
      console.error('OAuth 인증 오류:', queryError);
      setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
      setIsLoading(false);
      return;
    }
    
    if (!token) {
      console.error('토큰을 찾을 수 없습니다.');
      setError('로그인 처리 중 오류가 발생했습니다.');
      setIsLoading(false);
      return;
    }
    
    // 토큰 저장 (인증 유틸리티 사용)
    try {
      // 토큰 저장
      const tokenSaved = setToken(token);
      
      if (!tokenSaved) {
        throw new Error('토큰 저장 실패');
      }
      
      // 리프레시 토큰 저장
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
        console.log('리프레시 토큰이 저장되었습니다.');
      }
      
      localStorage.setItem('isAuthenticated', 'true');
      console.log('카카오 로그인 성공: 토큰 저장됨');
      
      // 홈페이지로 리다이렉트
      router.push('/');
    } catch (e) {
      console.error('토큰 저장 중 오류:', e);
      setError('로그인 정보를 저장하는데 실패했습니다.');
      setIsLoading(false);
    }
  }, [router.isReady, router.query]);
  
  return (
    <MainLayout>
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        {error ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-lg shadow-md max-w-md w-full">
            <h2 className="text-xl font-bold mb-2">로그인 오류</h2>
            <p>{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              다시 시도하기
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Spinner size="large" />
            <p className="mt-4 text-gray-600">로그인 처리 중입니다...</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default OAuthCallbackPage; 