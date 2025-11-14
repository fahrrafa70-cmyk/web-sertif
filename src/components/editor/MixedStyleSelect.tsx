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
    { value: '100', label: 'Thin (100)' },
    { value: '200', label: 'Extra Light (200)' },
    { value: '300', label: 'Light (300)' },
    { value: 'normal', label: 'Normal (400)' },
    { value: '500', label: 'Medium (500)' },
    { value: '600', label: 'Semi Bold (600)' },
    { value: 'bold', label: 'Bold (700)' },
    { value: '800', label: 'Extra Bold (800)' },
    { value: '900', label: 'Black (900)' },
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
    // Sans-serif fonts
    { value: 'Arial', label: 'Arial' },
    { value: 'Helvetica', label: 'Helvetica' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: 'Poppins', label: 'Poppins' },
    { value: 'Lato', label: 'Lato' },
    { value: 'Montserrat', label: 'Montserrat' },
    { value: 'Source Sans Pro', label: 'Source Sans Pro' },
    { value: 'Inter', label: 'Inter' },
    { value: 'Verdana', label: 'Verdana' },
    { value: 'Calibri', label: 'Calibri' },
    { value: 'Tahoma', label: 'Tahoma' },
    
    // Serif fonts
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Garamond', label: 'Garamond' },
    { value: 'Playfair Display', label: 'Playfair Display' },
    { value: 'Merriweather', label: 'Merriweather' },
    { value: 'Crimson Text', label: 'Crimson Text' },
    { value: 'Libre Baskerville', label: 'Libre Baskerville' },
    
    // Monospace fonts
    { value: 'Courier New', label: 'Courier New' },
    { value: 'Monaco', label: 'Monaco' },
    { value: 'Consolas', label: 'Consolas' },
    { value: 'Source Code Pro', label: 'Source Code Pro' },
    
    // Display/Decorative fonts
    { value: 'Impact', label: 'Impact' },
    { value: 'Oswald', label: 'Oswald' },
    { value: 'Bebas Neue', label: 'Bebas Neue' },
    { value: 'Raleway', label: 'Raleway' },
    { value: 'Nunito', label: 'Nunito' },
    { value: 'Dancing Script', label: 'Dancing Script' },
    { value: 'Pacifico', label: 'Pacifico' },
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

// Font Style Select (normal, italic, oblique, underline, strike through)
export function FontStyleSelect({
  value,
  onValueChange,
  className
}: {
  value: string | 'mixed' | undefined;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  const styleOptions = [
    { value: 'normal', label: 'Normal' },
    { value: 'italic', label: 'Italic' },
    { value: 'oblique', label: 'Oblique' },
    { value: 'underline', label: 'Underline' },
    { value: 'line-through', label: 'Strike Through' },
  ];
  
  return (
    <MixedStyleSelect
      value={value}
      onValueChange={onValueChange}
      options={styleOptions}
      placeholder="Style"
      className={className}
    />
  );
}

// Text Shadow Select
export function TextShadowSelect({
  value,
  onValueChange,
  className
}: {
  value: string | 'mixed' | undefined;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  const shadowOptions = [
    { value: 'none', label: 'None' },
    { value: '1px 1px 2px rgba(0,0,0,0.3)', label: 'Subtle' },
    { value: '2px 2px 4px rgba(0,0,0,0.5)', label: 'Soft' },
    { value: '3px 3px 6px rgba(0,0,0,0.7)', label: 'Medium' },
    { value: '4px 4px 8px rgba(0,0,0,0.8)', label: 'Strong' },
    { value: '0px 0px 10px rgba(0,0,0,0.8)', label: 'Glow' },
    { value: '2px 2px 0px rgba(0,0,0,1)', label: 'Hard' },
    { value: '1px 1px 2px rgba(255,255,255,0.8)', label: 'White Shadow' },
  ];
  
  return (
    <MixedStyleSelect
      value={value}
      onValueChange={onValueChange}
      options={shadowOptions}
      placeholder="Shadow"
      className={className}
    />
  );
}
