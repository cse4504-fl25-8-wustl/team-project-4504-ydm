"use client";

import { useState } from "react";
import type { PackagingResponse } from "../responses/PackagingResponse";
import type { DeliveryCapabilities } from "../requests/PackagingRequest";

interface FormData {
  clientName: string;
  jobSiteLocation: string;
  serviceType: string;
  acceptsPallets: boolean;
  acceptsCrates: boolean;
  hasLoadingDock: boolean;
  requiresLiftgate: boolean;
  needsInsideDelivery: boolean;
}

export default function GuiPage() {
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<FormData>({
    clientName: "",
    jobSiteLocation: "",
    serviceType: "Delivery + Installation",
    acceptsPallets: true,
    acceptsCrates: false,
    hasLoadingDock: false,
    requiresLiftgate: false,
    needsInsideDelivery: false,
  });
  const [response, setResponse] = useState<PackagingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError("Please select a CSV file");
      return;
    }

    if (!formData.clientName || !formData.jobSiteLocation) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("file", file);
      formDataToSend.append("clientName", formData.clientName);
      formDataToSend.append("jobSiteLocation", formData.jobSiteLocation);
      formDataToSend.append("serviceType", formData.serviceType);
      formDataToSend.append("acceptsPallets", String(formData.acceptsPallets));
      formDataToSend.append("acceptsCrates", String(formData.acceptsCrates));
      formDataToSend.append("hasLoadingDock", String(formData.hasLoadingDock));
      formDataToSend.append("requiresLiftgate", String(formData.requiresLiftgate));
      formDataToSend.append("needsInsideDelivery", String(formData.needsInsideDelivery));

      const res = await fetch("/api/package", {
        method: "POST",
        body: formDataToSend,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to process file");
      }

      const data = await res.json();
      setResponse(data.response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: "2rem" }}>ARCH Design Freight Weight Calculator</h1>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
        <div style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}>
          {/* CSV File Upload */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
              CSV File *
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ padding: "0.5rem", width: "100%", border: "1px solid #ccc", borderRadius: "4px" }}
            />
          </div>

          {/* Client Name */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
              Client Name *
            </label>
            <input
              type="text"
              name="clientName"
              value={formData.clientName}
              onChange={handleInputChange}
              placeholder="e.g., MedStar"
              style={{ padding: "0.5rem", width: "100%", border: "1px solid #ccc", borderRadius: "4px" }}
            />
          </div>

          {/* Job Site Location */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
              Job Site Location *
            </label>
            <input
              type="text"
              name="jobSiteLocation"
              value={formData.jobSiteLocation}
              onChange={handleInputChange}
              placeholder="e.g., Chevy Chase, MD"
              style={{ padding: "0.5rem", width: "100%", border: "1px solid #ccc", borderRadius: "4px" }}
            />
          </div>

          {/* Service Type */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
              Service Type
            </label>
            <select
              name="serviceType"
              value={formData.serviceType}
              onChange={handleInputChange}
              style={{ padding: "0.5rem", width: "100%", border: "1px solid #ccc", borderRadius: "4px" }}
            >
              <option value="Delivery + Installation">Delivery + Installation</option>
              <option value="Delivery Only">Delivery Only</option>
              <option value="Installation Only">Installation Only</option>
            </select>
          </div>

          {/* Delivery Capabilities */}
          <fieldset style={{ border: "1px solid #ccc", borderRadius: "4px", padding: "1rem" }}>
            <legend style={{ fontWeight: "bold" }}>Delivery Capabilities</legend>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  name="acceptsPallets"
                  checked={formData.acceptsPallets}
                  onChange={handleInputChange}
                />
                Accepts Pallets
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  name="acceptsCrates"
                  checked={formData.acceptsCrates}
                  onChange={handleInputChange}
                />
                Accepts Crates
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  name="hasLoadingDock"
                  checked={formData.hasLoadingDock}
                  onChange={handleInputChange}
                />
                Has Loading Dock
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  name="requiresLiftgate"
                  checked={formData.requiresLiftgate}
                  onChange={handleInputChange}
                />
                Requires Liftgate
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  name="needsInsideDelivery"
                  checked={formData.needsInsideDelivery}
                  onChange={handleInputChange}
                />
                Needs Inside Delivery
              </label>
            </div>
          </fieldset>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.75rem 2rem",
            backgroundColor: loading ? "#ccc" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "1rem",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          {loading ? "Processing..." : "Calculate Packaging"}
        </button>
      </form>

      {error && (
        <div style={{ padding: "1rem", backgroundColor: "#fee", border: "1px solid #fcc", borderRadius: "4px", marginBottom: "1rem" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div style={{ border: "1px solid #ccc", borderRadius: "4px", padding: "1.5rem", backgroundColor: "#f9f9f9" }}>
          <h2 style={{ marginTop: 0 }}>Packaging Results</h2>
          
          {/* Work Order Summary */}
          <section style={{ marginBottom: "1.5rem" }}>
            <h3>Work Order Summary</h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              <li><strong>Total Pieces:</strong> {response.workOrderSummary.totalPieces}</li>
              <li><strong>Standard Size Pieces:</strong> {response.workOrderSummary.standardSizePieces}</li>
              <li><strong>Oversized Pieces:</strong> {response.workOrderSummary.oversizedPieces}</li>
            </ul>
          </section>

          {/* Weight Summary */}
          <section style={{ marginBottom: "1.5rem" }}>
            <h3>Weight Summary</h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              <li><strong>Total Artwork Weight:</strong> {response.weightSummary.totalArtworkWeightLbs.toFixed(2)} lbs</li>
              <li><strong>Glass Framed Weight:</strong> {response.weightSummary.glassFramedWeightLbs.toFixed(2)} lbs</li>
              <li><strong>Packaging Weight:</strong> {response.weightSummary.packagingWeightLbs.total.toFixed(2)} lbs</li>
              <li><strong>Final Shipment Weight:</strong> {response.weightSummary.finalShipmentWeightLbs.toFixed(2)} lbs</li>
            </ul>
          </section>

          {/* Packing Summary */}
          <section style={{ marginBottom: "1.5rem" }}>
            <h3>Packing Summary</h3>
            <h4>Box Requirements:</h4>
            <ul>
              {response.packingSummary.boxRequirements.map((box, idx) => (
                <li key={idx}>
                  {box.label} ({box.dimensions}): {box.count}
                </li>
              ))}
            </ul>
            {response.packingSummary.containerRequirements.length > 0 && (
              <>
                <h4>Container Requirements:</h4>
                <ul>
                  {response.packingSummary.containerRequirements.map((container, idx) => (
                    <li key={idx}>
                      {container.label} ({container.dimensions}): {container.count}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* Business Intelligence */}
          {response.businessIntelligence.oversizedItems.length > 0 && (
            <section style={{ marginBottom: "1.5rem" }}>
              <h3>Oversized Items</h3>
              <ul>
                {response.businessIntelligence.oversizedItems.map((item, idx) => (
                  <li key={idx}>
                    {item.dimensions} (Qty: {item.quantity}) - {item.recommendation}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Metadata */}
          <section style={{ fontSize: "0.875rem", color: "#666", marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #ccc" }}>
            <p><strong>Processing Time:</strong> {response.metadata.processingTimeMs}ms</p>
            <p><strong>Algorithm:</strong> {response.metadata.algorithmUsed}</p>
            <p><strong>Timestamp:</strong> {response.metadata.timestamp}</p>
          </section>
        </div>
      )}
    </div>
  );
}
