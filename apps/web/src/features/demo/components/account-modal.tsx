"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useLang, useT } from "@/features/i18n";
import {
  deleteAccount,
  GOOGLE_ENABLED,
  type SignInResult,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  useAccount,
  useSavedRoutes,
} from "../lib/account";
import type { SavedRoute } from "../lib/account-sync";
import { haptic, SPRING } from "../lib/device";
import { formatDuration, formatWhen, placesLabel } from "../lib/format";
import { CloseIcon, LoopIcon, PinIcon, RestartIcon } from "./icons";
import { PrimaryButton } from "./primary-button";

// Konto z menu Sawy (#194): bez logowania link na e-mail, po zalogowaniu „Moje trasy”
// (stuknięcie powtarza przejażdżkę), wylogowanie i usunięcie konta z danymi.

type AccountModalProps = {
  open: boolean;
  onClose: () => void;
  /** Powtarza zapisaną przejażdżkę: planer liczy ją od nowa ze świeżymi odjazdami. */
  onRepeat: (route: SavedRoute) => void;
};

export function AccountModal({ open, onClose, onRepeat }: AccountModalProps) {
  return (
    <AnimatePresence>
      {open && <AccountDialog key="account" onClose={onClose} onRepeat={onRepeat} />}
    </AnimatePresence>
  );
}

function AccountDialog({ onClose, onRepeat }: Omit<AccountModalProps, "open">) {
  const reduce = useReducedMotion();
  const t = useT();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const account = useAccount();
  const signedIn = account.status === "signedIn";

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fade = { opacity: 0 };
  const rise = reduce ? fade : { opacity: 0, y: 40 };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-2 md:items-center md:p-6">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-[#102b2a]/35"
        initial={fade}
        animate={{ opacity: 1 }}
        exit={fade}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={rise}
        animate={{ opacity: 1, y: 0 }}
        exit={rise}
        transition={SPRING}
        className="karta relative flex max-h-[85dvh] w-full max-w-md flex-col gap-4 rounded-[34px] bg-powierzchnia! p-4 pb-[max(1rem,env(safe-area-inset-bottom))] outline-none md:p-6"
      >
        <header className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]"
            >
              {signedIn ? t("Moje trasy", "My rides") : t("Konto Sawy", "Sawa account")}
            </h2>
            <p className="mt-1 truncate text-[14px] leading-relaxed text-tekst-2">
              {signedIn
                ? (account.email ?? t("Zalogowano", "Signed in"))
                : t(
                    "Zapamiętam Twoje trasy i to, co już słyszałeś, na każdym urządzeniu.",
                    "I'll remember your rides and what you've heard, on every device.",
                  )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Zamknij", "Close")}
            className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-full text-tekst-2 transition-[background-color,transform] duration-100 hover:bg-tlo-2 active:scale-90"
          >
            <CloseIcon className="size-5" />
          </button>
        </header>

        {signedIn ? (
          <SignedIn
            onRepeat={(route) => {
              haptic();
              onRepeat(route);
              onClose();
            }}
          />
        ) : (
          <SignInForm loading={account.status === "loading"} />
        )}
      </motion.div>
    </div>
  );
}

function SignInForm({ loading }: { loading: boolean }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<SignInResult | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    haptic();
    setSending(true);
    setResult(await signInWithEmail(email.trim()));
    setSending(false);
  }

  if (result === "sent") {
    return (
      <output className="block rounded-[18px] bg-tlo-2 p-4 text-[15px] leading-relaxed text-tekst">
        {t(
          `Wysłałam link na ${email.trim()}. Otwórz go na tym urządzeniu, a wrócisz tu zalogowany.`,
          `I've sent a link to ${email.trim()}. Open it on this device and you'll come back signed in.`,
        )}
      </output>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={t("Twój e-mail", "Your email")}
        aria-label={t("Adres e-mail", "Email address")}
        autoComplete="email"
        inputMode="email"
        enterKeyHint="send"
        className="h-12 w-full rounded-[14px] bg-tekst/[0.06] px-4 text-[16px] text-tekst outline-none transition-shadow placeholder:text-tekst-3 focus:bg-powierzchnia focus:ring-2 focus:ring-glebia"
      />
      {result === "error" && (
        <p className="px-1 text-[14px] text-koral" role="alert">
          {t(
            "Nie udało się wysłać linku. Spróbuj jeszcze raz.",
            "Couldn't send the link. Try again.",
          )}
        </p>
      )}
      <PrimaryButton type="submit" disabled={sending || loading || email.trim() === ""}>
        {sending
          ? t("Wysyłam…", "Sending…")
          : t("Wyślij link do logowania", "Send me a sign-in link")}
      </PrimaryButton>
      {GOOGLE_ENABLED && (
        <SecondaryButton onClick={() => void signInWithGoogle()}>
          {t("Zaloguj przez Google", "Sign in with Google")}
        </SecondaryButton>
      )}
      <p className="px-1 text-[13px] leading-relaxed text-tekst-2">
        {t(
          "Bez konta wszystko działa jak dotąd, na tym urządzeniu. Na koncie trzymam profil, zapisane trasy (z miejscem startu) i historię opowieści. Usuniesz je w każdej chwili.",
          "Without an account everything works as before, on this device. The account keeps your profile, saved rides (with where they start) and story history. You can delete them at any time.",
        )}
      </p>
    </form>
  );
}

