import React, { useState } from 'react';
import { User } from 'lucide-react';
import { sanitizeImageUrl } from '../../utils/validation';

interface ReferenceImageProps {
  src?: string;
  alt: string;
  name?: string;
  className?: string;
}

export const ReferenceImage: React.FC<ReferenceImageProps> = ({
  src,
  alt,
  name,
  className = 'w-full h-full object-cover',
}) => {
  const [hasError, setHasError] = useState(false);
  const safeUrl = src ? sanitizeImageUrl(src) : '';

  if (!safeUrl || hasError) {
    return (
      <div className="w-full h-full bg-[#171B26] flex flex-col items-center justify-center p-3 text-center">
        <User className="h-7 w-7 text-[#5A6375] mb-1.5" />
        {name && (
          <span className="text-xs font-medium text-[#7B8494] line-clamp-1">{name}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={safeUrl}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
