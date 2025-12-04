import React from "react";
import type { PackagingResponse } from "../../responses/PackagingResponse";

interface ReportViewsProps {
  response: PackagingResponse;
  onDownloadCSV: () => void;
  onReset: () => void;
}

export default function ReportViews({
  response,
  onDownloadCSV,
  onReset,
}: ReportViewsProps) {
  return (
    <div style={{ marginTop: "2rem" }}>
      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
        <button
          onClick={onDownloadCSV}
          style={{
            padding: "0.75rem 1.5rem",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontWeight: "500",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Download CSV Report
        </button>
        <button
          onClick={onReset}
          style={{
            padding: "0.75rem 1.5rem",
            background: "#6b7280",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontWeight: "500",
            cursor: "pointer",
            fontSize: "1rem",
            marginLeft: "auto",
          }}
        >
          New Estimate
        </button>
      </div>

      {/* Main Report */}
      <div style={{ background: "white", borderRadius: "8px", padding: "2rem", border: "1px solid #e5e7eb" }}>
        <h2 style={{ marginTop: 0, marginBottom: "2rem", fontSize: "1.5rem", fontWeight: "600" }}>
          Packaging Estimate
        </h2>

        {/* Summary Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "6px" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>Total Pieces</div>
            <div style={{ fontSize: "1.75rem", fontWeight: "600" }}>{response.workOrderSummary.totalPieces}</div>
          </div>
          <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "6px" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>Total Weight</div>
            <div style={{ fontSize: "1.75rem", fontWeight: "600" }}>{response.weightSummary.finalShipmentWeightLbs.toFixed(0)} lbs</div>
          </div>
        </div>

        {/* Box Requirements */}
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>Box Requirements</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.875rem", fontWeight: "600", color: "#6b7280" }}>Type</th>
                <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.875rem", fontWeight: "600", color: "#6b7280" }}>Dimensions</th>
                <th style={{ textAlign: "right", padding: "0.75rem", fontSize: "0.875rem", fontWeight: "600", color: "#6b7280" }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {response.packingSummary.boxRequirements.map((box, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.75rem", fontWeight: "500" }}>{box.label}</td>
                  <td style={{ padding: "0.75rem", color: "#6b7280" }}>{box.dimensions}</td>
                  <td style={{ padding: "0.75rem", textAlign: "right", fontWeight: "600" }}>{box.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Container Requirements */}
        {response.packingSummary.containerRequirements.length > 0 && (
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>Container Requirements</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.875rem", fontWeight: "600", color: "#6b7280" }}>Type</th>
                  <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.875rem", fontWeight: "600", color: "#6b7280" }}>Dimensions</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", fontSize: "0.875rem", fontWeight: "600", color: "#6b7280" }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {response.packingSummary.containerRequirements.map((container, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.75rem", fontWeight: "500" }}>{container.label}</td>
                    <td style={{ padding: "0.75rem", color: "#6b7280" }}>{container.dimensions}</td>
                    <td style={{ padding: "0.75rem", textAlign: "right", fontWeight: "600" }}>{container.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Weight Breakdown */}
        <div>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>Weight Breakdown</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "6px" }}>
              <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Artwork Weight</div>
              <div style={{ fontSize: "1.25rem", fontWeight: "600" }}>{response.weightSummary.totalArtworkWeightLbs.toFixed(0)} lbs</div>
            </div>
            <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "6px" }}>
              <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Packaging Weight</div>
              <div style={{ fontSize: "1.25rem", fontWeight: "600" }}>{response.weightSummary.packagingWeightLbs.total.toFixed(0)} lbs</div>
            </div>
          </div>
        </div>

        {/* Oversized Items Warning */}
        {response.businessIntelligence.oversizedItems.length > 0 && (
          <div style={{ marginTop: "2rem", padding: "1rem", background: "#fef3c7", borderRadius: "6px", border: "1px solid #fcd34d" }}>
            <div style={{ fontWeight: "600", marginBottom: "0.5rem", color: "#92400e" }}>Oversized Items</div>
            {response.businessIntelligence.oversizedItems.map((item, idx) => (
              <div key={idx} style={{ fontSize: "0.875rem", color: "#78350f", marginBottom: "0.25rem" }}>
                • {item.dimensions} (Qty: {item.quantity}) - {item.recommendation}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
