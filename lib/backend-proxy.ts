export const DEFAULT_BACKEND_BASE_URL = "http://127.0.0.1:8000";

export function getBackendBaseUrl(): string {
  return process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_BACKEND_BASE_URL;
}

export type BackendRouteFetchOptions = {
  revalidate?: number;
};

export async function fetchBackendRoute(path: string, options: BackendRouteFetchOptions = {}): Promise<Response> {
  return fetch(`${getBackendBaseUrl()}${path}`, {
    ...(options.revalidate !== undefined ? { next: { revalidate: options.revalidate } } : { cache: "no-store" as const }),
    headers: {
      Accept: "application/json"
    }
  });
}
