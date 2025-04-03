import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// 계좌 정보 타입 정의
export interface Account {
  id: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
  balance?: number;
  currency: string;
  status: string;
  bankName: string;
  bankCode: string;
  fintechUseNum: string;
  isConsent: boolean;
}

export interface AccountListResponse {
  accounts: Account[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AccountBalance {
  fintechUseNum: string;
  bankName: string;
  availableBalance: number;
  currency: string;
  lastUpdated: string;
}

// 계좌 목록 조회
export const getAccounts = async (token: string): Promise<AccountListResponse> => {
  try {
    const response = await axios.get(`${API_URL}/api/accounts`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('계좌 목록 조회 중 오류 발생:', error);
    throw error;
  }
};

// 계좌 잔액 조회
export const getAccountBalance = async (
  fintechUseNum: string, 
  token: string
): Promise<AccountBalance> => {
  try {
    const response = await axios.get(`${API_URL}/api/accounts/${fintechUseNum}/balance`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(`계좌 잔액 조회 실패 (${fintechUseNum}):`, error);
    throw error;
  }
};

// 계좌 거래내역 조회
export const getAccountTransactions = async (
  token: string, 
  fintechUseNum: string, 
  fromDate: string, 
  toDate: string, 
  inquiryType: string = 'A'
) => {
  try {
    const response = await axios.get(`${API_URL}/api/accounts/${fintechUseNum}/transactions`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        fromDate,
        toDate,
        inquiryType
      }
    });
    return response.data;
  } catch (error) {
    console.error('계좌 거래내역 조회 중 오류 발생:', error);
    throw error;
  }
};

// 계좌 이체
export const transferMoney = async (
  token: string,
  data: {
    fintechUseNum: string;
    receiverBankCode: string;
    receiverAccountNumber: string;
    amount: number;
    content: string;
  }
) => {
  try {
    const response = await axios.post(`${API_URL}/api/transfer`, data, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('계좌 이체 실패:', error);
    throw error;
  }
};

// 거래내역 조회
export const getTransactions = async (
  fintechUseNum: string,
  token: string,
  params?: {
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }
) => {
  try {
    const response = await axios.get(`${API_URL}/api/accounts/${fintechUseNum}/transactions`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params
    });
    return response.data;
  } catch (error) {
    console.error(`거래내역 조회 실패 (${fintechUseNum}):`, error);
    throw error;
  }
}; 