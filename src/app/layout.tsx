import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'PleasyBank - 간편하게 행복을 가져다주는 금융',
  description: 'PleasyBank는 간편하고 빠른 금융 서비스를 제공합니다. 카카오톡으로 로그인하거나, PIN번호 또는 생체인증을 통해 쉽게 이용하세요.'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
} 