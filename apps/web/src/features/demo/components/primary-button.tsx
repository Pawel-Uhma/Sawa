import type { ButtonHTMLAttributes } from "react";

export function PrimaryButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`flex h-14 w-full items-center justify-center gap-2 rounded-full bg-glebia px-6 text-base font-semibold text-white shadow-[0_8px_20px_rgba(23,112,111,0.28)] transition-[transform,opacity] duration-150 ease-out active:scale-[0.98] disabled:opacity-40 disabled:shadow-none ${className}`}
    />
  );
}
