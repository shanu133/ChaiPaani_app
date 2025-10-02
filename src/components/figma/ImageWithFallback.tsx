import React from 'react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  onError?: () => void;
}

export function ImageWithFallback({ src, alt, className, onError }: ImageWithFallbackProps) {
  const [hasError, setHasError] = React.useState(false);

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div
        className={`bg-muted flex items-center justify-center text-muted-foreground text-sm ${className || ''}`}
        role="img"
        aria-label={alt}
      >
        {alt}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
}
