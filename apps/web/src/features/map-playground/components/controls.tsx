import type { ReactNode } from "react";

export function Section({
  title,
  prop,
  children,
}: {
  title: string;
  /** SawaMap prop this section drives, shown as a code tag. */
  prop?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 border-b border-tekst/8 px-5 py-4 last:border-b-0">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-tekst">{title}</h2>
        {prop && (
          <code className="rounded-md bg-mieta-jasna px-1.5 py-0.5 font-mono text-[11px] font-semibold text-glebia-ciemna">
            {prop}
          </code>
        )}
      </header>
      {children}
    </section>
  );
}

type Option<T extends string> = { value: T; label: string; isDisabled?: boolean };

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: a styled segmented control; role="radio" keeps it accessible
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={option.isDisabled}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              isSelected
                ? "bg-glebia text-white shadow-sm"
                : "bg-tlo-2 text-tekst-2 hover:bg-mieta-jasna hover:text-glebia-ciemna"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  label,
  hint,
  isOn,
  onChange,
}: {
  label: string;
  hint?: string;
  isOn: boolean;
  onChange: (isOn: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-[13px] font-semibold text-tekst">{label}</span>
        {hint && <span className="block text-xs text-tekst-3">{hint}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          checked={isOn}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-10 rounded-full bg-tekst/15 transition-colors peer-checked:bg-glebia peer-focus-visible:ring-2 peer-focus-visible:ring-glebia/40" />
        <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex justify-between text-xs font-semibold text-tekst-2">
        {label}
        <span className="tabular-nums text-tekst">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 w-full accent-glebia"
      />
    </label>
  );
}

export function Chips<T extends string>({
  label,
  selected,
  options,
  onChange,
}: {
  label: string;
  selected: readonly T[];
  options: { value: T; label: string }[];
  onChange: (selected: T[]) => void;
}) {
  return (
    <fieldset className="flex flex-wrap gap-1.5">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <label
            key={option.value}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              isSelected
                ? "border-glebia bg-mieta-jasna text-glebia-ciemna"
                : "border-tekst/10 bg-white text-tekst-2 hover:border-glebia/40"
            }`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={isSelected}
              onChange={() =>
                onChange(
                  isSelected
                    ? selected.filter((value) => value !== option.value)
                    : [...selected, option.value],
                )
              }
            />
            {option.label}
          </label>
        );
      })}
    </fieldset>
  );
}
