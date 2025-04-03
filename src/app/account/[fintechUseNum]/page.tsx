'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Container,
    Heading,
    Text,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText, Flex,
    useColorModeValue,
    Spinner,
    Center,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Badge, HStack,
    Select,
    Stack,
    IconButton
} from '@chakra-ui/react';
import { ChevronLeftIcon } from '@chakra-ui/icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { getAccountBalance, getAccountTransactions, getAccounts } from '@/services/accountService';
import { formatCurrency, formatDate, formatTime } from '@/utils/formatters';

interface AccountDetailPageProps {
  params: {
    fintechUseNum: string;
  };
}

export default function AccountDetailPage({ params }: AccountDetailPageProps) {
  const { fintechUseNum } = params;
  const router = useRouter();
  const { isAuthenticated, user, token } = useSelector((state: RootState) => state.auth);
  
  const [account, setAccount] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 거래내역 조회 기간 필터
  const [period, setPeriod] = useState('1week');
  const [inquiryType, setInquiryType] = useState('A'); // A: 전체, I: 입금, O: 출금
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // 거래 타입에 따른 색상 설정
  const getTransactionColor = (type: string) => {
    if (type === 'DEPOSIT') return 'green.500';
    if (type === 'WITHDRAWAL') return 'red.500';
    return 'gray.500';
  };
  
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
          const currentAccount = accountsData.accounts.find(
            (acc) => acc.fintechUseNum === fintechUseNum
          );
          
          if (!currentAccount) {
            setError('계좌 정보를 찾을 수 없습니다.');
            setLoading(false);
            return;
          }
          
          setAccount(currentAccount);
          
          // 계좌 잔액 가져오기
          const balanceData = await getAccountBalance(token, fintechUseNum);
          setBalance(balanceData);
          
          // 기간에 따른 조회 날짜 설정
          const today = new Date();
          let fromDate;
          
          switch (period) {
            case '1week':
              fromDate = new Date(today);
              fromDate.setDate(today.getDate() - 7);
              break;
            case '1month':
              fromDate = new Date(today);
              fromDate.setMonth(today.getMonth() - 1);
              break;
            case '3months':
              fromDate = new Date(today);
              fromDate.setMonth(today.getMonth() - 3);
              break;
            default:
              fromDate = new Date(today);
              fromDate.setDate(today.getDate() - 7);
          }
          
          // 날짜 포맷 YYYYMMDD
          const toDateStr = today.getFullYear() +
            String(today.getMonth() + 1).padStart(2, '0') +
            String(today.getDate()).padStart(2, '0');
          
          const fromDateStr = fromDate.getFullYear() +
            String(fromDate.getMonth() + 1).padStart(2, '0') +
            String(fromDate.getDate()).padStart(2, '0');
          
          // 거래내역 가져오기
          const transactionsData = await getAccountTransactions(
            token, 
            fintechUseNum, 
            fromDateStr, 
            toDateStr, 
            inquiryType
          );
          
          setTransactions(transactionsData.transactions);
          setError('');
        } catch (err) {
          console.error('계좌 데이터 로드 중 오류 발생:', err);
          setError('계좌 정보를 불러오는 중 오류가 발생했습니다.');
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchAccountData();
  }, [isAuthenticated, token, fintechUseNum, period, inquiryType]);
  
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <Container maxW="container.xl" py={8}>
      <Flex alignItems="center" mb={6}>
        <IconButton
          aria-label="Back"
          icon={<ChevronLeftIcon />}
          onClick={() => router.push('/dashboard')}
          mr={4}
          size="lg"
        />
        <Heading size="lg">계좌 상세 정보</Heading>
      </Flex>
      
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
      ) : account ? (
        <>
          <Box 
            p={6} 
            shadow="md" 
            borderWidth="1px" 
            borderRadius="lg" 
            bg={bgColor} 
            borderColor={borderColor}
            mb={8}
          >
            <Flex direction={{ base: 'column', md: 'row' }} justifyContent="space-between">
              <Box mb={{ base: 6, md: 0 }}>
                <Text color="gray.500" fontSize="sm" mb={1}>{account.bankName}</Text>
                <Heading size="md" mb={2}>{account.accountName || account.accountType}</Heading>
                <Text fontSize="md">{account.accountNumber}</Text>
              </Box>
              
              <Stat textAlign={{ base: 'left', md: 'right' }}>
                <StatLabel>현재 잔액</StatLabel>
                <StatNumber color="blue.600" fontSize="3xl">
                  {balance ? formatCurrency(balance.availableBalance) : '잔액 조회 중...'}
                </StatNumber>
                <StatHelpText>
                  {balance ? `${formatDate(balance.timestamp)} 기준` : ''}
                </StatHelpText>
              </Stat>
            </Flex>
          </Box>
          
          <HStack spacing={4} mb={6} justify="space-between">
            <Heading size="md">거래 내역</Heading>
            <HStack spacing={2}>
              <Select 
                value={period} 
                onChange={(e) => setPeriod(e.target.value)}
                size="sm"
                w="120px"
              >
                <option value="1week">최근 1주</option>
                <option value="1month">최근 1개월</option>
                <option value="3months">최근 3개월</option>
              </Select>
              <Select 
                value={inquiryType} 
                onChange={(e) => setInquiryType(e.target.value)}
                size="sm"
                w="100px"
              >
                <option value="A">전체</option>
                <option value="I">입금</option>
                <option value="O">출금</option>
              </Select>
            </HStack>
          </HStack>
          
          {transactions.length === 0 ? (
            <Box p={10} textAlign="center" borderWidth="1px" borderRadius="lg">
              <Text>해당 기간에 거래 내역이 없습니다.</Text>
            </Box>
          ) : (
            <Box overflowX="auto">
              <Table variant="simple">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>거래일시</Th>
                    <Th>내용</Th>
                    <Th isNumeric>금액</Th>
                    <Th isNumeric>잔액</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {transactions.map((transaction, index) => (
                    <Tr key={index}>
                      <Td>
                        <Stack spacing={0}>
                          <Text fontWeight="medium">{formatDate(transaction.transactionDateTime)}</Text>
                          <Text fontSize="xs" color="gray.500">{formatTime(transaction.transactionDateTime)}</Text>
                        </Stack>
                      </Td>
                      <Td>
                        <Stack spacing={1}>
                          <Text fontWeight="medium">{transaction.description}</Text>
                          <Badge colorScheme={transaction.transactionType === 'DEPOSIT' ? 'green' : 'red'} size="sm">
                            {transaction.transactionType === 'DEPOSIT' ? '입금' : '출금'}
                          </Badge>
                        </Stack>
                      </Td>
                      <Td isNumeric>
                        <Text 
                          fontWeight="bold" 
                          color={getTransactionColor(transaction.transactionType)}
                        >
                          {transaction.transactionType === 'DEPOSIT' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </Text>
                      </Td>
                      <Td isNumeric>{formatCurrency(transaction.balanceAfter)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </>
      ) : (
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          <AlertTitle mr={2}>계좌를 찾을 수 없습니다</AlertTitle>
          <AlertDescription>해당 계좌가 존재하지 않거나 접근할 수 없습니다.</AlertDescription>
        </Alert>
      )}
    </Container>
  );
} 