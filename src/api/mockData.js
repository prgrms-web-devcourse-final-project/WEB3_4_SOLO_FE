// 계좌 목록 모킹 데이터
export const mockAccounts = [
  {
    id: 1,
    accountNumber: '1234567890123456',
    accountType: 'CHECKING',
    balance: 1250000,
    currency: 'KRW',
    isActive: true,
    createdAt: '2023-01-01T00:00:00'
  },
  {
    id: 2,
    accountNumber: '2234567890123456',
    accountType: 'SAVINGS',
    balance: 5000000,
    currency: 'KRW',
    isActive: true,
    createdAt: '2023-02-01T00:00:00'
  },
  {
    id: 3,
    accountNumber: '3234567890123456',
    accountType: 'LOAN',
    balance: 10000000,
    currency: 'KRW',
    isActive: true,
    createdAt: '2023-03-01T00:00:00'
  }
];

// 거래 내역 모킹 데이터
export const mockTransactions = {
  content: [
    {
      id: 1,
      transactionType: 'DEPOSIT',
      amount: 500000,
      description: '급여',
      transactionDate: '2023-04-05T10:00:00',
      fromAccount: null,
      toAccount: { id: 1, accountNumber: '1234567890123456' }
    },
    {
      id: 2,
      transactionType: 'WITHDRAWAL',
      amount: 30000,
      description: 'ATM 출금',
      transactionDate: '2023-04-03T14:30:00',
      fromAccount: { id: 1, accountNumber: '1234567890123456' },
      toAccount: null
    },
    {
      id: 3,
      transactionType: 'TRANSFER',
      amount: 200000,
      description: '월세',
      transactionDate: '2023-04-01T09:15:00',
      fromAccount: { id: 1, accountNumber: '1234567890123456' },
      toAccount: { id: 0, accountNumber: '9876543210987654' }
    }
  ],
  pageable: {
    pageNumber: 0,
    pageSize: 5,
    sort: {
      sorted: true,
      unsorted: false,
      empty: false
    },
    offset: 0,
    paged: true,
    unpaged: false
  },
  totalPages: 1,
  totalElements: 3,
  last: true,
  size: 5,
  number: 0,
  sort: {
    sorted: true,
    unsorted: false,
    empty: false
  },
  first: true,
  numberOfElements: 3,
  empty: false
}; 