import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { formatCurrency as oldFormatCurrency } from '../../utils/format';
import productService from '../../api/productService';

// 숫자를 한글 금액으로 변환하는 함수
const convertToKoreanCurrency = (num) => {
  if (!num || isNaN(num)) return '';
  
  const units = ['', '만', '억', '조'];
  const digits = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const tenUnits = ['', '십', '백', '천'];
  
  // 숫자를 문자열로 변환하고 컴마 제거
  const numStr = num.toString().replace(/,/g, '');
  
  // 0인 경우 처리
  if (numStr === '0') return '영원';
  
  // 4자리씩 나누기
  const parts = [];
  for (let i = 0; i < numStr.length; i += 4) {
    const part = numStr.slice(Math.max(0, numStr.length - i - 4), numStr.length - i);
    parts.unshift(part);
  }
  
  let result = '';
  
  // 각 부분을 한글로 변환
  parts.forEach((part, partIndex) => {
    if (part === '0000') return; // 만, 억, 조 단위가 0인 경우 건너뜀
    
    let partResult = '';
    let hasValue = false;
    
    // 각 자릿수 처리
    for (let i = 0; i < part.length; i++) {
      const digit = parseInt(part[i]);
      
      if (digit !== 0) {
        hasValue = true;
        if (digit === 1 && i > 0) {
          partResult += tenUnits[part.length - 1 - i];
        } else {
          partResult += digits[digit] + tenUnits[part.length - 1 - i];
        }
      }
    }
    
    if (hasValue) {
      result += partResult + units[parts.length - 1 - partIndex];
    }
  });
  
  return result + '원';
};

