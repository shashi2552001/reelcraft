import React from 'react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = true,
}) => {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidthClass="max-w-md">
      <p className="text-sm text-[#B8C0CE] leading-relaxed mb-6">{message}</p>
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.07] text-sm font-medium text-[#E6E9F0] transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            danger
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-[#E59A1A] hover:bg-[#D48B0F] text-[#0B0D12]'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
};
