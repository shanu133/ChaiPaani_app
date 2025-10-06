import React from 'react';

interface ImageWithFallbackProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'onError'> {
  src: string;
  alt: string;
  onError?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export const ImageWithFallback = React.forwardRef<HTMLImageElement, ImageWithFallbackProps>(
  ({ src, alt, className, onError, ...rest }, ref) => {
    const [hasError, setHasError] = React.useState(false);

    React.useEffect(() => {
      // Reset error state when src changes
      setHasError(false);
    }, [src]);

    const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setHasError(true);
      onError?.(event);
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

ImageWithFallback.displayName = 'ImageWithFallback';
