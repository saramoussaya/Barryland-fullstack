import React from 'react';

type PropertyStatus = 'en_attente' | 'validee' | 'rejetee' | 'active' | 'inactive' | 'sold' | 'rented';

interface StatusBadgeProps {
  status: PropertyStatus;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusStyles = (status: PropertyStatus) => {
    switch (status) {
      case 'validee':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'en_attente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejetee':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: PropertyStatus) => {
    switch (status) {
      case 'validee':
        return 'Validée';
      case 'en_attente':
        return 'En attente';
      case 'rejetee':
        return 'Rejetée';
      default:
        return status;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles(
        status
      )} ${className}`}
    >
      {status === 'en_attente' && (
        <svg
          className="animate-spin -ml-1 mr-2 h-3 w-3 text-yellow-800"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {status === 'validee' && (
        <svg
          className="-ml-1 mr-2 h-3 w-3 text-green-800"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
      {status === 'rejetee' && (
        <svg
          className="-ml-1 mr-2 h-3 w-3 text-red-800"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
      {getStatusText(status)}
    </span>
  );
};

export default StatusBadge;
