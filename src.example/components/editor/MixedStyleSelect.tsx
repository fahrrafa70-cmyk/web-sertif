'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MixedStyleSelectProps {
  value: string | 'mixed';
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  isMixed?: boolean; // Explicitly control mixed state
}

/**
 * Select dropdown yang support "Mixed" state
 * Menampilkan "Mixed" ketika selection punya multiple styles
 */
export function MixedStyleSelect({
  value,
  onValueChange,
  options,
  className = '',
  isMixed = false,
}: MixedStyleSelectProps) {
  const isMixedState = value === 'mixed' || isMixed;

  return (
    <Select 
      value={isMixedState ? '' : value} 
      onValueChange={onValueChange}
    >
      <SelectTrigger className={`${className} ${isMixedState ? 'text-gray-500 italic' : ''}`}>
        <SelectValue placeholder={isMixedState ? 'Mixed' : undefined} />
      </SelectTrigger>
      <SelectContent>
        {/* Show "Mixed" indicator jika current state mixed */}
        {isMixedState && (
          <div className="px-2 py-1.5 text-xs text-gray-500 italic border-b">
            Mixed formatting
          </div>
        )}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Font Weight Select dengan Mixed state
 */
export function FontWeightSelect({
  value,
  onValueChange,
  className = '',
}: Omit<MixedStyleSelectProps, 'options' | 'placeholder'>) {
  const weightOptions = [
    { value: '300', label: 'Light' },
    { value: '400', label: 'Normal' },
    { value: '500', label: 'Medium' },
    { value: '600', label: 'Semi Bold' },
    { value: '700', label: 'Bold' },
    { value: '800', label: 'Extra Bold' },
    { value: '900', label: 'Black' },
  ];

  return (
    <MixedStyleSelect
      value={value}
      onValueChange={onValueChange}
      options={weightOptions}
      className={className}
    />
  );
}

/**
 * Font Family Select dengan Mixed state
 */
export function FontFamilySelect({
  value,
  onValueChange,
  className = '',
}: Omit<MixedStyleSelectProps, 'options' | 'placeholder'>) {
  const fontOptions = [
    { value: 'Poppins', label: 'Poppins' },
    { value: 'Inter', label: 'Inter' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: 'Montserrat', label: 'Montserrat' },
    { value: 'Lato', label: 'Lato' },
    { value: 'Playfair Display', label: 'Playfair Display' },
    { value: 'Merriweather', label: 'Merriweather' },
  ];

  return (
    <MixedStyleSelect
      value={value}
      onValueChange={onValueChange}
      options={fontOptions}
      className={className}
    />
  );
}
