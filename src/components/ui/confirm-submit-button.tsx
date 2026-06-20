"use client";

import { useRef, useState, type ReactNode } from "react";

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
  const isDisabled = disabled || pending;

  return (
    <>
      <button ref={submitRef} type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      <Button
        {...buttonProps}
        type="button"
        disabled={isDisabled}
        onClick={() => setIsOpen(true)}
      >
        {pending && pendingLabel ? pendingLabel : children}
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                {cancelLabel}
              </Button>
              <Button
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

