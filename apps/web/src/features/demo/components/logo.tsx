import Image from "next/image";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-logo text-2xl font-semibold tracking-tight text-glebia ${className}`}>
      sawa<span className="text-koral">.</span>
    </span>
  );
}

/** Głowa Sawy w kółku: znak aplikacji na telefonie i część pełnego logo. */
export function SawaHead({ className = "" }: { className?: string }) {
  return (
    <span className={`block shrink-0 overflow-hidden rounded-full bg-mieta-jasna ${className}`}>
      <Image
        src="/sawa-glowa.png"
        alt=""
        width={192}
        height={192}
        draggable={false}
        className="size-full object-cover"
      />
    </span>
  );
}
