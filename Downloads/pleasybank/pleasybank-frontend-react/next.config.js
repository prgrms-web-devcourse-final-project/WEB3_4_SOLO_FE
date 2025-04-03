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
  
  // API 요청 프록시 설정
  async rewrites() {
    return [
      {
        // 백엔드 API로 요청 프록시
        source: '/api/accounts/:path*',
        destination: 'http://localhost:8080/api/accounts/:path*',
      },
      {
        source: '/api/user/:path*',
        destination: 'http://localhost:8080/api/user/:path*',
      },
      {
        source: '/api/transfer',
        destination: 'http://localhost:8080/api/transfer',
      },
      {
        source: '/api/openbanking/:path*',
        destination: 'http://localhost:8080/api/openbanking/:path*',
      },
      {
        // OAuth 인증 관련 요청 프록시
        source: '/oauth2/:path*',
        destination: 'http://localhost:8080/oauth2/:path*',
      },
      {
        source: '/login/oauth2/:path*',
        destination: 'http://localhost:8080/login/oauth2/:path*',
      },
      {
        source: '/auth/:path*',
        destination: 'http://localhost:8080/auth/:path*',
      },
    ];
  },
};

module.exports = nextConfig; 