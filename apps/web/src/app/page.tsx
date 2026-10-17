import { ApiStatus } from "@/features/health";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Sawa</h1>
      <p className="max-w-sm text-zinc-600">Opowie Ci o mieście za oknem tramwaju.</p>
      <ApiStatus />
    </main>
  );
}
