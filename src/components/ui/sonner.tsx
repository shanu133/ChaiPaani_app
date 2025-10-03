"use client";

import { Toaster as SonnerToaster } from 'sonner';

/**
 * Custom Toaster component that wraps the Sonner toaster
 * with application-specific configuration
 */
interface CustomToasterProps {
  richColors?: boolean;
  [key: string]: any;
}

const AppToaster = ({ richColors = true, ...props }: CustomToasterProps) => {
  return (
    <SonnerToaster
      richColors={richColors}
      {...props}
      className="toaster-group"
      toastOptions={{
        classNames: {
          toast: "bg-background border shadow-lg",
          title: "font-medium",
          description: "text-muted-foreground",
          actionButton: "gap-1",
        },
        duration: 3000,
      }}
    />
  );
};

export { AppToaster as Toaster };
export default AppToaster;
