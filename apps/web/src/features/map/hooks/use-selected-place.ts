import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const PARAM = "p";

/** Selected place id lives in the URL (`?p=kercelak`), so the link can be shared. */
export function useSelectedPlace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const select = useCallback(
    (placeId: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (placeId) next.set(PARAM, placeId);
      else next.delete(PARAM);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  return { selectedId: searchParams.get(PARAM), select };
}
