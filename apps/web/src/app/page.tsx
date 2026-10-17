import Link from "next/link";
import { ApiStatus } from "@/features/health";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Sawa</h1>
      <p className="max-w-sm text-zinc-600">Opowie Ci o mieście za oknem tramwaju.</p>
      <Link
        href="/mapa"
        className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white"
      >
        Otwórz mapę
      </Link>
      <ApiStatus />
    </main>
  );
}
