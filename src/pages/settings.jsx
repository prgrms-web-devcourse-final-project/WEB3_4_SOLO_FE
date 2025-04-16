import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';
import axios from '../utils/axiosConfig';

const SettingsPage = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: ''
  });
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // 클라이언트 사이드 렌더링 여부 확인
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 로그인 확인
  useEffect(() => {
    if (!isClient) return;
    
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token) {
      // 토큰이 없으면 로그인 페이지로 리디렉션
      router.push('/login');
      return;
    }
    
    setIsAuthenticated(true);
    
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setFormData({
          name: parsedUser.name || '',
          phoneNumber: parsedUser.phoneNumber || ''
        });
      } catch (error) {
        console.error('사용자 데이터 파싱 오류:', error);
      }
    } else {
      // 사용자 정보 API 호출
      fetchUserProfile();
    }
  }, [router, isClient]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users/me');
      setUser(response.data);
      setFormData({
        name: response.data.name || '',
        phoneNumber: response.data.phoneNumber || ''
      });
      setError(null);
    } catch (err) {
      console.error('사용자 정보를 불러오는 중 오류가 발생했습니다:', err);
      setError('사용자 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      // formData에서 필요한 필드만 API 호출에 사용
      // 이메일은 아예 제외하여 서버가 기존 이메일을 유지하도록 함
      const apiData = {
        name: formData.name,
        phoneNumber: formData.phoneNumber
      };
      
      console.log('프로필 업데이트 요청 데이터:', apiData);
      
      // 프로필 업데이트 API 호출
      const response = await axios.put('/api/users/me', apiData);
      console.log('프로필 업데이트 응답:', response.data);
      
      // 로컬 스토리지의 사용자 정보 업데이트
      const userString = localStorage.getItem('user');
      if (userString) {
        const userObject = JSON.parse(userString);
        const updatedUser = { 
          ...userObject, 
          name: formData.name,
          phoneNumber: formData.phoneNumber
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      // 상태 업데이트
      setUser(prev => ({ 
        ...prev, 
        name: formData.name,
        phoneNumber: formData.phoneNumber
      }));
      
      setUpdateSuccess(true);
      setIsEditing(false);
      
      // 3초 후 성공 메시지 숨기기
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);
      
    } catch (err) {
      console.error('프로필 업데이트 중 오류가 발생했습니다:', err);
      
      // 오류 응답에서 메시지 추출
      const errorMessage = err.response?.data?.message || 
                           err.response?.data?.error || 
                           '프로필 업데이트 중 오류가 발생했습니다.';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 로그인 상태가 아니면 빈 페이지 렌더링 (로그인 페이지로 리디렉션 중)
  if (isClient && !isAuthenticated) {
    return <div className="loading">로그인 페이지로 이동 중...</div>;
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">설정</h1>
        
        {loading && !user ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {updateSuccess && (
              <div className="bg-green-50 p-4 rounded-md mb-6">
                <p className="text-green-600">프로필이 성공적으로 업데이트되었습니다.</p>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 p-4 rounded-md mb-6">
                <p className="text-red-600">{error}</p>
                <button
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  onClick={() => window.location.reload()}
                >
                  다시 시도
                </button>
              </div>
            )}
            
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="bg-blue-600 px-6 py-4">
                <h2 className="text-xl text-white font-semibold">
                  {user?.name || user?.username || '사용자'} 님의 프로필
                </h2>
              </div>
              
              <div className="p-6">
                {isEditing ? (
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          이름
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          이메일 (수정 불가)
                        </label>
                        <input
                          type="email"
                          value={user?.email || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                          readOnly
                        />
                        <p className="mt-1 text-xs text-gray-500">이메일은 고유 식별자로 수정할 수 없습니다.</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          전화번호
                        </label>
                        <input
                          type="tel"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div className="flex justify-end space-x-3 pt-4">
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => setIsEditing(false)}
                        >
                          취소
                        </Button>
                        <Button
                          variant="primary"
                          type="submit"
                          disabled={loading}
                        >
                          {loading ? '저장 중...' : '저장'}
                        </Button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-medium mb-4">기본 정보</h3>
                        <dl className="space-y-3">
                          <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                            <dt className="text-sm font-medium text-gray-500">이름</dt>
                            <dd className="text-sm text-gray-900 col-span-2">{user?.name || '미등록'}</dd>
                          </div>
                          <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                            <dt className="text-sm font-medium text-gray-500">이메일</dt>
                            <dd className="text-sm text-gray-900 col-span-2">{user?.email || '미등록'}</dd>
                          </div>
                          <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                            <dt className="text-sm font-medium text-gray-500">전화번호</dt>
                            <dd className="text-sm text-gray-900 col-span-2">{user?.phoneNumber || '미등록'}</dd>
                          </div>
                          <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                            <dt className="text-sm font-medium text-gray-500">가입일</dt>
                            <dd className="text-sm text-gray-900 col-span-2">
                              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '정보 없음'}
                            </dd>
                          </div>
                        </dl>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium mb-4">보안 정보</h3>
                        <dl className="space-y-3">
                          <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                            <dt className="text-sm font-medium text-gray-500">계정 상태</dt>
                            <dd className="text-sm text-gray-900 col-span-2">
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                활성
                              </span>
                            </dd>
                          </div>
                          <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                            <dt className="text-sm font-medium text-gray-500">마지막 로그인</dt>
                            <dd className="text-sm text-gray-900 col-span-2">
                              {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('ko-KR') : '정보 없음'}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                    
                    <div className="mt-8 flex flex-wrap gap-3">
                      <Button
                        variant="primary"
                        onClick={() => setIsEditing(true)}
                      >
                        프로필 수정
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => router.push('/myproducts')}
                      >
                        내 금융상품 보기
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default SettingsPage; 