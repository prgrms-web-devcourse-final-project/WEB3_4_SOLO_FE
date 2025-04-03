import React from 'react';

interface LoginButtonsProps {
  onKakaoLogin: () => void;
  onPinLogin: () => void;
  onBiometricLogin: () => void;
}

const LoginButtons: React.FC<LoginButtonsProps> = ({
  onKakaoLogin,
  onPinLogin,
  onBiometricLogin
}) => {
  return (
    <div className="flex flex-col space-y-4">
      <button 
        onClick={onKakaoLogin}
        className="w-full py-3 bg-[#FEE500] text-black rounded-md flex items-center justify-center"
      >
        <span className="mr-2">●</span>
        카카오톡으로 간편로그인
      </button>
      
      <button 
        onClick={onPinLogin}
        className="w-full py-3 bg-[#4466BA] text-white rounded-md"
      >
        PIN번호로 간편로그인
      </button>
      
      <button 
        onClick={onBiometricLogin}
        className="w-full py-3 bg-[#4CAF50] text-white rounded-md"
      >
        생체인증으로 간편로그인
      </button>
    </div>
  );
};

export default LoginButtons; 