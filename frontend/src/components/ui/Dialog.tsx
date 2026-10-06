"use client";

import type { ReactNode } from "react";
import Button from "./Button";
import Modal from "./Modal";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "primary" | "danger";
  loading?: boolean;
  children?: ReactNode;
}

export default function Dialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  loading = false,
  children,
}: DialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
    >
      {children}

      <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={loading}
        >
          {cancelText}
        </Button>

        <Button
          variant={variant}
          size="sm"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? "Please wait..." : confirmText}
        </Button>
      </div>
    </Modal>
  );
}