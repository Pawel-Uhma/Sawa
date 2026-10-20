"use client";

import type { Route } from "@sawa/shared";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import {
  memoryFromVisits,
  mergeMemory,
  missingVisits,
  ProfileRowSchema,
  parseSavedRoutes,
  parseVisits,
  profileFromRow,
  profileToRow,
  SAVED_ROUTES_LIMIT,
  type SavedRoute,
  type SavedRouteRequest,
  savedRouteInsert,
  visitInsert,
} from "./account-sync";
import { forgetAll, getMemory, onStoryRemembered, replaceMemory } from "./memory";
import type { Profile } from "./onboarding";

// Konto słuchacza (#194, docs/17-konta.md): Supabase Auth z linkiem na e-mail, a na koncie profil,
// zapisane trasy i historia opowieści. Domyślnie wyłączone: bez NEXT_PUBLIC_AUTH_ENABLED=true
// aplikacja nie ładuje supabase-js i działa jak bez kont. To jedyne miejsce w web, które mówi
// z Supabase; przeglądarka widzi tylko swoje wiersze (RLS po auth.uid()).

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const AUTH_ENABLED =
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "true" &&
  SUPABASE_URL !== "" &&
  SUPABASE_ANON_KEY !== "";
/** Przycisk „Zaloguj przez Google” tylko, gdy dostawca jest włączony w projekcie Supabase. */
export const GOOGLE_ENABLED = AUTH_ENABLED && process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true";

const SUPABASE_TIMEOUT_MS = 5_000;
const VISITS_LIMIT = 5_000;

export type AccountState =
  | { status: "off" }
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; userId: string; email: string | null };

let state: AccountState = AUTH_ENABLED ? { status: "loading" } : { status: "off" };
const listeners = new Set<() => void>();
let clientPromise: Promise<SupabaseClient> | null = null;
// Po każdym zapisie i usunięciu trasy lista „Moje trasy” pobiera się od nowa.
let routesVersion = 0;

function setState(next: AccountState) {
  state = next;
  for (const listener of listeners) listener();
}

function bumpRoutes() {
  routesVersion += 1;
  for (const listener of listeners) listener();
}

/** supabase-js ściąga się dopiero, gdy konta są włączone. */
function client(): Promise<SupabaseClient> {
  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: init?.signal ?? AbortSignal.timeout(SUPABASE_TIMEOUT_MS),
          }),
      },
    }),
  );
  return clientPromise;
}

function signedInId(): string | null {
  return state.status === "signedIn" ? state.userId : null;
}

type StartOptions = {
  /** Profil z tego urządzenia (localStorage) do przeniesienia na konto przy pierwszym logowaniu. */
  localProfile: () => Profile | null;
  /** Profil z konta, gdy już na nim jest: wygrywa z lokalnym, żeby działał na każdym urządzeniu. */
  onProfile: (profile: Profile) => void;
};

/** Uruchamia konto raz na wejście do aplikacji. Zwraca sprzątanie dla useEffect. */
export function startAccount({ localProfile, onProfile }: StartOptions): () => void {
  if (!AUTH_ENABLED) return () => {};
  let cancelled = false;
  let unsubscribeAuth: (() => void) | undefined;
  const unsubscribeStories = onStoryRemembered((story) => {
    if (!signedInId()) return;
    client()
      .then((supabase) => supabase.from("visits").insert(visitInsert(story)))
      .catch(() => {});
  });

  const apply = async (session: Session | null) => {
    if (cancelled) return;
    if (!session) {
      setState({ status: "signedOut" });
      return;
    }
    const wasSignedIn = signedInId() === session.user.id;
    setState({ status: "signedIn", userId: session.user.id, email: session.user.email ?? null });
    if (wasSignedIn) return;
    removeAuthParams();
    try {
      await syncAccount(localProfile, onProfile);
    } catch {
      // Konto bez sieci: aplikacja działa dalej na pamięci z urządzenia.
    }
  };

  client()
    .then((supabase) => {
      if (cancelled) return;
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        // Poza wywołaniem zwrotnym: supabase-js nie lubi zapytań wewnątrz niego.
        window.setTimeout(() => void apply(session), 0);
      });
      unsubscribeAuth = () => data.subscription.unsubscribe();
    })
    .catch(() => setState({ status: "signedOut" }));

  return () => {
    cancelled = true;
    unsubscribeStories();
    unsubscribeAuth?.();
  };
}

/** Po powrocie z linku w mailu kod logowania nie zostaje w pasku adresu. */
function removeAuthParams() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("code")) return;
  url.searchParams.delete("code");
  window.history.replaceState(window.history.state, "", url);
}

/**
 * Scala urządzenie z kontem: dopisuje na konto to, co zna tylko urządzenie (przy pierwszym
 * logowaniu cały profil i pamięć z localStorage), i ściąga na urządzenie historię z konta.
 */
