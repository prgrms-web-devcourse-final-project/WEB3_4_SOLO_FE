'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box, Container, Heading, Text, Button, VStack, List, ListItem, ListIcon, SimpleGrid,
    Card, CardBody, Center, Alert,
    AlertIcon, AlertTitle, AlertDescription, useColorModeValue
} from '@chakra-ui/react';
import { CheckCircleIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { getOpenBankingAuthUrl } from '@/services/api';

export default function AccountLinkPage() {
  const router = useRouter();
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  useEffect(() => {
    // 인증되지 않은 사용자는 로그인 페이지로 리디렉션
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);
  
  const handleLinkOpenBanking = async () => {
    if (!token) {
      setError('인증 정보가 없습니다. 다시 로그인해 주세요.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // 백엔드에서 오픈뱅킹 인증 URL 요청
      const response = await getOpenBankingAuthUrl();
      
      if (response && response.authorizationUrl) {
        // 인증 URL로 리디렉션
        window.location.href = response.authorizationUrl;
      } else {
        setError('인증 URL을 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('오픈뱅킹 인증 URL 요청 실패:', err);
      setError('오픈뱅킹 연결 요청 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading size="xl" mb={4}>계좌 연결하기</Heading>
          <Text color="gray.600" mb={6}>
            금융결제원 오픈뱅킹 API를 통해 다양한 은행의 계좌를 한 곳에서 관리하세요.
          </Text>
        </Box>
        
        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <AlertTitle mr={2}>연결 오류!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
          <Box>
            <Card 
              shadow="md" 
              borderWidth="1px" 
              borderRadius="lg" 
              bg={bgColor} 
              borderColor={borderColor}
              p={6}
              height="100%"
            >
              <CardBody>
                <VStack spacing={6} align="start">
                  <Heading size="md">오픈뱅킹 서비스 이용 안내</Heading>
                  <List spacing={3}>
                    <ListItem>
                      <ListIcon as={CheckCircleIcon} color="green.500" />
                      전국 은행의 계좌를 한 번에 확인
                    </ListItem>
                    <ListItem>
                      <ListIcon as={CheckCircleIcon} color="green.500" />
                      계좌 잔액 실시간 조회
                    </ListItem>
                    <ListItem>
                      <ListIcon as={CheckCircleIcon} color="green.500" />
                      거래내역 확인 및 분석
                    </ListItem>
                    <ListItem>
                      <ListIcon as={CheckCircleIcon} color="green.500" />
                      계좌 간 이체 서비스
                    </ListItem>
                    <ListItem>
                      <ListIcon as={CheckCircleIcon} color="green.500" />
                      자산 관리 및 예산 설정
                    </ListItem>
                  </List>
                  
                  <Text mt={4} fontSize="sm" color="gray.600">
                    연결을 위해 금융결제원에서 제공하는 오픈뱅킹 서비스에 등록되어 있는 본인의 계좌 정보 제공에 동의합니다.
                  </Text>
                  
                  <Button 
                    colorScheme="blue" 
                    size="lg" 
                    width="full"
                    rightIcon={<ExternalLinkIcon />}
                    onClick={handleLinkOpenBanking}
                    isLoading={isLoading}
                    loadingText="연결 중..."
                  >
                    오픈뱅킹 연결하기
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          </Box>
          
          <Box>
            <Card 
              shadow="md" 
              borderWidth="1px" 
              borderRadius="lg" 
              bg={bgColor} 
              borderColor={borderColor}
              p={6}
              height="100%"
            >
              <CardBody>
                <VStack spacing={6} align="center">
                  <Heading size="md">제휴 은행</Heading>
                  <Text color="gray.600" textAlign="center">
                    금융결제원 오픈뱅킹에 가입된 모든 은행의 계좌를 연결할 수 있습니다.
                  </Text>
                  
                  <SimpleGrid columns={3} spacing={4} width="100%">
                    <Center p={2} borderWidth="1px" borderRadius="md">
                      <Text fontWeight="bold">국민은행</Text>
                    </Center>
                    <Center p={2} borderWidth="1px" borderRadius="md">
                      <Text fontWeight="bold">신한은행</Text>
                    </Center>
                    <Center p={2} borderWidth="1px" borderRadius="md">
                      <Text fontWeight="bold">우리은행</Text>
                    </Center>
                    <Center p={2} borderWidth="1px" borderRadius="md">
                      <Text fontWeight="bold">하나은행</Text>
                    </Center>
                    <Center p={2} borderWidth="1px" borderRadius="md">
                      <Text fontWeight="bold">농협은행</Text>
                    </Center>
                    <Center p={2} borderWidth="1px" borderRadius="md">
                      <Text fontWeight="bold">기업은행</Text>
                    </Center>
                    <Center p={2} borderWidth="1px" borderRadius="md">
                      <Text fontWeight="bold">SC제일</Text>
                    </Center>
                    <Center p={2} borderWidth="1px" borderRadius="md">
                      <Text fontWeight="bold">카카오뱅크</Text>
                    </Center>
                    <Center p={2} borderWidth="1px" borderRadius="md">
                      <Text fontWeight="bold">토스뱅크</Text>
                    </Center>
                  </SimpleGrid>
                  
                  <Text fontSize="sm" color="gray.500" textAlign="center">
                    그 외 금융결제원 오픈뱅킹 시스템에 등록된 모든 은행
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          </Box>
        </SimpleGrid>
        
        <Box mt={8}>
          <Heading size="md" mb={4}>자주 묻는 질문</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <Box 
              p={4} 
              shadow="md" 
              borderWidth="1px" 
              borderRadius="lg" 
              bg={bgColor} 
              borderColor={borderColor}
            >
              <Heading size="sm" mb={2}>계좌 연결은 안전한가요?</Heading>
              <Text fontSize="sm">
                네, 금융결제원의 공식 오픈뱅킹 API를 사용하며, 모든 통신은 암호화됩니다.
                사용자의 계좌 정보와 개인정보는 안전하게 보호됩니다.
              </Text>
            </Box>
            <Box 
              p={4} 
              shadow="md" 
              borderWidth="1px" 
              borderRadius="lg" 
              bg={bgColor} 
              borderColor={borderColor}
            >
              <Heading size="sm" mb={2}>연결 후 취소할 수 있나요?</Heading>
              <Text fontSize="sm">
                네, 언제든지 설정에서 계좌 연결을 해제할 수 있습니다.
                계좌 연결 해제 시 저장된 모든 계좌 정보는 즉시 삭제됩니다.
              </Text>
            </Box>
            <Box 
              p={4} 
              shadow="md" 
              borderWidth="1px" 
              borderRadius="lg" 
              bg={bgColor} 
              borderColor={borderColor}
            >
              <Heading size="sm" mb={2}>어떤 정보를 확인할 수 있나요?</Heading>
              <Text fontSize="sm">
                계좌 잔액, 거래 내역, 이체 등 다양한 금융 정보를 확인하고 관리할 수 있습니다.
                단, 뱅킹 앱에서 제공하는 일부 특화 기능은 제한될 수 있습니다.
              </Text>
            </Box>
            <Box 
              p={4} 
              shadow="md" 
              borderWidth="1px" 
              borderRadius="lg" 
              bg={bgColor} 
              borderColor={borderColor}
            >
              <Heading size="sm" mb={2}>이체는 어떻게 하나요?</Heading>
              <Text fontSize="sm">
                계좌 연결 후, 이체 메뉴에서 출금계좌와 입금계좌를 선택하여 간편하게 이체할 수 있습니다.
                모든 이체는 본인 인증을 통해 안전하게 처리됩니다.
              </Text>
            </Box>
          </SimpleGrid>
        </Box>
      </VStack>
    </Container>
  );
} 