import React from 'react';

const Pagination: React.FC<{
  current: number;
  total: number;
  onPageChange: (p: number) => void;
}> = ({ current, total, onPageChange }) => {
  if (total <= 1) return null;
  const prev = () => onPageChange(Math.max(1, current - 1));
  const next = () => onPageChange(Math.min(total, current + 1));
  return (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-gray-600">Page {current} / {total}</div>
      <div className="flex items-center gap-2">
        <button onClick={prev} disabled={current === 1} className={`px-3 py-1 rounded border ${current === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}>
          Préc
        </button>
        <button onClick={next} disabled={current === total} className={`px-3 py-1 rounded border ${current === total ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}>
          Suiv
        </button>
      </div>
    </div>
  );
};

export default Pagination;
