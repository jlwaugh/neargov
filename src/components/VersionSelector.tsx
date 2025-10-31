interface Revision {
  version: number;
  created_at: string;
  username: string;
  edit_reason?: string;
  body_changes?: {
    inline?: string;
  };
}

interface VersionSelectorProps {
  currentRevision: number;
  selectedVersion: number;
  revisions: Revision[];
  onVersionChange: (version: number) => void;
  showDiffHighlights: boolean;
  onToggleDiff: (show: boolean) => void;
  onSummarizeChanges: () => void;
  revisionSummary: string | null;
  revisionSummaryLoading: boolean;
  onHideSummary: () => void;
  versionDiffHtml?: string;
}

export default function VersionSelector({
  currentRevision,
  selectedVersion,
  revisions,
  onVersionChange,
  showDiffHighlights,
  onToggleDiff,
  onSummarizeChanges,
  revisionSummary,
  revisionSummaryLoading,
  onHideSummary,
  versionDiffHtml,
}: VersionSelectorProps) {
  if (currentRevision <= 1) {
    return null;
  }

  const selectedRevision = revisions.find((r) => r.version === selectedVersion);

  return (
    <div
      style={{
        marginBottom: "1rem",
        padding: "1rem",
        background: "#f9fafb",
        borderRadius: "6px",
        border: "1px solid #e5e7eb",
      }}
    >
      {/* Controls Row */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          marginBottom: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        {/* Version Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label
            htmlFor="version-select"
            style={{
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "#374151",
            }}
          >
            Version:
          </label>
          <select
            id="version-select"
            value={selectedVersion}
            onChange={(e) => onVersionChange(Number(e.target.value))}
            style={{
              padding: "0.333rem 0.5rem",
              fontSize: "0.875rem",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              background: "white",
              cursor: "pointer",
              minWidth: "120px",
            }}
          >
            {Array.from({ length: currentRevision }, (_, i) => i + 1)
              .reverse()
              .map((v) => (
                <option key={v} value={v}>
                  v{v} {v === currentRevision && "(current)"}
                </option>
              ))}
          </select>
        </div>

        {/* Diff Toggle */}
        {selectedVersion > 1 && (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.875rem",
              cursor: versionDiffHtml ? "pointer" : "not-allowed",
              opacity: versionDiffHtml ? 1 : 0.6,
            }}
          >
            <input
              type="checkbox"
              checked={showDiffHighlights}
              onChange={(e) => onToggleDiff(e.target.checked)}
              disabled={!versionDiffHtml}
              style={{ cursor: versionDiffHtml ? "pointer" : "not-allowed" }}
            />
            <span style={{ color: "#374151" }}>
              Show changes {!versionDiffHtml && "(no diff available)"}
            </span>
          </label>
        )}

        {/* Summarize All Revisions Button */}
        {!revisionSummary && (
          <button
            onClick={onSummarizeChanges}
            disabled={revisionSummaryLoading}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "#7c3aed",
              background: "white",
              border: "1px solid #7c3aed",
              borderRadius: "4px",
              cursor: revisionSummaryLoading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              opacity: revisionSummaryLoading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!revisionSummaryLoading) {
                e.currentTarget.style.background = "#faf5ff";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "white";
            }}
          >
            {revisionSummaryLoading
              ? "⏳ Analyzing..."
              : "📜 Summarize All Revisions"}
          </button>
        )}
      </div>

      {/* Version Info (inline) */}
      {selectedVersion < currentRevision && selectedRevision && (
        <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
          Edited by @{selectedRevision.username} on{" "}
          {new Date(selectedRevision.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {selectedRevision.edit_reason && (
            <span style={{ marginLeft: "0.5rem" }}>
              • {selectedRevision.edit_reason}
            </span>
          )}
        </div>
      )}

      {/* Revision Summary */}
      {revisionSummary && (
        <div
          style={{
            padding: "0.75rem",
            background: "#faf5ff",
            border: "1px solid #e9d5ff",
            borderRadius: "4px",
            marginTop: "0.75rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "#6b21a8",
              }}
            >
              📜 Revision History Summary
            </div>
            <button
              onClick={onHideSummary}
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.25rem 0.5rem",
              }}
            >
              Hide
            </button>
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              lineHeight: "1.6",
              color: "#374151",
              whiteSpace: "pre-wrap",
            }}
          >
            {revisionSummary}
          </div>
        </div>
      )}
    </div>
  );
}
