import { DEFAULT_STATE } from "./defaults";
import type { AppState } from "./types";

export const STORAGE_KEY = "second-hand-home-scorer-state-v1";

export function serializeState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function deserializeState(text: string): AppState {
  const parsed = JSON.parse(text) as AppState;
  if (!Array.isArray(parsed.indicators) || !Array.isArray(parsed.properties)) {
    throw new Error("导入文件不是有效的房源评分器备份。");
  }

  // Ensure scoringProfiles exists with at least one FCE profile
  if (!Array.isArray(parsed.scoringProfiles) || parsed.scoringProfiles.length === 0) {
    parsed.scoringProfiles = DEFAULT_STATE.scoringProfiles.map((p) => ({ ...p }));
  } else {
    parsed.scoringProfiles = parsed.scoringProfiles.map((p) => ({
      ...p,
      ahpComparisons: p.ahpComparisons ?? {},
    }));
  }

  // Ensure activeProfileId points to an existing profile
  if (
    !parsed.activeProfileId ||
    !parsed.scoringProfiles.some((p) => p.id === parsed.activeProfileId)
  ) {
    parsed.activeProfileId = parsed.scoringProfiles[0]!.id;
  }

  // Ensure selectedPropertyId points to an existing property, or clear it
  if (
    parsed.selectedPropertyId &&
    !parsed.properties.some((p) => p.id === parsed.selectedPropertyId)
  ) {
    parsed.selectedPropertyId = parsed.properties[0]?.id ?? null;
  }

  return parsed;
}

export function loadState(): AppState {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return DEFAULT_STATE;
  try {
    return deserializeState(saved);
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: AppState): void {
  window.localStorage.setItem(STORAGE_KEY, serializeState(state));
}
