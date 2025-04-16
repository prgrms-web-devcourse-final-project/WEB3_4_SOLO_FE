/** @type {import('next').NextConfig} */
const nextConfig = {
  // 이미지 외부 도메인 허용
  images: {
    domains: ['k.kakaocdn.net', 'via.placeholder.com'],
  },
  
  // 웹팩 설정 추가
  webpack: (config, { isServer }) => {
    // 청크 로딩 타임아웃 증가
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    
    return config;
  },
  
  // API 요청 프록시 설정 - 백엔드 서버로 모든 요청 프록시
  async rewrites() {
    return [
      {
        // 모든 API 요청을 백엔드로 리다이렉트
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
      {
        // API v1 엔드포인트 명시적 프록시
        source: '/api/v1/:path*',
        destination: 'http://localhost:8080/api/v1/:path*',
      },
      {
        // OAuth 인증 관련 요청 프록시
        source: '/oauth2/:path*',
        destination: 'http://localhost:8080/oauth2/:path*',
      },
      {
        source: '/login/oauth2/:path*',
        destination: 'http://localhost:8080/login/oauth2/:path*',
      }
    ];
  },
};

module.exports = nextConfig; 