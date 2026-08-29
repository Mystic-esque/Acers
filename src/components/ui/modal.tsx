"use client";

import { useEffect } from "react";
import { Button } from "./button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#2D2A26]/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Dialog */}
      <div className="relative bg-[#FFFDF8] border border-[#E8E2D8] rounded-3xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-xl font-bold font-mono text-[#2D2A26] mb-2">{title}</h2>
        
        {description && (
          <p className="text-[#6B6358] mb-8">{description}</p>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose} className="rounded-xl font-bold border-[#D0C9BC] text-[#6B6358] hover:bg-[#EDE8DE] hover:text-[#2D2A26]">
            {cancelText}
          </Button>
          {onConfirm && (
            <Button 
              onClick={() => {
                onConfirm();
                onClose();
              }} 
              className={`rounded-xl font-bold ${isDestructive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-[#2D2A26] hover:bg-[#403C36] text-[#F8F4EC]'}`}
            >
              {confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
