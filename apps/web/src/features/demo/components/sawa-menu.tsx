"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  type ComponentType,
  createContext,
  type ReactNode,
  type SVGProps,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ThemeSwitch } from "@/features/theme";
import { haptic, project, SPRING, SPRING_FLICK, useIsDesktop } from "../lib/device";
import { rubberband, useVerticalDrag } from "../lib/gesture";
import { FAMILIARITY, INTERESTS, type Profile, STORY_STYLES } from "../lib/onboarding";
import type { StartMode } from "../lib/start-point";
import {
  BubbleIcon,
  ChevronRightIcon,
  CompassIcon,
  InfoIcon,
  LocateIcon,
  PinIcon,
  RestartIcon,
  RoutesIcon,
  ShareIcon,
  SparkIcon,
} from "./icons";
import { Logo, SawaHead } from "./logo";
import type { ProfileStep } from "./profile-modal";

export type SawaMenuActions = {
  profile: Profile;
  /** Otwiera modal edycji jednego pola (nie onboarding). */
  onEditProfile: (step: ProfileStep) => void;
  /** Liczba opowieści w ostatniej trasie; null, gdy jeszcze żadnej nie było. */
  lastRouteStops: number | null;
  onOpenLastRoute: () => void;
  onRestart: () => void;
  /** Ile miejsc Sawa już opowiedziała temu słuchaczowi (lib/memory.ts). */
  rememberedPlaces: number;
  onForget: () => void;
  /** Skąd rusza przejażdżka (lib/start-point.ts) i podpis tego, co naprawdę jest startem. */
  startMode: StartMode;
  startLabel: string;
  onStartModeChange: (mode: StartMode) => void;
};

const SawaMenuContext = createContext<SawaMenuActions | null>(null);

export function SawaMenuProvider({
  value,
  children,
}: {
  value: SawaMenuActions;
  children: ReactNode;
}) {
  return <SawaMenuContext.Provider value={value}>{children}</SawaMenuContext.Provider>;
}

// Popover na desktopie: szybsza sprężyna niż arkusz, bo przebywa krótszą drogę.
const POPOVER_SPRING = { type: "spring", bounce: 0, duration: 0.32 } as const;

type SawaMenuButtonProps = {
  /** „badge”: szklane kółko z głową (telefon), pełne logo od md. „inline”: pełne logo w panelu. */
  variant?: "badge" | "inline";
};

/**
 * Znak Sawy, który otwiera menu aplikacji. Na telefonie menu to arkusz od dołu (jak w iOS),
 * na desktopie popover wyrastający spod logo.
 */
export function SawaMenuButton({ variant = "badge" }: SawaMenuButtonProps) {
  const actions = useContext(SawaMenuContext);
  const isDesktop = useIsDesktop();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [closeRequested, setCloseRequested] = useState(false);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  // Akcja z menu rusza dopiero, gdy arkusz zjedzie: najpierw wracamy na mapę, potem idziemy dalej.
  const pending = useRef<(() => void) | null>(null);

  function openMenu() {
    haptic();
    setAnchor(triggerRef.current?.getBoundingClientRect() ?? null);
    setCloseRequested(false);
    setOpen(true);
  }

  function finishClose() {
    setOpen(false);
    setCloseRequested(false);
    const action = pending.current;
    pending.current = null;
    if (action) action();
    else triggerRef.current?.focus();
  }

  function run(action: () => void) {
    haptic();
    if (isDesktop) {
      setOpen(false);
      action();
      return;
    }
    pending.current = action;
    setCloseRequested(true);
  }

  const content = actions && <MenuContent actions={actions} run={run} />;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Menu Sawy"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => !open && openMenu()}
        className={
          variant === "badge"
            ? "pointer-events-auto szklo flex size-12 items-center justify-center rounded-full p-1 transition-transform duration-100 active:scale-[0.94] md:w-auto md:gap-2 md:pr-4"
            : "-ml-1.5 flex items-center gap-2 rounded-full p-1 pr-3.5 transition-[transform,background-color] duration-100 hover:bg-tlo-2 active:scale-[0.97]"
        }
      >
        <SawaHead className={variant === "badge" ? "size-10" : "size-11"} />
        <Logo className={variant === "badge" ? "hidden text-[26px] md:inline" : "text-[28px]"} />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          isDesktop ? (
            <AnimatePresence>
              {open && anchor && (
                <MenuPopover key="popover" anchor={anchor} onClose={() => setOpen(false)}>
                  {content}
                </MenuPopover>
              )}
            </AnimatePresence>
          ) : (
            open && (
              <MenuSheet closeRequested={closeRequested} onClosed={finishClose}>
                {content}
              </MenuSheet>
            )
          ),
          document.body,
        )}
    </>
  );
}

