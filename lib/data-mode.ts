const DEMO_DATA_MODES = new Set(["demo", "mock", "sample"]);

export function getDataMode() {
  return (process.env.DATA_MODE ?? process.env.NEXT_PUBLIC_DATA_MODE ?? "live").trim().toLowerCase();
}

export function isDemoMode() {
  return DEMO_DATA_MODES.has(getDataMode());
}

export function backendUnavailablePayload(message: string) {
  return {
    status: "backend_unavailable",
    dataMode: getDataMode(),
    message
  };
}
