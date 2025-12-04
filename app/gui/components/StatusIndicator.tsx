import React from "react";

type ProcessingStatus = "idle" | "uploading" | "processing" | "complete" | "error";

interface StatusIndicatorProps {
  status: ProcessingStatus;
}

export default function StatusIndicator({ status }: StatusIndicatorProps) {
  if (status === "idle") return null;

  const getStatusConfig = () => {
    switch (status) {
      case "uploading":
        return {
          bg: "#fef3c7",
          border: "#fbbf24",
          color: "#78350f",
          message: "Uploading file...",
          showSpinner: true,
        };
      case "processing":
        return {
          bg: "#fef3c7",
          border: "#fbbf24",
          color: "#78350f",
          message: "Processing packaging estimates...",
          showSpinner: true,
        };
      case "complete":
        return {
          bg: "#dbeafe",
          border: "#60a5fa",
          color: "#1e40af",
          message: "Estimates ready! View reports below.",
          showSpinner: false,
        };
      case "error":
        return {
          bg: "#fee2e2",
          border: "#f87171",
          color: "#991b1b",
          message: "Error occurred during processing",
          showSpinner: false,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        style={{
          marginBottom: "1.5rem",
          padding: "1rem 1.25rem",
          borderRadius: "8px",
          background: config.bg,
          border: `1px solid ${config.border}`,
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        {config.showSpinner ? (
          <div
            style={{
              width: "20px",
              height: "20px",
              border: "2px solid #f59e0b",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
        ) : status === "complete" ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        )}
        <span style={{ fontWeight: "500", color: config.color, fontSize: "0.9375rem" }}>{config.message}</span>
      </div>
    </>
  );
}
