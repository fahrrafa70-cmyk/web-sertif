"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: "default" | "outline" | "ghost" | "destructive" | "primary";
  size?: "default" | "sm" | "lg" | "icon";
}

const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ 
    children, 
    isLoading = false, 
    loadingText,
    variant = "default",
    size = "default",
    className,
    disabled,
    ...props 
  }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    
    const variants = {
      default: "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700",
      outline: "border border-gray-300 bg-transparent hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800",
      ghost: "hover:bg-gray-100 dark:hover:bg-gray-800",
      destructive: "bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700",
      primary: "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
    };
    
    const sizes = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-8 px-3 py-1.5 text-xs",
      lg: "h-12 px-6 py-3 text-base",
      icon: "h-10 w-10"
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
        )}
        {isLoading ? (loadingText || children) : children}
      </button>
    );
  }
);

LoadingButton.displayName = "LoadingButton";

export { LoadingButton };