function SignedIn({ onRepeat }: { onRepeat: (route: SavedRoute) => void }) {
  const t = useT();
  const routes = useSavedRoutes();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const confirmTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(confirmTimer.current), []);

  // Usunięcie jest nieodwracalne, więc pierwsze stuknięcie tylko pyta (jak „Zapomnij wszystko”).
  async function remove() {
    haptic();
    window.clearTimeout(confirmTimer.current);
    if (!confirmDelete) {
      setConfirmDelete(true);
      confirmTimer.current = window.setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setConfirmDelete(false);
    setDeleteFailed(!(await deleteAccount()));
  }

  const list = routes.data ?? [];

  return (
    <>
      {routes.isPending ? (
        <p className="px-1 text-[14px] text-tekst-2">{t("Wczytuję trasy…", "Loading rides…")}</p>
      ) : routes.isError ? (
        <p className="px-1 text-[14px] text-koral" role="alert">
          {t("Nie udało się wczytać tras.", "Couldn't load your rides.")}
        </p>
      ) : list.length === 0 ? (
        <p className="px-1 text-[14px] leading-relaxed text-tekst-2">
          {t(
            "Jeszcze żadnej. Każda ułożona przejażdżka zapisze się tutaj.",
            "None yet. Every ride you plan will be saved here.",
          )}
        </p>
      ) : (
        <ul className="-mx-2 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {list.map((route) => (
            <li key={route.id}>
              <SavedRouteRow route={route} onRepeat={() => onRepeat(route)} />
            </li>
          ))}
        </ul>
      )}

      <div className="flex shrink-0 flex-col">
        <SecondaryButton onClick={() => void signOut()}>
          {t("Wyloguj się", "Sign out")}
        </SecondaryButton>
        <button
          type="button"
          onClick={remove}
          className="flex h-12 items-center justify-center rounded-[18px] text-[15px] font-bold text-koral transition-colors duration-100 active:bg-koral/10 md:hover:bg-koral/10"
        >
          {confirmDelete
            ? t("Stuknij jeszcze raz: usuwam konto i dane", "Tap again: delete account and data")
            : t("Usuń konto i dane", "Delete account and data")}
        </button>
        {deleteFailed && (
          <p className="px-1 text-center text-[13px] text-koral" role="alert">
            {t(
              "Nie udało się usunąć konta. Spróbuj jeszcze raz.",
              "Couldn't delete the account. Try again.",
            )}
          </p>
        )}
      </div>
    </>
  );
}

function SavedRouteRow({ route, onRepeat }: { route: SavedRoute; onRepeat: () => void }) {
  const t = useT();
  const lang = useLang();
  const isLoop = route.request.rideEnd.type === "loop";
  const title = isLoop ? t("Pętla, powrót na start", "Loop, back to the start") : route.title;
  const Icon = isLoop ? LoopIcon : PinIcon;
  return (
    <button
      type="button"
      onClick={onRepeat}
      className="flex min-h-14 w-full items-center gap-3 rounded-[18px] px-2 py-2.5 text-left transition-colors duration-100 active:bg-tekst/[0.06] md:hover:bg-tekst/[0.04]"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-tlo-2 text-glebia">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold leading-tight text-tekst">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-[13px] leading-tight text-tekst-2 tabular-nums">
          {formatWhen(route.at, Date.now(), lang)} · {formatDuration(route.request.durationMin)} ·{" "}
          {placesLabel(route.placeNames.length, lang)}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-[13px] font-bold text-glebia">
        <RestartIcon className="size-4" />
        {t("Powtórz", "Repeat")}
      </span>
    </button>
  );
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => {
        haptic();
        onClick();
      }}
      className="flex h-12 w-full items-center justify-center rounded-[18px] bg-tlo-2 text-[15px] font-bold text-tekst transition-[transform,background-color] duration-100 active:scale-[0.98] md:hover:bg-tekst/[0.08]"
    >
      {children}
    </button>
  );
}
