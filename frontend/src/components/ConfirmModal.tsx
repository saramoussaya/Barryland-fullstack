import React from 'react';

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

const ConfirmModal: React.FC<Props> = ({ open, title = 'Confirmer', description, confirmText = 'Supprimer', cancelText = 'Annuler', onConfirm, onCancel, loading = false }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
            {description ? <p className="text-sm text-gray-600 mt-2">{description}</p> : null}
          </div>
          <div className="p-4 flex justify-end space-x-3">
            <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-200">{cancelText}</button>
            <button onClick={onConfirm} disabled={loading} className={`px-4 py-2 rounded-lg ${loading ? 'bg-gray-300 text-gray-700' : 'bg-red-600 text-white hover:bg-red-700'}`}>
              {loading ? 'Suppression...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