// 숫자에 천 단위 구분 쉼표 추가하는 함수
const formatNumberWithCommas = (num) => {
  if (!num) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Material UI 아이콘 임포트
import SaveIcon from '@mui/icons-material/Save';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PaymentsIcon from '@mui/icons-material/Payments';

const ProductsPage = () => {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [subscriptionForm, setSubscriptionForm] = useState({
    accountId: '',
    amount: '',
    term: ''
  });
  const [accounts, setAccounts] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscriptionSuccess, setSubscriptionSuccess] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortOption, setSortOption] = useState('latest');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [hasAccount, setHasAccount] = useState(true);
  
  // 대출 상품 관련 상태 추가
  const [loanStep, setLoanStep] = useState(1); // 1: 동의, 2: 신용조회중, 3: 한도확인, 4: 신청
  const [isCheckingCredit, setIsCheckingCredit] = useState(false);
  const [creditChecked, setCreditChecked] = useState(false);
  const [availableLoanAmount, setAvailableLoanAmount] = useState(0);
  const [loanAgreements, setLoanAgreements] = useState({
    creditCheck: false,
    personalInfo: false,
    terms: false
  });
  
  // 상품 목록 불러오기
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 백엔드 API에서 상품 목록 가져오기
        let fetchedProducts = [];
        
        try {
          // productService를 통해 상품 목록 조회
          const data = await productService.getAllProducts();
          console.log('API 원본 응답:', data);
          
          if (Array.isArray(data)) {
            fetchedProducts = data;
          } else if (data.content && Array.isArray(data.content)) {
            fetchedProducts = data.content;
          }
        } catch (apiError) {
          console.error('상품 API 호출 실패, 기본 API 사용:', apiError);
          // 백업 API 호출
          try {
            const response = await fetch('http://localhost:8080/api/products');
            if (!response.ok) {
              throw new Error('상품 정보를 불러오는데 실패했습니다.');
            }
            
            const data = await response.json();
            
            if (Array.isArray(data)) {
              fetchedProducts = data;
            } else if (data.content && Array.isArray(data.content)) {
              fetchedProducts = data.content;
            }
          } catch (backupError) {
            console.error('백업 API 호출 실패:', backupError);
            throw new Error('상품 정보를 불러올 수 없습니다.');
          }
        }
        
        console.log('파싱된 상품 데이터:', fetchedProducts);
        
        // 상품 데이터가 없는 경우 오류 처리
        if (!fetchedProducts || fetchedProducts.length === 0) {
          throw new Error('상품 정보를 불러올 수 없습니다.');
        }
        
        // 각 상품의 구조를 검증하고 정규화
        fetchedProducts = fetchedProducts.map(product => {
          return {
            id: product.id,
            name: product.name || '이름 없는 상품',
            category: product.category || 'UNKNOWN',
            interestRate: product.interestRate || 0,
            term: product.term || null,
            minAmount: product.minAmount || 0,
            maxAmount: product.maxAmount || null,
            description: product.description || '상품 설명이 없습니다.',
            features: product.features || [],
            status: product.status || 'ACTIVE',
            createdAt: product.createdAt || new Date().toISOString(),
            image: product.imageUrl || '/images/default-product.jpg'
          };
        }).filter(product => product.status === 'ACTIVE');
        
        console.log('정규화된 상품 데이터:', fetchedProducts);
        setProducts(fetchedProducts);
      } catch (error) {
        console.error('상품 목록 로딩 실패:', error);
        setError('상품 정보를 불러오는데 실패했습니다.');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

  // 계좌 목록 불러오기
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        // 실계좌 API로 변경
        const response = await fetch('http://localhost:8080/api/accounts/my', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('계좌 정보를 불러오는 중 오류가 발생했습니다.');
        }
        
        const data = await response.json();
        
        // 계좌 데이터 구조에 맞게 변환
        if (data.content && Array.isArray(data.content)) {
          setAccounts(data.content);
          console.log('계좌 목록 로드 성공:', data.content);
        } else {
          setAccounts([]);
          console.error('계좌 데이터 구조가 예상과 다릅니다.', data);
        }
      } catch (err) {
        console.error('계좌 목록을 불러오는 중 오류가 발생했습니다:', err);
        setAccounts([]);
      }
    };

    // 로그인한 상태인 경우에만 계좌 정보 로드
    if (accounts.length === 0) {
      fetchAccounts();
    }
  }, []);

  // 상품 가입하기 버튼 클릭 핸들러
  const handleSubscribe = (product) => {
    // 로그인 여부 확인
    const token = localStorage.getItem('token');
    if (!token) {
      alert('로그인이 필요한 서비스입니다.');
      router.push('/login');
      return;
    }

    // 자유입출금 계좌 개수 제한 확인 (CHECKING 상품인 경우)
    if (product.category === 'CHECKING') {
      // 이미 있는 자유입출금 계좌 개수 확인
      const checkingAccounts = accounts.filter(acc => acc.accountType === 'CHECKING' && acc.status === 'ACTIVE');
      
      console.log('현재 자유입출금 계좌 개수:', checkingAccounts.length, checkingAccounts);
      
      if (checkingAccounts.length >= 2) {
        alert('자유입출금 계좌는 최대 2개까지만 개설할 수 있습니다.');
        return;
      }
    }

    // 선택한 상품 설정
    setSelectedProduct(product);
    
    // 기본값 설정
    setSubscriptionForm({
      accountId: '',
      amount: product.minAmount ? String(product.minAmount) : '',
      term: product.term ? String(product.term) : '' 
    });
    
    // 오류 초기화
    setFormErrors({});
    
    // 모달 열기
    setIsSubscribeModalOpen(true);
  };

  // 입력 변경 핸들러
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSubscriptionForm({
      ...subscriptionForm,
      [name]: value
    });
    
    // 실시간 유효성 검사
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: '' // 입력 시 오류 메시지 제거
      });
    }
  };

  // 대출 신청 단계에서 제출 버튼 클릭 처리 개선
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setIsSubmitting(true);
    
    // 유효성 검사 오류
    const errors = {};
    
    // 자유입출금 계좌 개수 제한 확인
    if (selectedProduct.category === 'CHECKING') {
      // 이미 있는 자유입출금 계좌 개수 확인
      const checkingAccounts = accounts.filter(acc => acc.accountType === 'CHECKING' && acc.status === 'ACTIVE');
      
      console.log('제출 시 자유입출금 계좌 개수 확인:', checkingAccounts.length, checkingAccounts);
      
      if (checkingAccounts.length >= 2) {
        errors.submit = '자유입출금 계좌는 최대 2개까지만 개설할 수 있습니다.';
        setFormErrors(errors);
        setIsSubmitting(false);
        return;
      }
    }
    
    // 대출 상품 처리 (단계별로 처리)
    if (selectedProduct.category === 'LOAN') {
      if (loanStep === 1) {
        // 동의 단계 체크
        if (!loanAgreements.creditCheck || !loanAgreements.personalInfo || !loanAgreements.terms) {
          errors.submit = '모든 약관에 동의해 주세요.';
          setFormErrors(errors);
          setIsSubmitting(false);
          return;
        }
        
        // 신용 조회 단계로 진행
        setLoanStep(2);
        setIsCheckingCredit(true);
        
        // 신용 조회 시뮬레이션 (3초)
        setTimeout(() => {
          setIsCheckingCredit(false);
          setCreditChecked(true);
          
          // 대출 한도 설정 (30,000,000~50,000,000원 사이)
          const minLimit = 30000000;
          const maxLimit = 50000000;
          const randomFactor = Math.random(); // 0~1 사이 랜덤값
          const calculatedLimit = Math.floor(minLimit + (maxLimit - minLimit) * randomFactor);
          setAvailableLoanAmount(calculatedLimit);
          
          // 한도 확인 단계로 이동
          setLoanStep(3);
        }, 3000);
        
        return;
      } else if (loanStep === 3) {
        // 신청 단계로 이동
        setLoanStep(4);
        
        // 신청금액 초기값 설정 (가능한도의 80%)
        const recommendedAmount = Math.floor(availableLoanAmount * 0.8);
        setSubscriptionForm({
          ...subscriptionForm,
          amount: recommendedAmount.toString(),
          term: selectedProduct.term ? String(selectedProduct.term) : '60',
          depositAccountId: '',
          interestAccountId: ''
        });
        
        return;
      } else if (loanStep === 4) {
        // 대출 신청 제출 처리
        
        // 입금계좌와 이자 출금계좌 확인
        if (!subscriptionForm.depositAccountId) {
          errors.depositAccountId = '신청금액 입금계좌를 선택해주세요.';
        }
        
        // 이자 출금계좌가 선택되지 않았고, 입금계좌와 동일 옵션도 선택되지 않은 경우만 에러
        if (!subscriptionForm.interestAccountId) {
          errors.interestAccountId = '이자 출금계좌를 선택해주세요.';
        }
        
        // 대출 금액이 입력되지 않은 경우 한도의 80%로 설정
        if (!subscriptionForm.amount) {
          const defaultAmount = Math.floor(availableLoanAmount * 0.8);
          setSubscriptionForm({
            ...subscriptionForm,
            amount: defaultAmount.toString()
          });
        }
        
        // 대출 금액 검증 (문자열에서 숫자로 변환하고 콤마 제거)
        const loanAmount = parseFloat(subscriptionForm.amount.toString().replace(/,/g, '')) || Math.floor(availableLoanAmount * 0.8);
        
        console.log('대출 신청 금액 검증:', {
          입력금액: subscriptionForm.amount,
          파싱된금액: loanAmount,
          최소금액: selectedProduct.minAmount || 0,
          최대가능금액: availableLoanAmount,
          입금계좌: subscriptionForm.depositAccountId,
          이자출금계좌: subscriptionForm.interestAccountId
        });
        
        if (loanAmount < (selectedProduct.minAmount || 0)) {
          errors.amount = `최소 대출 금액은 ${oldFormatCurrency(selectedProduct.minAmount || 0)}입니다.`;
        } else if (loanAmount > availableLoanAmount) {
          errors.amount = `대출 가능 한도(${oldFormatCurrency(availableLoanAmount)})를 초과하였습니다.`;
        }
      }
    } else {
      // 자유입출금 상품이나 대출이 아닌 경우에만 금액 검사
      const needsAmount = selectedProduct.category !== 'CHECKING';
      
      if (needsAmount) {
        // 출금 계좌 선택 확인
        if (!subscriptionForm.accountId) {
          errors.accountId = '출금 계좌를 선택해주세요.';
        }
        
        // 금액 입력 확인
        if (!subscriptionForm.amount) {
          errors.amount = '금액을 입력해주세요.';
        } else if (
          (selectedProduct.minAmount && parseFloat(subscriptionForm.amount) < selectedProduct.minAmount) ||
          (selectedProduct.maxAmount && parseFloat(subscriptionForm.amount) > selectedProduct.maxAmount)
        ) {
          errors.amount = `${oldFormatCurrency(selectedProduct.minAmount || 0)} ~ ${oldFormatCurrency(selectedProduct.maxAmount || '제한없음')} 사이의 금액을 입력해주세요.`;
        }
        
        // 선택한 계좌의 잔액 확인
        if (subscriptionForm.accountId && subscriptionForm.amount) {
          const selectedAccount = accounts.find(acc => acc.id == subscriptionForm.accountId);
          if (selectedAccount && selectedAccount.balance < parseFloat(subscriptionForm.amount)) {
            errors.amount = `선택한 계좌의 잔액이 부족합니다. (현재 잔액: ${oldFormatCurrency(selectedAccount.balance)})`;
          }
        }
      }
    }
    
    // 오류가 있는 경우 제출 중지
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setIsSubmitting(false);
      return;
    }

    try {
      // 토큰에서 사용자 정보 가져오기
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('사용자 인증이 필요합니다. 로그인 후 다시 시도해주세요.');
      }
      
      let requestData;
      const endpoint = 'http://localhost:8080/api/products/subscriptions';
      
      // 상품 유형에 따라 요청 데이터 구성
      if (selectedProduct.category === 'LOAN') {
        // 대출 상품인 경우
        // 대출 신청 API 호출 전 최종 금액 검증
        const finalLoanAmount = parseFloat(subscriptionForm.amount.toString().replace(/,/g, ''));
        
        if (finalLoanAmount > availableLoanAmount) {
          setFormErrors({ amount: `대출 가능 한도 ${oldFormatCurrency(availableLoanAmount)}를 초과할 수 없습니다.` });
          setIsSubmitting(false);
          return;
        }
        
        // 대출 신청 요청 데이터 구성
        requestData = {
          productId: selectedProduct.id,
          amount: finalLoanAmount,
          term: parseInt(subscriptionForm.term) || 12,
          accountId: parseInt(subscriptionForm.depositAccountId),
          // 백엔드가 아직 interestAccountId를 지원하지 않으므로 임시로 주석 처리
          // 백엔드 API가 업데이트되면 다시 활성화하세요
          // interestAccountId: parseInt(subscriptionForm.interestAccountId)
        };
        
        // 로그에 입금계좌와 이자출금계좌가 같은지 여부 기록
        console.log('입금계좌와 이자출금계좌 같음 여부:', subscriptionForm.depositAccountId === subscriptionForm.interestAccountId);
      } else if (selectedProduct.category === 'CHECKING') {
        // 자유입출금 계좌인 경우 - 계좌 개설만 필요
        requestData = {
          productId: selectedProduct.id,
          amount: parseFloat(selectedProduct.minAmount) || 10000
        };
        
        console.log('자유입출금 계좌 개설 요청 데이터:', requestData);
      } else {
        // 예금, 적금 등 다른 상품
        if (!subscriptionForm.accountId) {
          setFormErrors({ accountId: '출금 계좌를 선택해주세요.' });
          setIsSubmitting(false);
          return;
        }
        
        if (!subscriptionForm.amount) {
          setFormErrors({ amount: '가입 금액을 입력해주세요.' });
          setIsSubmitting(false);
          return;
        }
        
        requestData = {
          productId: selectedProduct.id,
          amount: parseFloat(subscriptionForm.amount),
          accountId: parseInt(subscriptionForm.accountId)
        };
      }
      
      // 데이터 검증 로그 추가
      console.log('상품 가입 요청 데이터:', JSON.stringify(requestData, null, 2));
      console.log('입금계좌:', subscriptionForm.depositAccountId, '이자출금계좌:', subscriptionForm.interestAccountId);
      
      // API 호출
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });
      
      console.log('API 응답 상태:', response.status);
      
      const responseText = await response.text();
      console.log('API 응답 텍스트:', responseText);
      
      let responseData;
      try {
        // 응답이 JSON인 경우 파싱
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('응답 파싱 오류:', parseError);
        
        // HTML 응답인 경우 서버 오류로 처리
        if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
          throw new Error('서버 내부 오류가 발생했습니다. 관리자에게 문의하세요.');
        }
        
        // 빈 응답이나 JSON이 아닌 경우
        responseData = { message: '서버 응답을 처리할 수 없습니다.' };
      }
      
      if (!response.ok) {
        console.error('상품 가입 오류:', {
          상태: response.status,
          상태텍스트: response.statusText,
          URL: response.url,
          응답: responseData
        });
        
        // 서버 응답에서 오류 메시지 처리 개선
        let errorMessage = responseData.message || '상품 가입 중 오류가 발생했습니다.';
        
        // 자유입출금 계좌 생성 제한 오류 감지 및 처리
        if (selectedProduct.category === 'CHECKING') {
          if (responseText.includes('자유입출금 계좌는 최대 2개까지만 개설할 수 있습니다') || 
              responseText.includes('BadRequestException') || 
              response.status === 400) {
            console.error('자유입출금 계좌 생성 제한 오류:', responseText);
            errorMessage = '자유입출금 계좌는 최대 2개까지만 개설할 수 있습니다.';
          }
        }
        
        throw new Error(errorMessage);
      }
      
      // 성공적인 상품 가입 처리
      console.log('상품 가입 성공:', responseData);
      setSubscriptionSuccess(true);
      setIsSubmitting(false);
      
      // 3초 후 내 금융상품 페이지로 이동
      setTimeout(() => {
        router.push('/myproducts');
      }, 3000);
      
    } catch (error) {
      console.error('상품 가입 처리 오류:', error);
      setFormErrors({
        submit: error.customMessage || error.message || '상품 가입 중 오류가 발생했습니다. 다시 시도해주세요.'
      });
      setIsSubmitting(false);
    }
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    if (subscriptionSuccess) {
      // 성공 후 모달 닫을 때 상태 초기화
      setIsSubscribeModalOpen(false);
      setSelectedProduct(null);
      setSubscriptionForm({ accountId: '', amount: '', term: '' });
      setFormErrors({});
      setSubscriptionSuccess(false);
      setLoanStep(1);
      setCreditChecked(false);
      setAvailableLoanAmount(0);
      setLoanAgreements({ creditCheck: false, personalInfo: false, terms: false });
    } else {
      setIsSubscribeModalOpen(false);
      setLoanStep(1);
      setCreditChecked(false);
      setAvailableLoanAmount(0);
      setLoanAgreements({ creditCheck: false, personalInfo: false, terms: false });
    }
  };

  // 약관 동의 상태 변경 핸들러
  const handleAgreementChange = (e) => {
    const { name, checked } = e.target;
    setLoanAgreements({
      ...loanAgreements,
      [name]: checked
    });
  };

  // 전체 약관 동의 핸들러
  const handleAllAgreementChange = (e) => {
    const { checked } = e.target;
    setLoanAgreements({
      creditCheck: checked,
      personalInfo: checked,
      terms: checked
    });
  };

  // 대출 다음 단계 진행 핸들러 수정
  const handleNextLoanStep = async () => {
    if (loanStep === 3) {
      // 신청 단계로 이동
      setLoanStep(4);
      
      // 신청금액 초기값 설정 (가능한도의 80%)
      const recommendedAmount = Math.floor(availableLoanAmount * 0.8);
      setSubscriptionForm({
        ...subscriptionForm,
        amount: recommendedAmount.toString(),
        term: selectedProduct.term ? String(selectedProduct.term) : '60',
        depositAccountId: '',
        interestAccountId: ''
      });
    } else if (loanStep === 4) {
      // 대출 신청 처리 (폼 제출 트리거)
      handleSubmit(new Event('submit'));
    }
  };

  // 상품 유형에 따른 스타일
  const getProductStyle = (category) => {
    // 카테고리 대문자로 통일
    const categoryUpper = typeof category === 'string' ? category.toUpperCase() : '';
    
    switch (categoryUpper) {
      case 'DEPOSIT':
        return {
          bgColor: 'bg-blue-100',
          iconColor: 'text-blue-600',
          icon: <SaveIcon className="h-5 w-5 text-blue-500" />,
          label: '예금'
        };
      case 'SAVINGS':
        return {
          bgColor: 'bg-green-100',
          iconColor: 'text-green-600',
          icon: <PaymentsIcon className="h-5 w-5 text-green-500" />,
          label: '적금'
        };
      case 'CHECKING':
        return {
          bgColor: 'bg-teal-100',
          iconColor: 'text-teal-600',
          icon: <AccountBalanceWalletIcon className="h-5 w-5 text-teal-500" />,
          label: '자유입출금'
        };
      case 'LOAN':
        return {
          bgColor: 'bg-red-100',
          iconColor: 'text-red-600',
          icon: <CreditCardIcon className="h-5 w-5 text-red-500" />,
          label: '대출'
        };
      case 'FUND':
        return {
          bgColor: 'bg-purple-100',
          iconColor: 'text-purple-600',
          icon: <ShowChartIcon className="h-5 w-5 text-purple-500" />,
          label: '펀드'
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          iconColor: 'text-gray-600',
          icon: <AccountBalanceIcon className="h-5 w-5 text-gray-500" />,
          label: category || '기타'
        };
    }
  };

  // 필터링된 상품 목록
  const filteredProducts = useMemo(() => {
    if (activeFilter === 'ALL') {
      return products;
    }
    return products.filter(product => product.category === activeFilter);
  }, [products, activeFilter]);
  
  // 필터 변경 핸들러
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  // 계좌 유형에 맞는 포맷의 계좌번호 생성
  const generateFormattedAccountNumber = (accountType) => {
    const timestamp = Date.now().toString();
    let prefix = '';
    
    // 계좌 유형에 따른 접두사 설정
    switch (accountType) {
      case 'CHECKING':
        prefix = '110';
        break;
      case 'SAVINGS':
        prefix = '210';
        break;
      case 'DEPOSIT':
        prefix = '310';
        break;
      case 'FUND':
        prefix = '510';
        break;
      case 'LOAN':
        prefix = '410';
        break;
      default:
        prefix = '110';
    }
    
    // 타임스탬프의 마지막 6자리 사용
    const last6Digits = timestamp.slice(-6);
    // 중간 3자리는 랜덤 숫자
    const middle3Digits = Math.floor(Math.random() * 900 + 100);
    
    // 형식: XXX-YYY-ZZZZZZ (X: 계좌 타입, Y: 랜덤, Z: 타임스탬프)
    return `${prefix}-${middle3Digits}-${last6Digits}`;
  };

  // 카테고리 이름 가져오기
  const getCategoryName = (category) => {
    switch(category) {
      case 'DEPOSIT':
        return '예금';
      case 'SAVINGS':
        return '적금';
      case 'CHECKING':
        return '자유입출금';
      case 'LOAN':
        return '대출';
      case 'FUND':
        return '펀드';
      default:
        return '금융상품';
    }
  };

  return (
    <MainLayout>
      <div className="pb-8">
        <h1 className="text-2xl font-bold mb-6">금융상품</h1>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">금융상품 정보를 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-600">{error}</p>
            <button 
              className="mt-3 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 font-medium text-sm"
              onClick={() => window.location.reload()}
            >
              다시 시도
            </button>
          </div>
        ) : (
          <>
            {/* 필터 버튼 */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button 
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${activeFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} 
                onClick={() => handleFilterChange('ALL')}
              >
                전체 상품
              </button>
              <button 
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${activeFilter === 'DEPOSIT' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => handleFilterChange('DEPOSIT')}
              >
                예금 상품
              </button>
              <button 
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${activeFilter === 'SAVINGS' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => handleFilterChange('SAVINGS')}
              >
                적금 상품
              </button>
              <button 
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${activeFilter === 'CHECKING' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => handleFilterChange('CHECKING')}
              >
                자유입출금
              </button>
              <button 
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${activeFilter === 'LOAN' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => handleFilterChange('LOAN')}
              >
                대출 상품
              </button>
              <button 
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${activeFilter === 'FUND' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => handleFilterChange('FUND')}
              >
                투자 상품
              </button>
            </div>
            
            {/* 상품 목록 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredProducts.map(product => {
                const { bgColor, iconColor, icon, label } = getProductStyle(product.category);
                
                return (
                  <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:shadow-lg hover:scale-[1.02]">
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <div className={`${bgColor} p-1.5 rounded-full mr-2`}>
                          {icon}
                        </div>
                        <div>
                          <span className={`text-xs font-medium ${iconColor} px-2 py-1 ${bgColor} rounded-full`}>
                            {label}
                          </span>
                        </div>
                      </div>
                      
                      <h2 className="text-xl font-bold mb-2">{product.name}</h2>
                      <p className="text-gray-600 text-sm mb-4">{product.description}</p>
                      
                      <div className="flex flex-col space-y-2 mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-500 text-sm">금리</span>
                          <span className="font-medium">연 {product.interestRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 text-sm">기간</span>
                          <span className="font-medium">
                            {product.category === 'LOAN' ? `최대 ${product.term / 12}년` : 
                            product.term ? `${product.term}개월` : '무제한'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 text-sm">한도</span>
                          <span className="font-medium">
                            {product.minAmount ? oldFormatCurrency(product.minAmount) : '제한없음'} ~ {product.maxAmount ? oldFormatCurrency(product.maxAmount) : '제한없음'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <button 
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm"
                          onClick={() => handleSubscribe(product)}
                        >
                          {product.category === 'LOAN' ? '대출 신청하기' : '가입하기'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 px-6 py-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">특징</h3>
                      <ul className="text-sm text-gray-600">
                        {(Array.isArray(product.features) && product.features.length > 0) ? 
                          product.features.map((feature, index) => (
                            <li key={index} className="flex items-center mb-1">
                              <span className="text-green-500 mr-2">✓</span>
                              {feature}
                            </li>
                          )) : 
                          (
                            <li className="flex items-center mb-1">
                              <span className="text-green-500 mr-2">✓</span>
                              {typeof product.features === 'string' ? product.features : '정보 없음'}
                            </li>
                          )
                        }
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {filteredProducts.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-600 mb-4">현재 조회 가능한 금융상품이 없습니다</p>
                <p className="text-sm text-gray-500">잠시 후 다시 시도하시거나 관리자에게 문의해주세요</p>
                <button
                  className="mt-4 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 font-medium text-sm"
                  onClick={() => window.location.reload()}
                >
                  새로고침
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* 상품 가입 모달 */}
      <Modal
        isOpen={isSubscribeModalOpen}
        onClose={handleCloseModal}
        title={subscriptionSuccess ? "가입 완료" : selectedProduct ? `${selectedProduct.name} 가입하기` : "상품 가입"}
        size="md"
      >
        {subscriptionSuccess ? (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedProduct?.category === 'LOAN' ? '대출 신청이 완료되었습니다' : '상품 가입이 완료되었습니다'}
            </h3>
            <p className="text-gray-500 mb-4">
              {selectedProduct?.name} 상품에 성공적으로 {selectedProduct?.category === 'LOAN' ? '신청' : '가입'}되었습니다.<br />
              {selectedProduct?.category === 'LOAN' ? 
                '잠시 후 내 금융상품 페이지로 자동 이동합니다.' : 
                '내 금융상품 페이지에서 확인하실 수 있습니다.'}
            </p>
            <div className="flex justify-center space-x-3 mt-6">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 font-medium text-sm"
                onClick={handleCloseModal}
              >
                닫기
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm"
                onClick={() => {
                  handleCloseModal();
                  router.push('/myproducts');
                }}
              >
                내 금융상품 보기
              </button>
            </div>
          </div>
        ) : !hasAccount && selectedProduct && selectedProduct.category !== 'CHECKING' ? (
          // 계좌가 없는 경우 안내 메시지 표시
          <div className="text-center py-4">
            <div className="mb-4 text-amber-600">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">계좌가 필요합니다</h3>
            <p className="text-gray-600 mb-4">
              {getCategoryName(selectedProduct.category)} 상품에 가입하기 위해서는 출금 계좌가 필요합니다.
              <br />먼저 자유입출금 계좌를 개설해주세요.
            </p>
            <div className="flex justify-center space-x-3 mt-6">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 font-medium text-sm"
                onClick={handleCloseModal}
              >
                취소
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm"
                onClick={() => {
                  handleCloseModal();
                  router.push('/accounts/create');
                }}
              >
                계좌 개설하러 가기
              </button>
            </div>
          </div>
        ) : selectedProduct && selectedProduct.category === 'LOAN' ? (
          <form onSubmit={handleSubmit}>
            {/* 대출 상품 정보 요약 */}
            <div className="bg-gray-50 p-4 rounded-md mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">상품명</span>
                <span className="font-medium">{selectedProduct.name}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">금리</span>
                <span className="font-medium">연 {selectedProduct.interestRate}%</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">기간</span>
                <span className="font-medium">
                  최대 {selectedProduct.term / 12}년
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">한도</span>
                <span className="font-medium">
                  {selectedProduct.minAmount ? oldFormatCurrency(selectedProduct.minAmount) : '제한없음'} ~ {selectedProduct.maxAmount ? oldFormatCurrency(selectedProduct.maxAmount) : '제한없음'}
                </span>
              </div>
            </div>

            {/* 대출 단계 프로그레스 바 */}
            <div className="mb-6">
              <div className="flex justify-between w-full mb-2">
                <div className={`w-1/4 text-center text-sm ${loanStep >= 1 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>약관동의</div>
                <div className={`w-1/4 text-center text-sm ${loanStep >= 2 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>신용조회</div>
                <div className={`w-1/4 text-center text-sm ${loanStep >= 3 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>한도확인</div>
                <div className={`w-1/4 text-center text-sm ${loanStep >= 4 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>신청</div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${loanStep * 25}%` }}></div>
              </div>
            </div>

            {/* 단계 1: 약관 동의 */}
            {loanStep === 1 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">대출 신청을 위한 필수 동의</h3>
                
                <div className="bg-gray-50 p-3 rounded-md mb-4">
                  <label className="flex items-start mb-2">
                    <input 
                      type="checkbox"
                      checked={loanAgreements.creditCheck && loanAgreements.personalInfo && loanAgreements.terms}
                      onChange={handleAllAgreementChange}
                      className="mt-1 h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 font-medium">전체 동의</span>
                  </label>
                  <div className="border-t border-gray-200 my-2"></div>
                  
                  <label className="flex items-start mb-3">
                    <input 
                      type="checkbox"
                      name="creditCheck"
                      checked={loanAgreements.creditCheck}
                      onChange={handleAgreementChange}
                      className="mt-1 h-4 w-4 text-blue-600"
                    />
                    <div className="ml-2">
                      <span className="text-sm font-medium block mb-1">개인신용정보 조회 동의 (필수)</span>
                      <p className="text-xs text-gray-500">대출 적합성 확인을 위해 신용평가기관에 신용정보 조회를 실시합니다.</p>
                    </div>
                  </label>
                  
                  <label className="flex items-start mb-3">
                    <input 
                      type="checkbox"
                      name="personalInfo"
                      checked={loanAgreements.personalInfo}
                      onChange={handleAgreementChange}
                      className="mt-1 h-4 w-4 text-blue-600"
                    />
                    <div className="ml-2">
                      <span className="text-sm font-medium block mb-1">개인정보 수집 및 이용 동의 (필수)</span>
                      <p className="text-xs text-gray-500">대출 심사 및 계약 체결을 위해 필요한 정보를 수집합니다.</p>
                    </div>
                  </label>
                  
                  <label className="flex items-start">
                    <input 
                      type="checkbox"
                      name="terms"
                      checked={loanAgreements.terms}
                      onChange={handleAgreementChange}
                      className="mt-1 h-4 w-4 text-blue-600"
                    />
                    <div className="ml-2">
                      <span className="text-sm font-medium block mb-1">대출 이용약관 동의 (필수)</span>
                      <p className="text-xs text-gray-500">대출 상품의 이용조건 및 상환 조건에 대한 약관입니다.</p>
                    </div>
                  </label>
                </div>
                
                {formErrors.submit && (
                  <div className="bg-red-50 p-3 rounded-md text-red-600 text-sm mb-4">
                    {formErrors.submit}
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    onClick={() => {
                      if (!loanAgreements.creditCheck || !loanAgreements.personalInfo || !loanAgreements.terms) {
                        setFormErrors({
                          ...formErrors,
                          submit: "모든 필수 약관에 동의해야 다음 단계로 진행할 수 있습니다."
                        });
                        return;
                      }
                      setLoanStep(2);
                      // 자동으로 신용정보 조회 시뮬레이션 시작
                      setTimeout(() => {
                        const randomAmount = Math.floor(Math.random() * (selectedProduct.maxAmount - selectedProduct.minAmount) + selectedProduct.minAmount);
                        setAvailableLoanAmount(randomAmount);
                        setLoanStep(3);
                      }, 2000);
                    }}
                    disabled={isSubmitting}
                  >
                    다음 단계
                  </Button>
                </div>
              </div>
            )}

            {/* 단계 2: 신용 조회 중 */}
            {loanStep === 2 && (
              <div className="py-8 text-center">
                <div className="mb-4">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
                <h3 className="text-lg font-medium mb-2">신용 정보를 조회 중입니다</h3>
                <p className="text-gray-500 mb-4">최대 1분 정도 소요될 수 있습니다. 잠시만 기다려주세요.</p>
                <div className="bg-yellow-50 p-3 rounded-md text-yellow-700 text-sm">
                  실제 신용 정보 조회는 발생하지 않으며, 대출 한도는 시뮬레이션으로 제공됩니다.
                </div>
              </div>
            )}

            {/* 단계 3: 대출 한도 확인 */}
            {loanStep === 3 && (
              <div className="mt-5">
                <div className="bg-green-50 p-4 mb-4 rounded-md text-center">
                  <p className="text-lg font-semibold text-green-700">신용 심사 완료</p>
                  <p className="text-green-700">고객님의 대출 가능한도는</p>
                  <p className="text-2xl font-bold text-green-800 my-2">
                    {oldFormatCurrency(availableLoanAmount)}
                  </p>
                  <p className="text-green-700 mt-1">입니다.</p>
                </div>
                
                <div className="flex justify-center">
                  <Button
                    variant="primary"
                    onClick={handleNextLoanStep}
                    disabled={isSubmitting}
                  >
                    신청하기
                  </Button>
                </div>
              </div>
            )}

            {/* 단계 4: 대출 신청 */}
            {loanStep === 4 && (
              <div className="mt-5">
                <div className="bg-blue-50 p-4 mb-4 rounded-md">
                  <p className="text-blue-800 mb-2 font-semibold">
                    대출 가능한도: {oldFormatCurrency(availableLoanAmount)}
                  </p>
                  
                  {/* 대출 신청금액 입력 */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium mb-2">대출 가능 한도</h3>
                      <p className="text-lg font-bold text-blue-600">
                        {formatNumberWithCommas(availableLoanAmount)}원
                      </p>
                    </div>
                    
                    {/* 대출 금액 입력 필드 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        대출 신청금액
                      </label>
                      <input
                        type="text"
                        name="amount"
                        value={formatNumberWithCommas(subscriptionForm.amount) || ''}
                        onChange={(e) => {
                          // 숫자와 쉼표만 허용
                          const value = e.target.value.replace(/[^0-9,]/g, '');
                          // 쉼표 제거 후 숫자로 변환
                          const numericValue = value.replace(/,/g, '');
                          
                          setSubscriptionForm({
                            ...subscriptionForm,
                            amount: numericValue
                          });
                          
                          // 입력 시 오류 메시지 제거
                          if (formErrors.amount) {
                            setFormErrors({
                              ...formErrors,
                              amount: ''
                            });
                          }
                        }}
                        className={`w-full px-3 py-2 border ${formErrors.amount ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                        placeholder="대출 금액을 입력하세요"
                      />
                      {subscriptionForm.amount && (
                        <p className="mt-1 text-sm text-gray-600">
                          {convertToKoreanCurrency(subscriptionForm.amount)}
                        </p>
                      )}
                      {formErrors.amount && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.amount}</p>
                      )}
                    </div>
                    
                    {/* 입금 계좌 선택 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        신청금액 입금계좌 선택
                      </label>
                      <select
                        name="depositAccountId"
                        value={subscriptionForm.depositAccountId}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border ${formErrors.depositAccountId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      >
                        <option value="">입금 받을 계좌를 선택하세요</option>
                        {accounts.map(account => (
                          <option key={account.id} value={account.id}>
                            {account.accountName} ({account.accountNumber})
                          </option>
                        ))}
                      </select>
                      {formErrors.depositAccountId && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.depositAccountId}</p>
                      )}
                    </div>

                    {/* 이자 출금 계좌 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        이자 출금계좌 선택
                      </label>
                      <select
                        name="interestAccountId"
                        value={subscriptionForm.interestAccountId}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border ${formErrors.interestAccountId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      >
                        <option value="">이자 출금 계좌를 선택하세요</option>
                        {accounts.map(account => (
                          <option key={account.id} value={account.id}>
                            {account.accountName} ({account.accountNumber})
                          </option>
                        ))}
                      </select>
                      {formErrors.interestAccountId && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.interestAccountId}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-blue-700 mt-2">
                    대출금은 입금계좌로 입금되며, 이자는 이자 출금계좌에서 자동 출금됩니다.
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setLoanStep(3)}
                    disabled={isSubmitting}
                  >
                    이전
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !subscriptionForm.amount || !subscriptionForm.depositAccountId || !subscriptionForm.interestAccountId}
                  >
                    대출 신청
                  </Button>
                </div>
              </div>
            )}
          </form>
        ) : selectedProduct && (
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">상품명</span>
                  <span className="font-medium">{selectedProduct.name}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">금리</span>
                  <span className="font-medium">연 {selectedProduct.interestRate}%</span>
                </div>
                {selectedProduct.term && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">기간</span>
                    <span className="font-medium">
                      {selectedProduct.category === 'LOAN' ? `최대 ${selectedProduct.term / 12}년` : 
                      selectedProduct.term ? `${selectedProduct.term}개월` : '무제한'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">가입 한도</span>
                  <span className="font-medium">
                    {selectedProduct.minAmount ? oldFormatCurrency(selectedProduct.minAmount) : '제한없음'} ~ {selectedProduct.maxAmount ? oldFormatCurrency(selectedProduct.maxAmount) : '제한없음'}
                  </span>
                </div>
              </div>
              
              {/* 자유입출금 상품이 아닌 경우에만 계좌 선택 및 금액 입력 필드 표시 */}
              {selectedProduct.category !== 'CHECKING' && (
                <>
                  {/* 출금 계좌 선택 필드 */}
                  <div className="mb-4">
                    <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 mb-1">
                      출금 계좌 선택
                    </label>
                    <select
                      id="accountId"
                      name="accountId"
                      value={subscriptionForm.accountId}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border ${formErrors.accountId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      required
                    >
                      <option value="">출금 계좌를 선택하세요</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.accountName} ({account.accountNumber}) - {oldFormatCurrency(account.balance)}
                        </option>
                      ))}
                    </select>
                    {formErrors.accountId && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.accountId}</p>
                    )}
                  </div>

                  {/* 금액 입력 필드 */}
                  <div className="mb-4">
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                      가입 금액
                    </label>
                    <input
                      id="amount"
                      name="amount"
                      type="number"
                      value={subscriptionForm.amount}
                      onChange={handleInputChange}
                      placeholder="가입할 금액을 입력하세요"
                      className={`w-full px-3 py-2 border ${formErrors.amount ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      min={selectedProduct.minAmount || 0}
                      max={selectedProduct.maxAmount || undefined}
                      required
                    />
                    {formErrors.amount && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.amount}</p>
                    )}
                  </div>
                </>
              )}
              
              {/* 자유입출금 계좌 생성 로직 수정 - 계좌 제한 없이 생성 가능하도록 수정 */}
              {selectedProduct && selectedProduct.category === 'CHECKING' ? (
                <div className="bg-blue-50 p-4 rounded-md mb-4">
                  <p className="text-blue-700 text-sm mb-2">
                    자유입출금 계좌는 별도의 가입 금액 없이 계좌 개설이 가능합니다.
                  </p>
                  <p className="text-blue-700 text-sm mb-2">
                    계좌 개설 후 바로 입금 및 출금이 가능합니다.
                  </p>
                  <p className="text-orange-600 text-sm font-medium">
                    * 자유입출금 계좌는 최대 2개까지만 개설할 수 있습니다.
                  </p>
                </div>
              ) : null}
              
              {formErrors.submit && (
                <div className="bg-red-50 p-3 rounded-md text-red-600 text-sm mb-4">
                  {formErrors.submit}
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 font-medium text-sm"
                onClick={handleCloseModal}
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? '처리 중...' : '가입하기'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </MainLayout>
  );
};

export default ProductsPage;

