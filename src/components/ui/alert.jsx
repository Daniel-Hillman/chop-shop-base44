import React from 'react';

export function Alert({ className = '', children, ...props }) {
  return (
    <div
      className={`relative w-full rounded-lg border p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertDescription({ className = '', children, ...props }) {
  return (
    <div
      className={`text-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}