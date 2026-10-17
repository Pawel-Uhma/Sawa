import type { ButtonHTMLAttributes } from "react";

export function PrimaryButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`flex h-14 w-full items-center justify-center gap-2.5 rounded-[18px] bg-glebia px-6 text-[17px] font-bold tracking-[-0.01em] text-white shadow-[0_6px_16px_rgba(23,112,111,0.28)] transition-[transform,opacity,background-color] duration-150 ease-out hover:bg-glebia-ciemna focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-glebia active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none ${className}`}
    />
  );
}