async function syncAccount(
  localProfile: StartOptions["localProfile"],
  onProfile: StartOptions["onProfile"],
) {
  const supabase = await client();
  const [profileRes, visitsRes] = await Promise.all([
    supabase
      .from("listener_profiles")
      .select("familiarity, interests, story_style, audience, context_ids")
      .maybeSingle(),
    supabase
      .from("visits")
      .select("place_id, place_name, fact_ids, context_ids, heard_at")
      .order("heard_at", { ascending: false })
      .limit(VISITS_LIMIT),
  ]);
  if (profileRes.error || visitsRes.error) return;

  const remoteRow = profileRes.data ? ProfileRowSchema.safeParse(profileRes.data) : null;
  const remoteProfile = remoteRow?.success ? profileFromRow(remoteRow.data) : null;
  const remoteMemory = memoryFromVisits(
    parseVisits(visitsRes.data),
    remoteRow?.success ? remoteRow.data.context_ids : [],
  );
  const local = getMemory();

  const toUpload = missingVisits(local, remoteMemory);
  if (toUpload.length > 0) await supabase.from("visits").insert(toUpload);

  const merged = mergeMemory(local, remoteMemory);
  replaceMemory(merged);

  const profile = remoteProfile ?? localProfile();
  if (remoteProfile) onProfile(remoteProfile);
  if (profile) await upsertProfile(supabase, profile, merged.contexts);
}

async function upsertProfile(supabase: SupabaseClient, profile: Profile, contexts: string[]) {
  const userId = signedInId();
  if (!userId) return;
  await supabase.from("listener_profiles").upsert({
    user_id: userId,
    ...profileToRow(profile, contexts),
    updated_at: new Date().toISOString(),
  });
}

/** Zmiana profilu (onboarding, menu) idzie też na konto. Bez konta nic nie robi. */
export function saveAccountProfile(profile: Profile) {
  if (!signedInId()) return;
  client()
    .then((supabase) => upsertProfile(supabase, profile, getMemory().contexts))
    .catch(() => {});
}

/** Ułożona przejażdżka trafia do „Moje trasy”. Bez konta nic nie robi. */
export function saveRide(route: Route, request: SavedRouteRequest) {
  if (!signedInId() || route.places.length === 0) return;
  client()
    .then((supabase) => supabase.from("saved_routes").insert(savedRouteInsert(route, request)))
    .then(bumpRoutes)
    .catch(() => {});
}

export async function deleteSavedRoute(id: string) {
  const supabase = await client();
  await supabase.from("saved_routes").delete().eq("id", id);
  bumpRoutes();
}

/** „Zapomnij wszystko” przy koncie kasuje też historię na koncie. */
export function forgetAccountHistory() {
  const userId = signedInId();
  if (!userId) return;
  client()
    .then(async (supabase) => {
      await supabase.from("visits").delete().eq("user_id", userId);
      await supabase.from("listener_profiles").update({ context_ids: [] }).eq("user_id", userId);
    })
    .catch(() => {});
}

export type SignInResult = "sent" | "error";

/** Link do logowania na e-mail; po kliknięciu wraca na tę samą stronę. */
export async function signInWithEmail(email: string): Promise<SignInResult> {
  try {
    const supabase = await client();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl() },
    });
    return error ? "error" : "sent";
  } catch {
    return "error";
  }
}

export async function signInWithGoogle() {
  const supabase = await client();
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectUrl() },
  });
}

function redirectUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

/** Wylogowanie zostawia na urządzeniu pamięć i profil: aplikacja działa dalej jak bez konta. */
export async function signOut() {
  const supabase = await client();
  await supabase.auth.signOut({ scope: "local" });
  setState({ status: "signedOut" });
}

/**
 * RODO: usuwa konto z profilem, trasami i historią (funkcja `delete_my_account`, kaskada w bazie)
 * i czyści historię z tego urządzenia. Profil z onboardingu zostaje, żeby nie zaczynać od nowa.
 */
export async function deleteAccount(): Promise<boolean> {
  try {
    const supabase = await client();
    const { error } = await supabase.rpc("delete_my_account");
    if (error) return false;
    await supabase.auth.signOut({ scope: "local" });
    forgetAll();
    setState({ status: "signedOut" });
    return true;
  } catch {
    return false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const OFF: AccountState = { status: "off" };

export function useAccount(): AccountState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => OFF,
  );
}

/** „Moje trasy” od najnowszej. Pobiera tylko przy zalogowanym koncie. */
export function useSavedRoutes() {
  const account = useAccount();
  const version = useSyncExternalStore(
    subscribe,
    () => routesVersion,
    () => 0,
  );
  const userId = account.status === "signedIn" ? account.userId : null;
  return useQuery({
    queryKey: ["saved-routes", userId, version],
    enabled: userId !== null,
    queryFn: async (): Promise<SavedRoute[]> => {
      const supabase = await client();
      const { data, error } = await supabase
        .from("saved_routes")
        .select("id, title, request, place_ids, place_names, total_min, created_at")
        .order("created_at", { ascending: false })
        .limit(SAVED_ROUTES_LIMIT);
      if (error) throw error;
      return parseSavedRoutes(data);
    },
  });
}
