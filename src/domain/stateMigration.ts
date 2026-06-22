import { DEFAULT_INDICATORS } from "./defaults";
import type { Indicator } from "./types";

export const ONBOARDING_KEY = "second-hand-home-scorer-onboarding-v2";
export const INDICATOR_VERSION_KEY = "second-hand-home-scorer-indicator-version";
export const CURRENT_INDICATOR_VERSION = "v2";

export function detectMissingDefaultIndicators(existing: Indicator[]): Indicator[] {
  const existingIds = new Set(existing.map((ind) => ind.id));
  return DEFAULT_INDICATORS.filter((def) => !existingIds.has(def.id));
}

export function mergeMissingDefaults(existing: Indicator[]): Indicator[] {
  const missing = detectMissingDefaultIndicators(existing);
  if (missing.length === 0) return existing;
  return [...existing, ...missing];
}

export function getStoredIndicatorVersion(): string | null {
  return window.localStorage.getItem(INDICATOR_VERSION_KEY);
}

export function setStoredIndicatorVersion(version: string): void {
  window.localStorage.setItem(INDICATOR_VERSION_KEY, version);
}

export function needsIndicatorMigration(): boolean {
  return getStoredIndicatorVersion() !== CURRENT_INDICATOR_VERSION;
}

export function hasSeenOnboarding(): boolean {
  return window.localStorage.getItem(ONBOARDING_KEY) === "1";
}

export function markOnboardingSeen(): void {
  window.localStorage.setItem(ONBOARDING_KEY, "1");
}
