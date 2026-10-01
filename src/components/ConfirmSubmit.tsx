"use client";

import { useFormStatus } from "react-dom";

export function ConfirmSubmit({
  children,
  confirmText,
  pendingText,
  className,
}: {
  children: React.ReactNode;
  confirmText: string;
  pendingText: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
