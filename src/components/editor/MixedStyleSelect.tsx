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
      <SelectContent 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 max-h-[300px] overflow-y-auto"
        position="popper"
        align="start"
        sideOffset={4}
      >
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
    { value: 'normal', label: 'Normal' },
    { value: '500', label: 'Medium' },
    { value: '600', label: 'Semi Bold' },
    { value: 'bold', label: 'Bold' },
    { value: '800', label: 'Extra Bold' },
    { value: '900', label: 'Black' }, 
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

// Pre-configured Font Family Select with Categories
export function FontFamilySelect({
  value,
  onValueChange,
  className
}: {
  value: string | 'mixed' | undefined;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  const selectedOption = value === 'mixed' ? undefined : value;
  const displayLabel = value === 'mixed' ? 'Mixed' : value;
  
  return (
    <Select value={selectedOption} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Font">
          {value === 'mixed' ? (
            <span className="text-gray-500 italic">Mixed</span>
          ) : (
            <span style={{ fontFamily: value || 'inherit' }}>{displayLabel}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 max-h-[400px] overflow-y-auto w-[280px]"
        position="popper"
        align="start"
        sideOffset={4}
      >
        {/* Sans-serif fonts */}
        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
          Sans-serif
        </div>
        <SelectItem value="Arial"><span style={{ fontFamily: 'Arial' }}>Arial</span></SelectItem>
        <SelectItem value="Helvetica"><span style={{ fontFamily: 'Helvetica' }}>Helvetica</span></SelectItem>
        <SelectItem value="Roboto"><span style={{ fontFamily: 'Roboto' }}>Roboto</span></SelectItem>
        <SelectItem value="Open Sans"><span style={{ fontFamily: 'Open Sans' }}>Open Sans</span></SelectItem>
        <SelectItem value="Poppins"><span style={{ fontFamily: 'Poppins' }}>Poppins</span></SelectItem>
        <SelectItem value="Lato"><span style={{ fontFamily: 'Lato' }}>Lato</span></SelectItem>
        <SelectItem value="Montserrat"><span style={{ fontFamily: 'Montserrat' }}>Montserrat</span></SelectItem>
        <SelectItem value="Inter"><span style={{ fontFamily: 'Inter' }}>Inter</span></SelectItem>
        <SelectItem value="Verdana"><span style={{ fontFamily: 'Verdana' }}>Verdana</span></SelectItem>
        <SelectItem value="Calibri"><span style={{ fontFamily: 'Calibri' }}>Calibri</span></SelectItem>
        <SelectItem value="Tahoma"><span style={{ fontFamily: 'Tahoma' }}>Tahoma</span></SelectItem>
        
        {/* Serif fonts */}
        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10 mt-1">
          Serif
        </div>
        <SelectItem value="Times New Roman"><span style={{ fontFamily: 'Times New Roman' }}>Times New Roman</span></SelectItem>
        <SelectItem value="Georgia"><span style={{ fontFamily: 'Georgia' }}>Georgia</span></SelectItem>
        <SelectItem value="Garamond"><span style={{ fontFamily: 'Garamond' }}>Garamond</span></SelectItem>
        <SelectItem value="Playfair Display"><span style={{ fontFamily: 'Playfair Display' }}>Playfair Display</span></SelectItem>
        <SelectItem value="Merriweather"><span style={{ fontFamily: 'Merriweather' }}>Merriweather</span></SelectItem>
        <SelectItem value="Crimson Text"><span style={{ fontFamily: 'Crimson Text' }}>Crimson Text</span></SelectItem>
        <SelectItem value="Libre Baskerville"><span style={{ fontFamily: 'Libre Baskerville' }}>Libre Baskerville</span></SelectItem>
        
        {/* Monospace fonts */}
        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10 mt-1">
          Monospace
        </div>
        <SelectItem value="Courier New"><span style={{ fontFamily: 'Courier New' }}>Courier New</span></SelectItem>
        <SelectItem value="Monaco"><span style={{ fontFamily: 'Monaco' }}>Monaco</span></SelectItem>
        <SelectItem value="Consolas"><span style={{ fontFamily: 'Consolas' }}>Consolas</span></SelectItem>
        <SelectItem value="Source Code Pro"><span style={{ fontFamily: 'Source Code Pro' }}>Source Code Pro</span></SelectItem>
        
        {/* Display/Decorative fonts */}
        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10 mt-1">
          Display & Decorative
        </div>
        <SelectItem value="Impact"><span style={{ fontFamily: 'Impact' }}>Impact</span></SelectItem>
        <SelectItem value="Oswald"><span style={{ fontFamily: 'Oswald' }}>Oswald</span></SelectItem>
        <SelectItem value="Bebas Neue"><span style={{ fontFamily: 'Bebas Neue' }}>Bebas Neue</span></SelectItem>
        <SelectItem value="Raleway"><span style={{ fontFamily: 'Raleway' }}>Raleway</span></SelectItem>
        <SelectItem value="Nunito"><span style={{ fontFamily: 'Nunito' }}>Nunito</span></SelectItem>
        <SelectItem value="Dancing Script"><span style={{ fontFamily: 'Dancing Script' }}>Dancing Script</span></SelectItem>
        <SelectItem value="Pacifico"><span style={{ fontFamily: 'Pacifico' }}>Pacifico</span></SelectItem>
      </SelectContent>
    </Select>
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
