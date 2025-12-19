import React from 'react';

interface ErrorMessageProps {
  message: string;
  type?: 'validation' | 'auth' | 'network';
  suggestions?: string[];
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, type = 'validation', suggestions }) => {
  const getBgColor = () => {
    switch (type) {
      case 'auth':
        return 'bg-orange-50';
      case 'network':
        return 'bg-red-50';
      default:
        return 'bg-yellow-50';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'auth':
        return 'border-orange-500';
      case 'network':
        return 'border-red-500';
      default:
        return 'border-yellow-500';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'auth':
        return 'text-orange-800';
      case 'network':
        return 'text-red-800';
      default:
        return 'text-yellow-800';
    }
  };

  return (
    <div 
      className={`${getBgColor()} border-l-4 ${getBorderColor()} p-4 animate-shake`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex flex-col">
        <p className={`font-medium ${getTextColor()}`}>
          {message}
        </p>
        {suggestions && suggestions.length > 0 && (
          <ul className={`mt-2 ml-4 list-disc text-sm ${getTextColor()}`}>
            {suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;
