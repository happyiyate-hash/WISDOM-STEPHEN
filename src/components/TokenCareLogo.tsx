import React from 'react';

interface TokenCareLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const TokenCareLogo: React.FC<TokenCareLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      {/* Exact Shield + Leaf Emblem */}
      <div className={`relative ${iconSizes[size]} shrink-0 group`}>
        {/* Glow backdrop */}
        <div className="absolute -inset-1 bg-emerald-500/30 rounded-xl blur-[6px] opacity-70 group-hover:opacity-100 transition-opacity" />
        
        {/* Badge Container */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-lg">
          <img
            src="/icons/android-chrome-192x192.png"
            alt="TokenCare Shield"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {showText && (
        <div>
          <div className="flex items-center space-x-1.5">
            <span className={`${textSizes[size]} font-extrabold text-white tracking-tight font-sans`}>
              Token<span className="text-emerald-400">Care</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

