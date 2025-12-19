import React from 'react';

export const EditIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 13.5V20h6.5L20.57 9.93a1 1 0 000-1.414L18.07 6.0a1 1 0 00-1.414 0L4 18.656V13.5z" />
  </svg>
);

export const TrashIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 3a1 1 0 00-1 1v1H4a1 1 0 100 2h16a1 1 0 100-2h-4V4a1 1 0 00-1-1H9zM7 8v11a3 3 0 003 3h4a3 3 0 003-3V8H7z" />
  </svg>
);

export const LockIcon: React.FC<{ className?: string }>= ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11V7a4 4 0 10-8 0v4M5 11h14v10H5V11z" />
  </svg>
);

export const UserIcon: React.FC<{ className?: string }>= ({ className = 'w-6 h-6' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 9a7 7 0 0114 0H5z" />
  </svg>
);

export default {};
