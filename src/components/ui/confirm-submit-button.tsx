"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button, type ButtonProps } from "./button";

type ConfirmSubmitButtonProps = Omit<ButtonProps, "type" | "onClick"> & {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  pendingLabel?: string;
  children: ReactNode;
};

export function ConfirmSubmitButton({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  pending = false,
  pendingLabel,
  disabled,
  children,
  ...buttonProps
}: ConfirmSubmitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const isDisabled = disabled || pending;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      cancelRef.current?.focus();
    } else {
      triggerRef.current?.focus();
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;

    if (e.shiftKey) {
      if (document.activeElement === cancelRef.current) {
        e.preventDefault();
        confirmRef.current?.focus();
      }
    } else {
      if (document.activeElement === confirmRef.current) {
        e.preventDefault();
        cancelRef.current?.focus();
      }
    }
  };

  return (
    <>
      <button ref={submitRef} type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      <Button
        {...buttonProps}
        ref={triggerRef}
        type="button"
        disabled={isDisabled}
        onClick={() => setIsOpen(true)}
      >
        {pending && pendingLabel ? pendingLabel : children}
      </Button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 transition-opacity"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
          onClick={() => setIsOpen(false)}
        >
          <div
            ref={dialogRef}
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleTab}
          >
            <h2 id="confirm-dialog-title" className="text-lg font-semibold text-slate-950">
              {title}
            </h2>
            <p id="confirm-dialog-description" className="mt-2 text-sm leading-6 text-slate-600">
              {message}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button ref={cancelRef} type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                {cancelLabel}
              </Button>
              <Button
                ref={confirmRef}
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  submitRef.current?.click();
                }}
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

