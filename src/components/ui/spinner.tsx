import React from 'react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: 'primary' | 'white' | 'gray';
}

const sizeMap = {
  xs: 12,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
};

const colorMap = {
  primary: 'stroke-blue-500 dark:stroke-blue-400',
  white: 'stroke-white',
  gray: 'stroke-gray-400 dark:stroke-gray-500',
};

/**
 * Spinner Component - Modern circular progress indicator
 * Uses SVG arc (partial circle) that rotates smoothly
 * 
 * @example
 * <Spinner size="md" color="primary" />
 */
export function Spinner({ size = 'md', className, color = 'primary' }: SpinnerProps) {
  const dimension = sizeMap[size];
  const strokeWidth = Math.max(2, dimension / 8); // Dynamic stroke width
  const radius = (dimension - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference * 0.25; // 75% visible arc

  return (
    <div
      className={cn('inline-block', className)}
      role="status"
      aria-label="Loading"
      style={{ width: dimension, height: dimension }}
    >
      <svg
        className="animate-spin"
        width={dimension}
        height={dimension}
        viewBox={`0 0 ${dimension} ${dimension}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          className={cn(colorMap[color])}
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface LoadingProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  spinnerColor?: 'primary' | 'white' | 'gray';
  fullScreen?: boolean;
}

/**
 * Loading Component - Spinner with optional text
 * 
 * @example
 * <Loading text="Loading data..." />
 * <Loading fullScreen text="Please wait..." />
 */
export function Loading({ 
  size = 'md', 
  text, 
  className, 
  spinnerColor = 'primary',
  fullScreen = false 
}: LoadingProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Spinner size={size} color={spinnerColor} />
      {text && (
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Inline Spinner - Small spinner for buttons or inline elements
 * 
 * @example
 * <button><InlineSpinner /> Loading...</button>
 */
export function InlineSpinner({ className }: { className?: string }) {
  return <Spinner size="sm" className={cn('inline-block', className)} />;
}

export default Spinner;
