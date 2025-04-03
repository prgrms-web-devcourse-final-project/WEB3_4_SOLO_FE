'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Box,
    Heading,
    Text,
    Button,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Container,
    Spinner,
    useToast
} from '@chakra-ui/react';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '@/store/features/authSlice';

export default function TokenDisplayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const dispatch = useDispatch();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const token = searchParams?.get('token');
    const errorParam = searchParams?.get('error');
    
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      setLoading(false);
      return;
    }
    
    if (token) {
      // 토큰이 있다면 Redux 스토어에 저장하고 로컬 스토리지에도 저장
      localStorage.setItem('auth_token', token);
      
      // 사용자 정보 가져오기 (토큰으로 사용자 정보를 가져오는 API 호출)
      // 이 예제에서는 토큰만 저장하고 사용자 정보는 임시로 생성합니다.
      const mockUser = {
        id: '123',
        username: '사용자',
      };
      
      dispatch(loginSuccess({ user: mockUser, token }));
      
      toast({
        title: '로그인 성공',
        description: '환영합니다!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // 일정 시간 후 홈 페이지로 리디렉션
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } else {
      setError('인증 토큰을 받지 못했습니다.');
    }
    
    setLoading(false);
  }, [searchParams, dispatch, router, toast]);
  
  const handleRetry = () => {
    router.push('/login');
  };
  
  if (loading) {
    return (
      <Container centerContent maxW="lg" py={10}>
        <Box textAlign="center" py={10} px={6}>
          <Spinner size="xl" color="primary" />
          <Text mt={4}>인증 처리 중입니다...</Text>
        </Box>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container centerContent maxW="lg" py={10}>
        <Alert status="error" borderRadius="md" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" py={4}>
          <AlertIcon boxSize="40px" mr={0} />
          <AlertTitle mt={4} mb={1} fontSize="lg">로그인에 실패했습니다</AlertTitle>
          <AlertDescription maxWidth="sm">{error}</AlertDescription>
          <Button mt={4} colorScheme="red" onClick={handleRetry}>다시 시도하기</Button>
        </Alert>
      </Container>
    );
  }
  
  return (
    <Container centerContent maxW="lg" py={10}>
      <Box textAlign="center" py={10} px={6}>
        <Heading as="h2" size="xl" mt={6} mb={2}>로그인 성공!</Heading>
        <Text color="gray.600">인증되었습니다. 잠시 후 메인 페이지로 이동합니다.</Text>
      </Box>
    </Container>
  );
} 