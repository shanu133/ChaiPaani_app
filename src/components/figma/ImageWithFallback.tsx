import React from 'react';

type ImageWithFallbackProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'onError'> & {
  src: string;
  alt: string;
  onError?: React.ReactEventHandler<HTMLImageElement>;
};

export const ImageWithFallback = React.forwardRef<HTMLImageElement, ImageWithFallbackProps>(
  ({ src, alt, className, onError, ...rest }, ref) => {
    const [hasError, setHasError] = React.useState(false);

    React.useEffect(() => {
      // Reset error state when the source changes
      setHasError(false);
    }, [src]);

    const handleError: React.ReactEventHandler<HTMLImageElement> = (e) => {
      setHasError(true);
      onError?.(e);
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
        ref={ref}
        src={src}
        alt={alt}
        className={className}
        onError={handleError}
        {...rest}
      />
    );
  }
);
