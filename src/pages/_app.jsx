import '../styles/globals.css';
import { useEffect } from 'react';
import Router from 'next/router';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

// API 불러오기 로딩 표시 설정
Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', () => NProgress.done());

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // 서버 연결 실패 시 모의 데이터를 사용하게 하는 설정
    window.USE_MOCK_DATA = true;
    
    // 개발 환경에서 API 요청에 대한 경고 메시지 억제
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (
        args[0]?.includes?.('API') ||
        args[0]?.includes?.('network') ||
        args[0]?.includes?.('fetch') ||
        args[0]?.includes?.('axios')
      ) {
        console.log('[DEV] API 요청 오류 무시:', args[0]);
        return;
      }
      originalConsoleError(...args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp; 