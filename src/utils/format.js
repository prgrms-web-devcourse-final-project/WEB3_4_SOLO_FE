/**
 * 숫자를 통화 형식으로 포맷팅하는 함수
 * @param {number} amount - 포맷팅할 금액
 * @param {string} currency - 통화 (기본값: 'KRW')
 * @returns {string} 포맷팅된 금액 문자열
 */
export const formatCurrency = (amount, currency = 'KRW') => {
  if (amount === null || amount === undefined) {
    return '0원';
  }
  
  const formatter = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  return formatter.format(amount);
};

/**
 * 숫자를 천 단위 구분자로 포맷팅하는 함수
 * @param {number} number - 포맷팅할 숫자
 * @returns {string} 포맷팅된 숫자 문자열
 */
export const formatNumber = (number) => {
  if (number === null || number === undefined) {
    return '0';
  }
  
  return new Intl.NumberFormat('ko-KR').format(number);
};

/**
 * 퍼센트 형식으로 포맷팅하는 함수
 * @param {number} value - 포맷팅할 퍼센트 값 (예: 0.05 -> 5%)
 * @param {number} digits - 소수점 자릿수 (기본값: 2)
 * @returns {string} 포맷팅된 퍼센트 문자열
 */
export const formatPercent = (value, digits = 2) => {
  if (value === null || value === undefined) {
    return '0%';
  }
  
  const formatter = new Intl.NumberFormat('ko-KR', {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
  
  return formatter.format(value);
}; 