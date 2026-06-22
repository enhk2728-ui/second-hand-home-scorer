import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Shell, type ViewKey } from "./components/Shell";
import { PropertyList } from "./components/PropertyList";
import { PropertyForm } from "./components/PropertyForm";
import { IndicatorSettings } from "./components/IndicatorSettings";
import { ScoringMatrix } from "./components/ScoringMatrix";
import { ResultsView } from "./components/ResultsView";
import { PropertyDetail } from "./components/PropertyDetail";
import { OnboardingGuide, type MigrationChoice } from "./components/OnboardingGuide";
import { loadState, saveState, serializeState, deserializeState } from "./domain/storage";
import { calculatePropertyScore } from "./domain/fce";
import { buildCsvExport } from "./domain/csv";
import { DEFAULT_STATE } from "./domain/defaults";
import type { AppState, PropertyRecord, ScoringProfile } from "./domain/types";
import {
  needsIndicatorMigration,
  hasSeenOnboarding,
  mergeMissingDefaults,
  detectMissingDefaultIndicators,
  setStoredIndicatorVersion,
  CURRENT_INDICATOR_VERSION,
} from "./domain/stateMigration";

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [view, setView] = useState<ViewKey>("list");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Track migration-needed in state so it updates after decisions
  const [migrationNeeded, setMigrationNeeded] = useState(() => needsIndicatorMigration());
  const missingDefaults = useMemo(
    () => detectMissingDefaultIndicators(state.indicators),
    [state.indicators],
  );
  const showMigrationPrompt = migrationNeeded && missingDefaults.length > 0;

  // Show onboarding on first visit or when migration is needed
  useEffect(() => {
    if (!hasSeenOnboarding() || migrationNeeded) {
      setShowOnboarding(true);
    }
  }, [migrationNeeded]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const scores = useMemo(
    () => state.properties.map((p) => calculatePropertyScore(p, state.indicators)),
    [state.properties, state.indicators],
  );

  const scoreById = useMemo(
    () => new Map(scores.map((s) => [s.propertyId, s])),
    [scores],
  );

  const selectedProperty = useMemo(
    () => (state.selectedPropertyId ? state.properties.find((p) => p.id === state.selectedPropertyId) ?? null : null),
    [state.properties, state.selectedPropertyId],
  );

  const handleAddProperty = useCallback(() => {
    const now = new Date().toISOString();
    const next: PropertyRecord = {
      id: crypto.randomUUID(),
      name: "新房源",
      community: "",
      address: "",
      link: "",
      totalPrice: "",
      area: "",
      unitPrice: "",
      notes: "",
      valuesByIndicatorId: {},
      hardFails: [],
      createdAt: now,
      updatedAt: now,
    };
    setState((prev) => ({
      ...prev,
      properties: [...prev.properties, next],
      selectedPropertyId: next.id,
    }));
    setView("form");
  }, []);

  const handleDeleteProperty = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      properties: prev.properties.filter((p) => p.id !== id),
      selectedPropertyId: prev.selectedPropertyId === id ? null : prev.selectedPropertyId,
    }));
  }, []);

  const handleSelectProperty = useCallback((id: string) => {
    setState((prev) => ({ ...prev, selectedPropertyId: id }));
  }, []);

  const handleEditProperty = useCallback((id: string) => {
    setState((prev) => ({ ...prev, selectedPropertyId: id }));
    setView("form");
  }, []);

  const handleChangeProperty = useCallback((property: PropertyRecord) => {
    setState((prev) => ({
      ...prev,
      properties: prev.properties.map((p) => (p.id === property.id ? property : p)),
    }));
  }, []);

  const handleChangeIndicators = useCallback((indicators: typeof state.indicators) => {
    setState((prev) => ({ ...prev, indicators }));
  }, []);

  const activeProfile = useMemo(
    () => state.scoringProfiles.find((p) => p.id === state.activeProfileId) ?? null,
    [state.scoringProfiles, state.activeProfileId],
  );

  const handleChangeScoringProfile = useCallback((profile: ScoringProfile) => {
    setState((prev) => ({
      ...prev,
      scoringProfiles: prev.scoringProfiles.map((p) =>
        p.id === profile.id ? profile : p,
      ),
    }));
  }, []);

  const handleExportJson = useCallback(() => {
    const text = serializeState(state);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "second-hand-home-scorer-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const handleImportJson = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const restored = deserializeState(reader.result as string);
          setState({
            ...restored,
            selectedPropertyId: restored.properties[0]?.id ?? null,
          });
          setImportError(null);
        } catch {
          setImportError("导入失败：文件格式不正确。");
        }
      };
      reader.readAsText(file);
      event.target.value = "";
    },
    [],
  );

  const handleExportCsv = useCallback(() => {
    const csv = buildCsvExport(state, scores);
    const bom = "﻿";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "second-hand-home-scorer.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [state, scores]);

  const handleResetData = useCallback(() => {
    setState(DEFAULT_STATE);
    setShowResetConfirm(false);
    setView("list");
  }, []);

  const handleOnboardingComplete = useCallback(
    (choice: MigrationChoice) => {
      setShowOnboarding(false);
      setMigrationNeeded(false);
      if (choice === null) {
        // User dismissed/skipped — still update version to avoid re-prompt
        setStoredIndicatorVersion(CURRENT_INDICATOR_VERSION);
        return;
      }
      if (choice === "merge") {
        setState((prev) => ({
          ...prev,
          indicators: mergeMissingDefaults(prev.indicators),
        }));
        setStoredIndicatorVersion(CURRENT_INDICATOR_VERSION);
      } else if (choice === "keep") {
        setStoredIndicatorVersion(CURRENT_INDICATOR_VERSION);
      } else if (choice === "reset") {
        setState(DEFAULT_STATE);
        setStoredIndicatorVersion(CURRENT_INDICATOR_VERSION);
        setView("list");
      }
    },
    [],
  );

  const handleOpenHelp = useCallback(() => {
    setShowOnboarding(true);
  }, []);

  return (
    <Shell activeView={view} onViewChange={setView} onHelp={handleOpenHelp}>
      {showOnboarding && (
        <OnboardingGuide
          showMigrationPrompt={showMigrationPrompt}
          missingCount={missingDefaults.length}
          onComplete={handleOnboardingComplete}
        />
      )}

      <div className="toolbar">
        <button className="ghost-button" type="button" onClick={handleExportJson}>
          导出 JSON
        </button>
        <button className="ghost-button" type="button" onClick={() => fileInputRef.current?.click()}>
          导入 JSON
        </button>
        <button className="ghost-button" type="button" onClick={handleExportCsv}>
          导出 CSV
        </button>
        <div style={{ flex: 1 }} />
        {showResetConfirm ? (
          <>
            <span className="muted" style={{ fontSize: 12 }}>确认重置所有数据为默认？</span>
            <button className="ghost-button danger-button" type="button" onClick={handleResetData}>
              确认重置
            </button>
            <button className="ghost-button" type="button" onClick={() => setShowResetConfirm(false)}>
              取消
            </button>
          </>
        ) : (
          <button className="ghost-button" type="button" onClick={() => setShowResetConfirm(true)}>
            重置数据
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="application/json" style={{ display: "none" }} onChange={handleImportJson} />
      </div>

      {importError && (
        <div className="error-banner">
          <span>{importError}</span>
          <button className="error-banner-dismiss" type="button" onClick={() => setImportError(null)}>
            ×
          </button>
        </div>
      )}

      {view === "list" && (
        <div className="split-view">
          <PropertyList
            properties={state.properties}
            scores={scores}
            selectedId={state.selectedPropertyId}
            onSelect={handleSelectProperty}
            onAdd={handleAddProperty}
            onEdit={handleEditProperty}
            onDelete={handleDeleteProperty}
          />
          {selectedProperty && (
            <PropertyDetail property={selectedProperty} score={scoreById.get(selectedProperty.id)!} />
          )}
        </div>
      )}

      {view === "form" && selectedProperty && (
        <PropertyForm property={selectedProperty} onChange={handleChangeProperty} onSave={() => setView("list")} />
      )}

      {view === "form" && !selectedProperty && (
        <section className="panel">
          <div className="empty-state">
            <p>暂未选择房源。</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="primary-button" type="button" onClick={handleAddProperty}>
                新建房源
              </button>
              <button className="ghost-button" type="button" onClick={() => setView("list")}>
                从列表中选择
              </button>
            </div>
          </div>
        </section>
      )}

      {view === "score" && (
        <ScoringMatrix properties={state.properties} indicators={state.indicators} onChange={handleChangeProperty} onComplete={() => setView("results")} />
      )}

      {view === "results" && <ResultsView properties={state.properties} indicators={state.indicators} scores={scores} />}

      {view === "settings" && activeProfile && (
        <IndicatorSettings
          indicators={state.indicators}
          scoringProfile={activeProfile}
          onChange={handleChangeIndicators}
          onProfileChange={handleChangeScoringProfile}
        />
      )}
    </Shell>
  );
}
