import React from 'react';
import { AlertTriangle, AlertCircle, Trash2 } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  requiresTypedConfirmation?: string;
  typedValue?: string;
  onTypedChange?: (val: string) => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  isDestructive = false,
  requiresTypedConfirmation,
  typedValue = '',
  onTypedChange,
}) => {
  const isTypeValid = !requiresTypedConfirmation || typedValue === requiresTypedConfirmation;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="flex flex-col items-center text-center space-y-4 pt-1">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isDestructive ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
          }`}
        >
          {isDestructive ? <Trash2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
        </div>

        <p className="text-sm text-gray-600 leading-relaxed">{message}</p>

        {requiresTypedConfirmation && (
          <div className="w-full text-left space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-gray-700">
              พิมพ์คำว่า <span className="text-rose-600 font-mono select-all bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">{requiresTypedConfirmation}</span> เพื่อยืนยันการล้างข้อมูล:
            </label>
            <input
              type="text"
              value={typedValue}
              onChange={(e) => onTypedChange?.(e.target.value)}
              placeholder={requiresTypedConfirmation}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>
        )}

        <div className="flex items-center gap-3 w-full pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={!isTypeValid}
            onClick={() => {
              if (isTypeValid) {
                onConfirm();
                onClose();
              }
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-white transition-colors shadow-xs ${
              !isTypeValid
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : isDestructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
