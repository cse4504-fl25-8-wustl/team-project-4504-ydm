import React from "react";

interface ErrorDisplayProps {
  error: string | null;
  validationErrors: string[];
}

export default function ErrorDisplay({ error, validationErrors }: ErrorDisplayProps) {
  if (!error && validationErrors.length === 0) return null;

  return (
    <div
      style={{
        marginBottom: "1.5rem",
        padding: "1rem 1.25rem",
        background: "#fee2e2",
        border: "1px solid #f87171",
        borderRadius: "8px",
      }}
    >
      <div style={{ display: "flex", alignItems: "start", gap: "0.75rem" }}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#dc2626"
          strokeWidth="2"
          style={{ flexShrink: 0, marginTop: "2px" }}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: "0 0 0.5rem 0", color: "#991b1b", fontSize: "0.9375rem", fontWeight: "600" }}>
            {validationErrors.length > 0 ? "Validation Errors" : "Processing Error"}
          </h3>
          {error && <p style={{ margin: "0.5rem 0 0 0", color: "#7f1d1d", fontSize: "0.875rem" }}>{error}</p>}
          {validationErrors.length > 0 && (
            <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.25rem", color: "#7f1d1d", fontSize: "0.875rem" }}>
              {validationErrors.map((err, idx) => (
                <li key={idx} style={{ marginBottom: "0.25rem" }}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
