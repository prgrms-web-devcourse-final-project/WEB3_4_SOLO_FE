import Link from 'next/link';
import { formatCurrency } from '../../utils/formatters';

const AccountCard = ({ account }) => {
  const {
    id,
    accountNumber,
    accountType,
    balance,
    currency,
    isActive,
    status
  } = account;

  // 계좌 활성화 상태 확인 (isActive 또는 status 속성 사용)
  const isAccountActive = isActive === true || status === 'ACTIVE';

  // 계좌 타입에 따른 아이콘과 색상 설정
  const getAccountTypeStyles = () => {
    switch (accountType) {
      case 'CHECKING':
        return {
          icon: CheckingIcon,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-700',
          label: '입출금 계좌'
        };
      case 'SAVINGS':
        return {
          icon: SavingsIcon,
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
          label: '저축 계좌'
        };
      case 'LOAN':
        return {
          icon: LoanIcon,
          bgColor: 'bg-red-100',
          textColor: 'text-red-700',
          label: '대출 계좌'
        };
      default:
        return {
          icon: DefaultIcon,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          label: '기타 계좌'
        };
    }
  };

  const { icon: TypeIcon, bgColor, textColor, label } = getAccountTypeStyles();

  // 계좌번호 포맷팅
  const formatAccountNumber = (accNumber) => {
    if (!accNumber) return '';
    
    // 계좌번호 타입에 따라 포맷팅 (3-3-6 또는 4-4-4-4 형식)
    if (accNumber.length === 12) {
      return accNumber.replace(/(\d{3})(\d{3})(\d{6})/, '$1-$2-$3');
    } else if (accNumber.length === 16) {
      return accNumber.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1-$2-$3-$4');
    }
    
    return accNumber;
  };

  return (
    <div className={`block rounded-lg p-5 shadow-md border border-gray-200 transition-all hover:shadow-lg hover:border-blue-300 ${!isAccountActive ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className={`${bgColor} p-2 rounded-full mr-3`}>
            <TypeIcon className={`h-4 w-4 ${textColor}`} />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{label}</h3>
            <p className="text-sm text-gray-500">
              {formatAccountNumber(accountNumber)}
            </p>
          </div>
        </div>
        {!isAccountActive && <span className="inline-block px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-full">비활성화</span>}
      </div>
      
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">잔액</span>
          <span className="text-xl font-semibold">{formatCurrency(balance, currency)}</span>
        </div>
      </div>
      
      <div className="flex mt-4 pt-4 border-t border-gray-100 space-x-2">
        <Link href={`/accounts/${id}`} className="flex-1">
          <button className="w-full py-2 px-3 text-sm text-blue-700 border border-blue-300 bg-white hover:bg-blue-50 rounded-md transition-colors">
            계좌정보
          </button>
        </Link>
        <Link href={`/transfer?fromAccount=${id}`} className="flex-1">
          <button className="w-full py-2 px-3 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
            계좌이체
          </button>
        </Link>
      </div>
    </div>
  );
};

// 계좌 타입 아이콘 컴포넌트
function CheckingIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props} className="h-4 w-4">
      <path d="M4.5 3.75a3 3 0 00-3 3v.75h21v-.75a3 3 0 00-3-3h-15z" />
      <path fillRule="evenodd" d="M22.5 9.75h-21v7.5a3 3 0 003 3h15a3 3 0 003-3v-7.5zm-18 3.75a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clipRule="evenodd" />
    </svg>
  );
}

function SavingsIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props} className="h-4 w-4">
      <path d="M10.464 8.746c.227-.18.497-.311.786-.394v2.795a2.252 2.252 0 01-.786-.393c-.394-.313-.546-.681-.546-1.004 0-.323.152-.691.546-1.004zM12.75 15.662v-2.824c.347.085.664.228.921.421.427.32.579.686.579.991 0 .305-.152.671-.579.991a2.534 2.534 0 01-.921.42z" />
      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v.816a3.836 3.836 0 00-1.72.756c-.712.566-1.112 1.35-1.112 2.178 0 .829.4 1.612 1.113 2.178.502.4 1.102.647 1.719.756v2.978a2.536 2.536 0 01-.921-.421l-.879-.66a.75.75 0 00-.9 1.2l.879.66c.533.4 1.169.645 1.821.75V18a.75.75 0 001.5 0v-.81a3.833 3.833 0 001.719-.756c.712-.566 1.112-1.35 1.112-2.178 0-.829-.4-1.612-1.113-2.178a3.833 3.833 0 00-1.718-.756V8.334c.29.082.559.213.786.393l.415.33a.75.75 0 00.933-1.175l-.415-.33a3.836 3.836 0 00-1.719-.755V6z" clipRule="evenodd" />
    </svg>
  );
}

function LoanIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props} className="h-4 w-4">
      <path d="M10.464 8.746c.227-.18.497-.311.786-.394v2.795a2.252 2.252 0 01-.786-.393c-.394-.313-.546-.681-.546-1.004 0-.323.152-.691.546-1.004zM12.75 15.662v-2.824c.347.085.664.228.921.421.427.32.579.686.579.991 0 .305-.152.671-.579.991a2.534 2.534 0 01-.921.42z" />
      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v.816a3.836 3.836 0 00-1.72.756c-.712.566-1.112 1.35-1.112 2.178 0 .829.4 1.612 1.113 2.178.502.4 1.102.647 1.719.756v2.978a2.536 2.536 0 01-.921-.421l-.879-.66a.75.75 0 00-.9 1.2l.879.66c.533.4 1.169.645 1.821.75V18a.75.75 0 001.5 0v-.81a3.833 3.833 0 001.719-.756c.712-.566 1.112-1.35 1.112-2.178 0-.829-.4-1.612-1.113-2.178a3.833 3.833 0 00-1.718-.756V8.334c.29.082.559.213.786.393l.415.33a.75.75 0 00.933-1.175l-.415-.33a3.836 3.836 0 00-1.719-.755V6z" clipRule="evenodd" />
    </svg>
  );
}

function DefaultIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props} className="h-4 w-4">
      <path fillRule="evenodd" d="M2.25 4.125c0-1.036.84-1.875 1.875-1.875h5.25c1.036 0 1.875.84 1.875 1.875V17.25a4.5 4.5 0 11-9 0V4.125zm4.5 14.25a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25z" clipRule="evenodd" />
      <path d="M10.719 21.75h9.156c1.036 0 1.875-.84 1.875-1.875v-5.25c0-1.036-.84-1.875-1.875-1.875h-.14l-8.742 8.743c-.09.089-.18.175-.274.257zM12.738 17.625l6.474-6.474a1.875 1.875 0 000-2.651L15.5 4.787a1.875 1.875 0 00-2.651 0l-.1.099V17.25c0 .126-.003.251-.01.375z" />
    </svg>
  );
}

export default AccountCard; 