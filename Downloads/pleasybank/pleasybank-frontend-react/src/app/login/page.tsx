'use client';

import { useRouter } from 'next/navigation';
import { Box, Button, Center, Container, Heading, Stack, Text, useToast } from '@chakra-ui/react';
import { useDispatch } from 'react-redux';
import { loginStart } from '@/store/features/authSlice';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const toast = useToast();

  const handleKakaoLogin = () => {
    dispatch(loginStart());
    console.log('카카오 로그인 시도');
    
    // 실제 구현에서는 카카오 로그인 페이지로 리디렉션
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/oauth2/authorize/kakao`;
  };

  const handlePinLogin = () => {
    console.log('PIN 로그인 시도');
    router.push('/login/pin');
  };

  const handleBiometricLogin = () => {
    console.log('생체인증 로그인 시도');
    toast({
      title: '준비 중인 기능입니다',
      description: '생체인증 로그인은 현재 개발 중입니다',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Box className="container-with-border">
      <Center flexDirection="column">
        <Box textAlign="center" mb={8}>
          <Heading 
            fontSize="6xl" 
            fontWeight="bold" 
            color="primary" 
            fontStyle="italic" 
            fontFamily="Georgia, serif"
          >
            PleasyBank
          </Heading>
          <Text mt={2} color="gray.600">
            간편하게 행복을 가져다주는 금융
          </Text>
        </Box>

        <Container maxW="450px" bg="white" borderRadius="lg" boxShadow="sm" p={6} borderWidth="1px" borderColor="gray.200">
          <Stack spacing={4}>
            <Button
              onClick={handleKakaoLogin}
              bg="#FEE500"
              color="black"
              size="lg"
              w="full"
              leftIcon={<Box as="span" mr={2}>●</Box>}
            >
              카카오톡으로 간편로그인
            </Button>
            
            <Button
              onClick={handlePinLogin}
              bg="#4466BA"
              color="white"
              size="lg"
              w="full"
            >
              PIN번호로 간편로그인
            </Button>
            
            <Button
              onClick={handleBiometricLogin}
              bg="#4CAF50"
              color="white"
              size="lg"
              w="full"
            >
              생체인증으로 간편로그인
            </Button>
          </Stack>
        </Container>
      </Center>
    </Box>
  );
} 