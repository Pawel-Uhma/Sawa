import { Logo } from "./logo";
import { PrimaryButton } from "./primary-button";

export function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="wejdz mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))] md:max-w-xl md:px-8">
      <div className="flex flex-col gap-4">
        <Logo className="text-4xl" />
        <p className="max-w-xs text-lg leading-snug text-tekst-2">
          Opowiem Ci o mieście za oknem tramwaju.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <PrimaryButton onClick={onStart}>Zaczynamy</PrimaryButton>
        <p className="text-center text-xs text-tekst-3">
          Wersja demo · dane testowe, bez logowania
        </p>
      </div>
    </main>
  );
}
