import React from 'react';

interface LogoProps {
  title?: string;
  subtitle?: string;
}

const Logo: React.FC<LogoProps> = ({
  title = 'PleasyBank',
  subtitle = '간편하게 행복을 가져다주는 금융'
}) => {
  return (
    <div className="text-center mb-8">
      <h1 className="text-6xl font-bold text-[#4466BA] italic" style={{ fontFamily: 'Georgia, serif' }}>
        {title}
      </h1>
      <p className="text-gray-600 mt-2">
        {subtitle}
      </p>
    </div>
  );
};

export default Logo; 