type MenuSheetProps = {
  closeRequested: boolean;
  onClosed: () => void;
  children: ReactNode;
};

/**
 * Arkusz od dołu: wjeżdża sprężyną, idzie za palcem 1:1, rzucony w dół zjeżdża z prędkością palca.
 * Przyciemnienie mapy zależy od położenia arkusza, więc gaśnie razem z nim, także w trakcie gestu.
 */
function MenuSheet({ closeRequested, onClosed, children }: MenuSheetProps) {
  const reduce = useReducedMotion();
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const heightRef = useRef(0);
  const base = useRef(0);
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  const y = useMotionValue(0);
  const opacity = useMotionValue(0);
  const [height, setHeight] = useState(0);
  const scrim = useTransform([y, opacity], ([yValue, opacityValue]: number[]) => {
    const shown = height > 0 ? 1 - Math.min(1, Math.max(0, yValue / height)) : 0;
    return shown * opacityValue;
  });

  function dismiss(velocity = 0) {
    if (reduce) {
      animate(opacity, 0, { duration: 0.2, onComplete: () => onClosedRef.current() });
      return;
    }
    animate(y, heightRef.current, { ...SPRING, velocity, onComplete: () => onClosedRef.current() });
  }

  // Tylko przy wejściu: arkusz montuje się na otwarcie i odmontowuje po zjechaniu.
  // biome-ignore lint/correctness/useExhaustiveDependencies: wartości ruchu są stabilne
  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    heightRef.current = sheet.offsetHeight;
    setHeight(sheet.offsetHeight);
    if (reduce) {
      animate(opacity, 1, { duration: 0.2 });
    } else {
      opacity.set(1);
      y.set(sheet.offsetHeight);
      animate(y, 0, SPRING);
    }
    sheet.focus({ preventScroll: true });
    const observer = new ResizeObserver(() => {
      heightRef.current = sheet.offsetHeight;
      setHeight(sheet.offsetHeight);
    });
    observer.observe(sheet);
    return () => observer.disconnect();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: dismiss czyta stan przez refy
  useEffect(() => {
    if (closeRequested) dismiss();
  }, [closeRequested]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: dismiss czyta stan przez refy
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useVerticalDrag(sheetRef, {
    shouldStart: (dy) => {
      const scroller = scrollRef.current;
      if (reduce || !scroller || scroller.scrollTop > 0) return false;
      // W górę tylko, gdy treść się mieści; inaczej ruch w górę przewija listę.
      return dy > 0 || scroller.scrollHeight <= scroller.clientHeight;
    },
    onStart: () => {
      y.stop();
      base.current = y.get();
    },
    onMove: (dy) => {
      const raw = base.current + dy;
      y.set(raw < 0 ? -rubberband(-raw, heightRef.current) : raw);
    },
    onEnd: (velocity) => {
      const landing = y.get() + project(velocity);
      if (landing > heightRef.current / 2) {
        haptic();
        dismiss(velocity);
        return;
      }
      animate(y, 0, { ...SPRING_FLICK, velocity });
    },
  });

  return (
    <div className="fixed inset-0 z-50">
      <motion.div
        aria-hidden="true"
        style={{ opacity: scrim }}
        onClick={() => dismiss()}
        className="absolute inset-0 bg-[#102b2a]/35"
      />
      <motion.div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu Sawy"
        tabIndex={-1}
        style={{ y, opacity }}
        className="karta absolute inset-x-2 bg-white! bottom-[max(0.5rem,env(safe-area-inset-bottom))] rounded-[34px] outline-none"
      >
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-2 h-[5px] w-9 -translate-x-1/2 rounded-full bg-tekst/15"
        />
        <div
          ref={scrollRef}
          className="max-h-[85dvh] overflow-y-auto overscroll-contain px-4 pb-4 pt-6"
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}

type MenuPopoverProps = {
  anchor: DOMRect;
  onClose: () => void;
  children: ReactNode;
};

/** Popover pod logo: rośnie z rogu, w którym jest logo, i wraca tą samą drogą. */
function MenuPopover({ anchor, onClose, children }: MenuPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hidden = { opacity: 0, scale: 0.9, y: -6, filter: "blur(6px)" };

  return (
    <>
      <div aria-hidden="true" className="fixed inset-0 z-50" onPointerDown={onClose} />
      <motion.div
        ref={ref}
        role="dialog"
        aria-label="Menu Sawy"
        tabIndex={-1}
        initial={hidden}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        exit={hidden}
        transition={POPOVER_SPRING}
        style={{ top: anchor.bottom + 10, left: anchor.left, transformOrigin: "24px 0" }}
        className="karta fixed z-50 bg-white! max-h-[calc(100dvh-120px)] w-[340px] overflow-y-auto rounded-[28px] p-4 outline-none"
      >
        {children}
      </motion.div>
    </>
  );
}

const labelOf = (list: { key: string; label: string }[], key: string | null) =>
  list.find((item) => item.key === key)?.label ?? null;

type MenuContentProps = {
  actions: SawaMenuActions;
  run: (action: () => void) => void;
};

function MenuContent({ actions, run }: MenuContentProps) {
  const { profile } = actions;
  const [aboutOpen, setAboutOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | undefined>(undefined);
  // Zapomnienie jest nieodwracalne, więc pierwsze stuknięcie tylko pyta (bez okna dialogowego).
  const [confirmForget, setConfirmForget] = useState(false);
  const forgetTimer = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      window.clearTimeout(copiedTimer.current);
      window.clearTimeout(forgetTimer.current);
    },
    [],
  );

  function forget() {
    haptic();
    window.clearTimeout(forgetTimer.current);
    if (!confirmForget) {
      setConfirmForget(true);
      forgetTimer.current = window.setTimeout(() => setConfirmForget(false), 3000);
      return;
    }
    setConfirmForget(false);
    actions.onForget();
  }

  const familiarity = labelOf(FAMILIARITY, profile.familiarity);
  const style = labelOf(STORY_STYLES, profile.storyStyle);
  const interests = profile.interests.map((key) => labelOf(INTERESTS, key) ?? key);

  async function share() {
    haptic();
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Sawa",
          text: "Sawa opowiada o miejscach, które mijasz tramwajem i autobusem.",
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Zamknięty arkusz udostępniania albo brak zgody na schowek: nic nie robimy.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-3 px-1">
        <SawaHead className="size-14" />
        <div className="min-w-0">
          <h2 className="font-logo text-[24px] font-semibold leading-none tracking-tight text-glebia">
            sawa<span className="text-koral">.</span>
          </h2>
          <p className="mt-1 text-[13px] leading-snug text-tekst-2">
            Twoja przewodniczka po tym, co mijasz za oknem.
          </p>
        </div>
      </header>

      <Group title="Jak opowiadam">
        <Row
          Icon={SparkIcon}
          label="Zainteresowania"
          value={interests.length > 0 ? interests.join(", ") : "Wszystko po trochu"}
          onClick={() => run(() => actions.onEditProfile("interests"))}
        />
        <Row
          Icon={CompassIcon}
          label="Znajomość miasta"
          value={familiarity ?? "Nie wybrano"}
          onClick={() => run(() => actions.onEditProfile("familiarity"))}
        />
        <Row
          Icon={BubbleIcon}
          label="Styl opowieści"
          value={style ?? "Nie wybrano"}
          onClick={() => run(() => actions.onEditProfile("style"))}
        />
        <Row
          Icon={PinIcon}
          label="Co już Ci opowiedziałam"
          value={
            actions.rememberedPlaces === 0
              ? "Jeszcze nic. Zapamiętam, co usłyszysz"
              : confirmForget
                ? "Stuknij jeszcze raz, żeby zapomnieć"
                : `${placesLabel(actions.rememberedPlaces)} · stuknij, żeby zapomnieć`
          }
          onClick={actions.rememberedPlaces === 0 ? () => {} : forget}
          chevron={false}
        />
      </Group>

      <Group title="Skąd ruszamy">
        <Row
          Icon={LocateIcon}
          label={actions.startMode === "gps" ? "Z Twojej lokalizacji" : "Spod 42 Warsaw"}
          value={`${actions.startLabel} · stuknij, żeby zmienić`}
          onClick={() => {
            haptic();
            actions.onStartModeChange(actions.startMode === "gps" ? "venue" : "gps");
          }}
          chevron={false}
        />
      </Group>

      <Group title="Wygląd">
        <div className="p-3">
          <ThemeSwitch />
        </div>
      </Group>

      <Group>
        {actions.lastRouteStops !== null && (
          <Row
            Icon={RoutesIcon}
            label="Ostatnia przejażdżka"
            value={`${actions.lastRouteStops} opowieści`}
            onClick={() => run(actions.onOpenLastRoute)}
          />
        )}
        <Row
          Icon={ShareIcon}
          label="Poleć Sawę"
          value={copied ? "Skopiowano link" : undefined}
          onClick={share}
          chevron={false}
        />
        <Row
          Icon={InfoIcon}
          label="Skąd Sawa to wie"
          onClick={() => {
            haptic();
            setAboutOpen((current) => !current);
          }}
          expanded={aboutOpen}
        />
        <AnimatePresence initial={false}>
          {aboutOpen && (
            <motion.div
              key="about"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRING}
              className="overflow-hidden"
            >
              <div className="space-y-2 px-4 pb-4 pt-1 text-[14px] leading-relaxed text-tekst-2">
                <p>
                  Miejsca i fakty biorę z otwartych danych Warszawy (dane.um.warszawa.pl) i z
                  OpenStreetMap. Trasy i odjazdy liczę z rozkładu ZTM.
                </p>
                <p>Z tych faktów opowieść układa model językowy, a czyta ją syntezator mowy.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Group>

      <button
        type="button"
        onClick={() => run(actions.onRestart)}
        className="flex h-12 items-center justify-center gap-2 rounded-[18px] text-[15px] font-bold text-koral transition-colors duration-100 active:bg-koral/10 md:hover:bg-koral/10"
      >
        <RestartIcon className="size-5" />
        Zacznij od nowa
      </button>
    </div>
  );
}

function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section>
      {title && <h3 className="etykieta mb-1.5 px-4">{title}</h3>}
      <div className="overflow-hidden rounded-[22px] bg-tlo-2 [&>*+*]:border-t [&>*+*]:border-tekst/[0.06]">
        {children}
      </div>
    </section>
  );
}

function placesLabel(n: number) {
  const tens = n % 100;
  const ones = n % 10;
  if (n === 1) return "1 miejsce";
  if (ones >= 2 && ones <= 4 && (tens < 12 || tens > 14)) return `${n} miejsca`;
  return `${n} miejsc`;
}

type RowProps = {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value?: string;
  onClick: () => void;
  chevron?: boolean;
  /** Wiersz rozwijany: strzałka obraca się w dół, gdy treść jest widoczna. */
  expanded?: boolean;
};

function Row({ Icon, label, value, onClick, chevron = true, expanded }: RowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-100 active:bg-tekst/[0.06] md:hover:bg-tekst/[0.04]"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-white text-glebia shadow-[0_1px_2px_rgba(16,43,42,0.08)]">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-tight text-tekst">{label}</span>
        {value && (
          <span className="mt-0.5 block truncate text-[13px] leading-tight text-tekst-2">
            {value}
          </span>
        )}
      </span>
      {chevron && (
        <ChevronRightIcon
          className={`size-4 shrink-0 text-tekst-3 transition-transform duration-200 ${
            expanded ? "rotate-90" : ""
          }`}
        />
      )}
    </button>
  );
}
