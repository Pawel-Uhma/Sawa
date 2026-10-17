/**
 * Where the dane.um.warszawa.pl actions live. The city blocks Railway's IPs (#63), so production
 * goes through a proxy with a Polish IP that wants its own key in X-Proxy-Key.
 */
export type WawApi = { baseUrl: string; proxyKey?: string };

export const DEFAULT_WAW_API: WawApi = { baseUrl: "https://dane.um.warszawa.pl" };

export function wawActionUrl(api: WawApi, action: string): string {
  return `${api.baseUrl.replace(/\/+$/, "")}/api/action/${action}`;
}

export function wawHeaders(api: WawApi, token: string): Record<string, string> {
  return {
    Authorization: token,
    "Content-Type": "application/json",
    ...(api.proxyKey ? { "X-Proxy-Key": api.proxyKey } : {}),
  };
}
