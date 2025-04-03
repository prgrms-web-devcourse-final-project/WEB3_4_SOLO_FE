'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Container,
    Heading,
    Text,
    SimpleGrid,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    Button,
    useColorModeValue,
    Spinner,
    Center,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription, Divider, Flex,
    Card,
    CardBody,
    CardHeader
} from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { getAccounts, getAccountBalance, Account, AccountBalance } from '@/services/accountService';
import { formatCurrency } from '@/utils/formatters';
import { ArrowForwardIcon, AddIcon } from '@chakra-ui/icons';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user, token } = useSelector((state: RootState) => state.auth);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountBalances, setAccountBalances] = useState<Record<string, AccountBalance>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  useEffect(() => {
    // 인증되지 않은 사용자는 로그인 페이지로 리디렉션
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);
  
  useEffect(() => {
    // 계좌 정보 로드
    const fetchAccountData = async () => {
      if (isAuthenticated && token) {
        try {
          setLoading(true);
          // 계좌 목록 가져오기
          const accountsData = await getAccounts(token);
          setAccounts(accountsData.accounts);
          
          // 각 계좌의 잔액 가져오기
          const balances: Record<string, AccountBalance> = {};
          for (const account of accountsData.accounts) {
            try {
              const balance = await getAccountBalance(account.fintechUseNum, token);
              balances[account.fintechUseNum] = balance;
            } catch (err) {
              console.error(`계좌 ${account.accountNumber} 잔액 조회 실패:`, err);
            }
          }
          setAccountBalances(balances);
          
          setError('');
        } catch (err) {
          console.error('계좌 데이터 로드 중 오류 발생:', err);
          setError('계좌 정보를 불러오는 중 오류가 발생했습니다. 금융결제원 API 연동 상태를 확인해주세요.');
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchAccountData();
  }, [isAuthenticated, token]);
  
  if (!isAuthenticated) {
    return null; // 인증 확인 중에는 아무것도 표시하지 않음
  }
  
  // 총 잔액 계산
  const totalBalance = Object.values(accountBalances).reduce((sum, balance) => {
    return sum + (balance?.availableBalance || 0);
  }, 0);
  
  return (
    <Container maxW="container.xl" py={8}>
      <Box textAlign="center" mb={8}>
        <Heading size="xl">안녕하세요, {user?.name || '고객'}님!</Heading>
        <Text mt={2} color="gray.600">PleasyBank 대시보드에 오신 것을 환영합니다</Text>
      </Box>
      
      {loading ? (
        <Center py={10}>
          <Spinner size="xl" />
        </Center>
      ) : error ? (
        <Alert status="error" borderRadius="md" mb={6}>
          <AlertIcon />
          <AlertTitle mr={2}>오류 발생!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : accounts.length === 0 ? (
        <Box 
          p={6} 
          shadow="md" 
          borderWidth="1px" 
          borderRadius="lg" 
          bg="blue.50" 
          textAlign="center"
          mb={8}
        >
          <Heading size="md" mb={3}>연결된 계좌가 없습니다</Heading>
          <Text mb={4}>
            금융결제원 오픈뱅킹 API를 통해 계좌를 연결해보세요.
          </Text>
          <Button 
            leftIcon={<AddIcon />} 
            colorScheme="blue" 
            onClick={() => router.push('/account/link')}
            size="lg"
          >
            계좌 연결하기
          </Button>
        </Box>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
            <Stat
              p={6}
              shadow="md"
              borderWidth="1px"
              borderRadius="lg"
              bg={bgColor}
              borderColor={borderColor}
            >
              <StatLabel fontSize="lg">총 자산</StatLabel>
              <StatNumber fontSize="3xl">{formatCurrency(totalBalance)}</StatNumber>
              <StatHelpText>연결된 계좌 기준</StatHelpText>
              <Flex justifyContent="flex-end" mt={4}>
                <Button
                  rightIcon={<ArrowForwardIcon />}
                  colorScheme="blue"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/account/summary')}
                >
                  자산 요약 보기
                </Button>
              </Flex>
            </Stat>
            
            <Stat
              p={6}
              shadow="md"
              borderWidth="1px"
              borderRadius="lg"
              bg={bgColor}
              borderColor={borderColor}
            >
              <StatLabel fontSize="lg">이번 달 지출</StatLabel>
              <StatNumber fontSize="3xl">1,250,000원</StatNumber>
              <StatHelpText>전월 대비 15% 감소</StatHelpText>
            </Stat>
            
            <Stat
              p={6}
              shadow="md"
              borderWidth="1px"
              borderRadius="lg"
              bg={bgColor}
              borderColor={borderColor}
            >
              <StatLabel fontSize="lg">저축 목표</StatLabel>
              <StatNumber fontSize="3xl">68%</StatNumber>
              <StatHelpText>목표: 5,000,000원</StatHelpText>
            </Stat>
          </SimpleGrid>
          
          <Box mb={8}>
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
              <Heading size="md">내 계좌</Heading>
              <Button 
                leftIcon={<AddIcon />} 
                colorScheme="blue" 
                variant="outline"
                onClick={() => router.push('/account/link')}
                size="sm"
              >
                계좌 추가하기
              </Button>
            </Flex>
            
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {accounts.map((account) => (
                <Card key={account.fintechUseNum} shadow="md" cursor="pointer" onClick={() => router.push(`/account/${account.fintechUseNum}`)}>
                  <CardHeader pb={0}>
                    <Flex justify="space-between" align="center">
                      <Box>
                        <Text fontWeight="bold" fontSize="lg">{account.bankName}</Text>
                        <Text fontSize="sm" color="gray.500">{account.accountNumber}</Text>
                      </Box>
                      <ArrowForwardIcon />
                    </Flex>
                  </CardHeader>
                  <CardBody>
                    <Text fontWeight="bold" fontSize="xl">
                      {accountBalances[account.fintechUseNum] 
                        ? formatCurrency(accountBalances[account.fintechUseNum].availableBalance) 
                        : "잔액 조회 중..."}
                    </Text>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </Box>
          
          <Divider my={8} />
          
          <Box mb={8}>
            <Heading size="md" mb={4}>맞춤 금융 상품</Heading>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <Card shadow="md">
                <CardHeader pb={0}>
                  <Text fontWeight="bold">최고 금리 정기예금</Text>
                </CardHeader>
                <CardBody>
                  <Text fontWeight="bold" color="blue.500">연 3.8%</Text>
                  <Text fontSize="sm">12개월 기준</Text>
                  <Button size="sm" mt={4} colorScheme="blue" variant="outline">
                    자세히 보기
                  </Button>
                </CardBody>
              </Card>
              <Card shadow="md">
                <CardHeader pb={0}>
                  <Text fontWeight="bold">주택청약종합저축</Text>
                </CardHeader>
                <CardBody>
                  <Text fontWeight="bold" color="blue.500">연 2.5%</Text>
                  <Text fontSize="sm">비과세 혜택</Text>
                  <Button size="sm" mt={4} colorScheme="blue" variant="outline">
                    자세히 보기
                  </Button>
                </CardBody>
              </Card>
              <Card shadow="md">
                <CardHeader pb={0}>
                  <Text fontWeight="bold">프리미엄 적금</Text>
                </CardHeader>
                <CardBody>
                  <Text fontWeight="bold" color="blue.500">연 4.2%</Text>
                  <Text fontSize="sm">24개월 기준</Text>
                  <Button size="sm" mt={4} colorScheme="blue" variant="outline">
                    자세히 보기
                  </Button>
                </CardBody>
              </Card>
            </SimpleGrid>
          </Box>
          
          <Box>
            <Heading size="md" mb={4}>최근 거래내역</Heading>
            <Button 
              rightIcon={<ArrowForwardIcon />} 
              colorScheme="blue" 
              variant="outline"
              onClick={() => router.push('/transactions')}
              mb={4}
            >
              전체 거래내역 보기
            </Button>
          </Box>
        </>
      )}
      
      <Box 
        p={6} 
        shadow="md" 
        borderWidth="1px" 
        borderRadius="lg" 
        bg="primary" 
        color="white"
        textAlign="center"
        mb={8}
      >
        <Heading size="md" mb={3}>맞춤형 금융 상품 추천</Heading>
        <Text mb={4}>
          고객님의 소비 패턴과 재정 목표를 분석한 결과, 다음 상품이 적합할 것으로 보입니다.
        </Text>
        <Button size="md" colorScheme="whiteAlpha">자세히 보기</Button>
      </Box>
      
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg={bgColor} borderColor={borderColor}>
          <Heading size="md" mb={3}>최근 거래 내역</Heading>
          {accounts.length > 0 ? (
            <Text>거래 내역은 계좌 상세 페이지에서 확인하세요.</Text>
          ) : (
            <Text>연결된 계좌가 없습니다.</Text>
          )}
        </Box>
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg={bgColor} borderColor={borderColor}>
          <Heading size="md" mb={3}>예산 관리</Heading>
          <Text>아직 예산 설정이 없습니다.</Text>
        </Box>
      </SimpleGrid>
    </Container>
  );
} 