"use client";

import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function Confirm({
  title,
  message,
  onConfirm,
  onClose,
  confirmText = "Confirm",
  cancelText = "Cancel",
}: ConfirmProps) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="modal-body">
        <p>{message}</p>
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          {cancelText}
        </Button>
        <Button onClick={onConfirm}>{confirmText}</Button>
      </div>
    </Modal>
  );
}
