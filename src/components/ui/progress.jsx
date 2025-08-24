import React from 'react';

export function Progress({ value = 0, className = '', ...props }) {
  const clampedValue = Math.min(100, Math.max(0, value));
  
  return (
    <div 
      className={`relative w-full overflow-hidden rounded-full bg-gray-200 ${className}`}
      {...props}
    >
      <div
        className="h-full bg-cyan-500 transition-all duration-300 ease-out"
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}