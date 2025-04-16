/**
 * 통화 금액을 포맷팅합니다.
 * @param {number} amount - 금액
 * @param {string} currency - 통화 코드 (KRW, USD 등)
 * @returns {string} 포맷팅된 통화 금액
 */
export const formatCurrency = (amount, currency = 'KRW') => {
  if (amount === null || amount === undefined) {
    return '-';
  }

  try {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'KRW' ? 0 : 2,
      maximumFractionDigits: currency === 'KRW' ? 0 : 2
    }).format(amount);
  } catch (e) {
    // 오류가 발생한 경우 기본 형식으로 반환
    return `${amount.toLocaleString()} ${currency}`;
  }
};

/**
 * 날짜를 지정된 형식으로 포맷팅합니다.
 * @param {string|Date} date - 포맷팅할 날짜
 * @param {string} format - 표시 형식 ('long', 'short', 'datetime')
 * @returns {string} 포맷팅된 날짜 문자열
 */
export const formatDate = (date, format = 'long') => {
  if (!date) return '-';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) return '-';
  
  try {
    switch (format) {
      case 'short':
        // YYYY-MM-DD 형식
        return dateObj.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).replace(/\. /g, '-').replace(/\.$/, '');
      
      case 'datetime':
        // YYYY-MM-DD HH:MM 형식
        return `${dateObj.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).replace(/\. /g, '-').replace(/\.$/, '')} ${dateObj.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })}`;
      
      case 'long':
      default:
        // YYYY년 MM월 DD일 형식
        return dateObj.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
    }
  } catch (e) {
    return dateObj.toISOString().split('T')[0];
  }
};

/**
 * 계좌번호를 포맷팅합니다.
 * @param {string} accountNumber - 원본 계좌번호
 * @returns {string} 포맷팅된 계좌번호
 */
export const formatAccountNumber = (accountNumber) => {
  if (!accountNumber) return '-';
  
  // 계좌번호 형식: XXXX-XXXX-XXXX-XXXX
  return accountNumber.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1-$2-$3-$4');
};

/**
 * 전화번호를 포맷팅합니다.
 * @param {string} phoneNumber - 원본 전화번호
 * @returns {string} 포맷팅된 전화번호
 */
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '-';
  
  // 핸드폰 번호 형식: 010-XXXX-XXXX
  if (phoneNumber.length === 11 && phoneNumber.startsWith('010')) {
    return phoneNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  }
  
  // 일반 전화번호 형식: 02-XXXX-XXXX 또는 031-XXX-XXXX
  if (phoneNumber.startsWith('02') && phoneNumber.length === 10) {
    return phoneNumber.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
  }
  
  if (phoneNumber.length === 11) {
    return phoneNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  }
  
  if (phoneNumber.length === 10) {
    return phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  }
  
  return phoneNumber;
};

/**
 * 거래 유형에 따른 레이블을 반환합니다.
 * @param {string} transactionType - 거래 유형 코드
 * @returns {string} 거래 유형 한글 레이블
 */
export const getTransactionTypeLabel = (transactionType) => {
  const types = {
    'DEPOSIT': '입금',
    'WITHDRAWAL': '출금',
    'TRANSFER': '이체',
    'PAYMENT': '결제',
    'FEE': '수수료',
    'INTEREST': '이자',
    'LOAN_PAYMENT': '대출 상환',
    'LOAN_DISBURSEMENT': '대출 지급'
  };
  
  return types[transactionType] || '기타';
};

/**
 * 이자율을 포맷팅합니다.
 * @param {number} rate - 포맷팅할 이자율
 * @returns {string} 포맷팅된 이자율 문자열
 */
export const formatInterestRate = (rate) => {
  if (rate === undefined || rate === null) return '-';
  
  return `${rate.toFixed(2)}%`;
};

/**
 * 숫자를 한글 금액으로 변환합니다.
 * @param {number} amount - 변환할 금액
 * @returns {string} 한글로 변환된 금액
 */
export const numberToKorean = (amount) => {
  if (!amount) return '영 원';
  
  const units = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const tenUnits = ['', '십', '백', '천'];
  const tenThousandUnits = ['', '만', '억', '조', '경'];
  
  // 문자열로 변환하고 콤마가 있다면 제거
  const amountStr = String(amount).replace(/,/g, '');
  let result = '';
  
  // 숫자가 0인 경우
  if (parseInt(amountStr) === 0) {
    return '영 원';
  }
  
  // 숫자를 역순으로 4자리씩 그룹화
  const groups = [];
  for (let i = amountStr.length; i > 0; i -= 4) {
    groups.push(amountStr.substring(Math.max(0, i - 4), i));
  }
  groups.reverse();
  
  // 각 그룹을 처리
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    let groupResult = '';
    let hasValue = false;
    
    // 그룹 내 각 자릿수 처리
    for (let j = 0; j < group.length; j++) {
      const digit = parseInt(group[j]);
      if (digit !== 0) { // 0이 아닌 경우만 처리
        hasValue = true;
        // 1인 경우 '일' 생략 (십, 백, 천 단위에서만)
        if (digit === 1 && j < group.length - 1) {
          groupResult += tenUnits[group.length - 1 - j];
        } else {
          groupResult += units[digit] + tenUnits[group.length - 1 - j];
        }
      }
    }
    
    // 비어있지 않은 그룹에만 단위(만, 억 등) 추가
    if (hasValue) {
      const unitIndex = groups.length - 1 - i;
      if (unitIndex > 0) {
        groupResult += tenThousandUnits[unitIndex];
      }
      result += groupResult;
    }
  }
  
  return result + ' 원';
}; 