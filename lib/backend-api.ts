const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

function getApiBaseUrl(): string {
  return process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

export type BackendFetchOptions = {
  revalidate?: number;
};

export async function fetchBackendJson<T>(path: string, options: BackendFetchOptions = {}): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...(options.revalidate !== undefined ? { next: { revalidate: options.revalidate } } : { cache: "no-store" as const }),
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}
