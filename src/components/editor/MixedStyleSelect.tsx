"use client";

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MixedStyleSelectProps {
  value: string | 'mixed' | undefined;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

export function MixedStyleSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  className
}: MixedStyleSelectProps) {
  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = value === 'mixed' ? 'Mixed' : (selectedOption?.label || value);
  
  return (
    <Select value={value === 'mixed' ? undefined : value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {value === 'mixed' ? (
            <span className="text-gray-500 italic">Mixed</span>
          ) : (
            displayLabel
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        {options.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Pre-configured Font Weight Select
export function FontWeightSelect({
  value,
  onValueChange,
  className
}: {
  value: string | 'mixed' | undefined;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  const weightOptions = [
    { value: '300', label: 'Light (300)' },
    { value: '400', label: 'Normal (400)' },
    { value: '500', label: 'Medium (500)' },
    { value: '600', label: 'Semi Bold (600)' },
    { value: '700', label: 'Bold (700)' },
    { value: '800', label: 'Extra Bold (800)' },
    // Also support string aliases
    { value: 'light', label: 'Light' },
    { value: 'normal', label: 'Normal' },
    { value: 'medium', label: 'Medium' },
    { value: 'bold', label: 'Bold' },
  ];
  
  return (
    <MixedStyleSelect
      value={value}
      onValueChange={onValueChange}
      options={weightOptions}
      placeholder="Weight"
      className={className}
    />
  );
}

// Pre-configured Font Family Select
export function FontFamilySelect({
  value,
  onValueChange,
  className
}: {
  value: string | 'mixed' | undefined;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  const familyOptions = [
    { value: 'Arial', label: 'Arial' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Verdana', label: 'Verdana' },
    { value: 'Poppins', label: 'Poppins' },
  ];
  
  return (
    <MixedStyleSelect
      value={value}
      onValueChange={onValueChange}
      options={familyOptions}
      placeholder="Font"
      className={className}
    />
  );
}
