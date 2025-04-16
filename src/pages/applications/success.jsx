import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '../../components/layout/MainLayout';

const ApplicationSuccess = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 로그인 상태가 아니면 로그인 페이지로 리디렉션
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return false;
      }
      return true;
    };
    
    const isAuthenticated = checkAuth();
    if (isAuthenticated) {
      setLoading(false);
    }
  }, [router]);

  // 로그인 상태가 아니면 빈 페이지 렌더링 (로딩 중)
  if (loading) {
    return <div className="loading">로그인 확인 중...</div>;
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="mt-6 text-3xl font-extrabold text-gray-900">신청이 완료되었습니다!</h1>
          <p className="mt-2 text-lg text-gray-500">
            상품 신청이 성공적으로 접수되었습니다. 담당자가 검토 후 연락드리겠습니다.
          </p>
          
          <div className="mt-10 bg-gray-50 rounded-lg p-6 text-left">
            <h2 className="text-lg font-medium text-gray-900 mb-4">다음 단계</h2>
            <ul className="space-y-4">
              <li className="flex">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-800 font-medium">1</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">신청 내역 검토</p>
                  <p className="mt-1 text-sm text-gray-500">담당자가 신청 내용을 확인하고 추가 정보가 필요한 경우 연락드립니다.</p>
                </div>
              </li>
              <li className="flex">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-800 font-medium">2</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">승인 및 계약</p>
                  <p className="mt-1 text-sm text-gray-500">신청이 승인되면 계약서에 서명하여 진행합니다.</p>
                </div>
              </li>
              <li className="flex">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-800 font-medium">3</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">상품 개설 완료</p>
                  <p className="mt-1 text-sm text-gray-500">모든 절차가 완료되면 상품이 개설되고 마이페이지에서 확인 가능합니다.</p>
                </div>
              </li>
            </ul>
          </div>
          
          <div className="mt-8 space-y-4">
            <Link href="/products">
              <div className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
                다른 상품 보기
              </div>
            </Link>
            <div className="block">
              <Link href="/dashboard">
                <div className="text-blue-600 hover:text-blue-800 cursor-pointer">
                  대시보드로 이동
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ApplicationSuccess; 