/**
 * 숫자를 통화 형식으로 포맷팅합니다.
 * @param amount 포맷팅할 금액
 * @param currency 통화 코드 (기본값: KRW)
 * @returns 포맷팅된 금액 문자열
 */
export const formatCurrency = (
  amount: number, 
  currency: string = 'KRW'
): string => {
  if (amount === undefined || amount === null) {
    return '-';
  }
  
  try {
    const formatter = new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    });
    
    return formatter.format(amount);
  } catch (error) {
    console.error('금액 포맷팅 중 오류 발생:', error);
    // 에러 발생 시 기본 포맷으로 반환
    return `${amount.toLocaleString()}${currency === 'KRW' ? '원' : ` ${currency}`}`;
  }
};

/**
 * 날짜를 포맷팅합니다.
 * @param dateString 포맷팅할 날짜 문자열 또는 Date 객체
 * @param format 포맷 스타일 ('short', 'medium', 'long')
 * @returns 포맷팅된 날짜 문자열
 */
export const formatDate = (
  dateString: string | Date, 
  format: 'short' | 'medium' | 'long' = 'medium'
): string => {
  if (!dateString) {
    return '-';
  }
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: format === 'short' ? 'numeric' : 'long',
      day: 'numeric',
      hour: format === 'long' ? 'numeric' : undefined,
      minute: format === 'long' ? 'numeric' : undefined
    };
    
    return new Intl.DateTimeFormat('ko-KR', options).format(date);
  } catch (error) {
    console.error('날짜 포맷팅 중 오류 발생:', error);
    // 에러 발생 시 원본 반환
    return String(dateString);
  }
};

/**
 * 시간을 한국어 형식으로 변환합니다.
 * @param dateString ISO 형식의 날짜 문자열
 * @returns 포맷팅된 시간 문자열 (예: 오후 3:45)
 */
export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * 카드 번호를 마스킹 처리합니다.
 * @param cardNumber 카드 번호
 * @returns 마스킹된 카드 번호 (예: 1234-56**-****-7890)
 */
export const maskCardNumber = (cardNumber: string): string => {
  if (!cardNumber || cardNumber.length < 12) return cardNumber;
  
  // 카드 번호 형식이 이미 하이픈으로 구분되어 있는지 확인
  const parts = cardNumber.includes('-') 
    ? cardNumber.split('-') 
    : [
        cardNumber.substring(0, 4),
        cardNumber.substring(4, 8),
        cardNumber.substring(8, 12),
        cardNumber.substring(12)
      ];
  
  // 중간 8자리 마스킹
  return `${parts[0]}-${parts[1].substring(0, 2)}**-****-${parts[3]}`;
};

/**
 * 계좌번호를 마스킹 처리합니다.
 * @param accountNumber 마스킹할 계좌번호
 * @returns 마스킹된 계좌번호 문자열
 */
export const maskAccountNumber = (accountNumber: string): string => {
  if (!accountNumber) {
    return '-';
  }
  
  try {
    // 계좌번호 길이에 따라 다르게 마스킹
    if (accountNumber.length <= 8) {
      // 짧은 계좌번호
      return accountNumber.replace(/(\d{2})(\d+)(\d{2})/, '$1****$3');
    } else {
      // 긴 계좌번호
      const parts = accountNumber.split('-');
      
      if (parts.length > 1) {
        // 하이픈이 포함된 계좌번호
        const lastPart = parts[parts.length - 1];
        const maskedLastPart = lastPart.length > 4 
          ? lastPart.substr(0, 2) + '*'.repeat(lastPart.length - 4) + lastPart.substr(-2) 
          : '*'.repeat(lastPart.length);
        
        parts[parts.length - 1] = maskedLastPart;
        return parts.join('-');
      } else {
        // 하이픈 없는 긴 계좌번호
        return accountNumber.substring(0, 3) + 
               '*'.repeat(accountNumber.length - 5) + 
               accountNumber.substring(accountNumber.length - 2);
      }
    }
  } catch (error) {
    console.error('계좌번호 마스킹 중 오류 발생:', error);
    // 에러 발생 시 기본 마스킹
    return `${accountNumber.substr(0, 3)}${'*'.repeat(4)}${accountNumber.substr(-2)}`;
  }
}; 