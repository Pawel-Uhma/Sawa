export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-logo text-2xl font-semibold tracking-tight text-glebia ${className}`}>
      sawa<span className="text-koral">.</span>
    </span>
  );
}
