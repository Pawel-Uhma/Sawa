"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Status = "checking" | "up" | "down";

export function ApiStatus() {
  const [status, setStatus] = useState<Status>("checking");
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    api.health
      .$get()
      .then((res) => res.json())
      .then((body) => {
        setVersion(body.version);
        setStatus("up");
      })
      .catch(() => setStatus("down"));
  }, []);

  const label = { checking: "sprawdzam…", up: `działa (${version})`, down: "nie odpowiada" }[
    status
  ];
  return <p className="text-sm text-zinc-500">API: {label}</p>;
}
