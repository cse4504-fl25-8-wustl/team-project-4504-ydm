"use client";

import { useState } from "react";
import type { PackagingResponse } from "../responses/PackagingResponse";
import StatusIndicator from "./components/StatusIndicator";
import ErrorDisplay from "./components/ErrorDisplay";
import ReportViews from "./components/ReportViews";

interface FormData {
  clientName: string;
  jobSiteLocation: string;
  serviceType: string;
  packingAlgorithm: string;
  acceptsPallets: boolean;
  acceptsCrates: boolean;
  hasLoadingDock: boolean;
  requiresLiftgate: boolean;
  needsInsideDelivery: boolean;
}

const PACKING_ALGORITHMS = [
  {
    id: "first-fit",
    name: "Pack by Medium",
    description: "Keeps different art types separate. Each box contains only one medium (e.g., only paper prints or only canvas).",
    bestFor: "When you need strict separation of art types for handling or delivery"
  },
  {
    id: "balanced",
    name: "Pack by Strictest Constraint",
    description: "Uses the most restrictive packing limit when mixing art types. Ensures all items fit safely within the tightest constraint.",
    bestFor: "Mixed orders where you want to maximize box utilization while respecting all constraints"
  },
  {
    id: "minimize-boxes",
    name: "Pack by Depth",
    description: "Considers actual physical depth when stacking items. Checks if items will physically fit based on their thickness.",
    bestFor: "When you need realistic physical packing that accounts for item thickness"
  }
];

type ProcessingStatus = "idle" | "uploading" | "processing" | "complete" | "error";

export default function GuiPage() {
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<FormData>({
    clientName: "",
    jobSiteLocation: "",
    serviceType: "Delivery + Installation",
    packingAlgorithm: "first-fit",
    acceptsPallets: true,
    acceptsCrates: false,
    hasLoadingDock: false,
    requiresLiftgate: false,
    needsInsideDelivery: false,
  });
  const [response, setResponse] = useState<PackagingResponse | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null);
  const [showSettingsEditor, setShowSettingsEditor] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError(null);
      setValidationErrors([]);
      
      // Validate file type
      if (!selectedFile.name.endsWith('.csv')) {
        setValidationErrors(["File must be a CSV file"]);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
    setValidationErrors([]);
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];
    
    if (!file) {
      errors.push("CSV file is required");
    }
    if (!formData.clientName.trim()) {
      errors.push("Client name is required");
    }
    if (!formData.jobSiteLocation.trim()) {
      errors.push("Job site location is required");
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setStatus("error");
      return;
    }

    setStatus("uploading");
    setError(null);
    setResponse(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("file", file!);
      formDataToSend.append("clientName", formData.clientName);
      formDataToSend.append("jobSiteLocation", formData.jobSiteLocation);
      formDataToSend.append("serviceType", formData.serviceType);
      formDataToSend.append("packingAlgorithm", formData.packingAlgorithm);
      formDataToSend.append("acceptsPallets", String(formData.acceptsPallets));
      formDataToSend.append("acceptsCrates", String(formData.acceptsCrates));
      formDataToSend.append("hasLoadingDock", String(formData.hasLoadingDock));
      formDataToSend.append("requiresLiftgate", String(formData.requiresLiftgate));
      formDataToSend.append("needsInsideDelivery", String(formData.needsInsideDelivery));

      setStatus("processing");

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
      setStatus("complete");
      setLastUploadedFile(file); // Save for re-processing
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during processing");
      setStatus("error");
    }
  };

  const reprocessWithCurrentSettings = async () => {
    if (!lastUploadedFile) return;
    
    setStatus("processing");
    setError(null);
    setShowSettingsEditor(false);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("file", lastUploadedFile);
      formDataToSend.append("clientName", formData.clientName);
      formDataToSend.append("jobSiteLocation", formData.jobSiteLocation);
      formDataToSend.append("serviceType", formData.serviceType);
      formDataToSend.append("packingAlgorithm", formData.packingAlgorithm);
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
      setStatus("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during processing");
      setStatus("error");
    }
  };

  const switchPackingMethod = async (newAlgorithm: string) => {
    if (!lastUploadedFile) return;
    
    // Update the algorithm
    setFormData(prev => ({ ...prev, packingAlgorithm: newAlgorithm }));
    
    // Re-process with new algorithm
    setStatus("processing");
    setError(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("file", lastUploadedFile);
      formDataToSend.append("clientName", formData.clientName);
      formDataToSend.append("jobSiteLocation", formData.jobSiteLocation);
      formDataToSend.append("serviceType", formData.serviceType);
      formDataToSend.append("packingAlgorithm", newAlgorithm);
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
      setStatus("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during processing");
      setStatus("error");
    }
  };

  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [csvPreviewContent, setCsvPreviewContent] = useState("");

  const generateCSVContent = (): string => {
    if (!response) return "";
    
    let csvContent = "";
    const date = new Date();
    
    // Professional Header with better formatting
    csvContent += `"PACKAGING ESTIMATE"\n`;
    csvContent += `"ARCH Freight Calculator"\n`;
    csvContent += `\n`;
    csvContent += `"Report Generated:","${date.toLocaleDateString()} at ${date.toLocaleTimeString()}"\n`;
    csvContent += `\n`;
    
    // Client Info - Better formatted
    csvContent += `"━━━ CLIENT INFORMATION ━━━"\n`;
    csvContent += `"Client Name:","${formData.clientName}"\n`;
    csvContent += `"Job Site:","${formData.jobSiteLocation}"\n`;
    csvContent += `"Service Type:","${formData.serviceType}"\n`;
    csvContent += `\n`;
    
    // Quick Summary Box
    csvContent += `"━━━ SUMMARY ━━━"\n`;
    csvContent += `"Metric","Value"\n`;
    csvContent += `"Total Pieces","${response.workOrderSummary.totalPieces}"\n`;
    csvContent += `"Total Weight","${response.weightSummary.finalShipmentWeightLbs.toFixed(0)} lbs"\n`;
    csvContent += `"Boxes Needed","${response.packingSummary.boxRequirements.reduce((sum, box) => sum + box.count, 0)}"\n`;
    if (response.packingSummary.containerRequirements.length > 0) {
      csvContent += `"Pallets/Crates","${response.packingSummary.containerRequirements.reduce((sum, c) => sum + c.count, 0)}"\n`;
    }
    csvContent += `"Packing Algorithm","${response.metadata.algorithmUsed}"\n`;
    csvContent += `\n`;
    
    // Box Contents Summary with Detailed Instructions
    csvContent += `"━━━ BOX PACKING GUIDE ━━━"\n`;
    response.packingSummary.boxContents.forEach(box => {
      csvContent += `\n`;
      csvContent += `"${box.label}"\n`;
      csvContent += `"Contents:","",""\n`;
      box.contents.forEach(c => {
        csvContent += `"  ${c.quantity}x ${c.productType}","Items: ${c.itemIds.join(', ')}",""\n`;
      });
      csvContent += `"Total Pieces:","${box.totalPieces}",""\n`;
      
      if (box.specialHandling.length > 0) {
        csvContent += `"","",""\n`;
        csvContent += `"SPECIAL HANDLING:","",""\n`;
        box.specialHandling.forEach(note => {
          csvContent += `"  ⚠ ${note}","",""\n`;
        });
      }
      
      csvContent += `"","",""\n`;
      csvContent += `"PACKING INSTRUCTIONS:","",""\n`;
      box.packingInstructions.forEach((instruction, idx) => {
        csvContent += `"  ${idx + 1}. ${instruction}","",""\n`;
      });
      csvContent += `"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"\n`;
    });
    csvContent += `\n`;
    
    // Detailed Breakdown
    csvContent += `"━━━ ARTWORK BREAKDOWN ━━━"\n`;
    csvContent += `"Category","Pieces","Percentage"\n`;
    const totalPieces = response.workOrderSummary.totalPieces;
    csvContent += `"Standard Size","${response.workOrderSummary.standardSizePieces}","${((response.workOrderSummary.standardSizePieces/totalPieces)*100).toFixed(0)}%"\n`;
    csvContent += `"Oversized","${response.workOrderSummary.oversizedPieces}","${((response.workOrderSummary.oversizedPieces/totalPieces)*100).toFixed(0)}%"\n`;
    csvContent += `\n`;
    
    // Oversized Details
    if (response.workOrderSummary.oversizedDetails.length > 0) {
      csvContent += `"━━━ OVERSIZED ITEMS ━━━"\n`;
      csvContent += `"Size","Qty","Weight"\n`;
      response.workOrderSummary.oversizedDetails.forEach(detail => {
        csvContent += `"${detail.dimensions}","${detail.quantity}","${detail.weightLbs.toFixed(0)} lbs"\n`;
      });
      csvContent += `\n`;
    }
    
    // Packaging
    csvContent += `"━━━ PACKAGING MATERIALS ━━━"\n`;
    csvContent += `"Type","Size","Qty"\n`;
    response.packingSummary.boxRequirements.forEach(box => {
      csvContent += `"${box.label}","${box.dimensions}","${box.count}"\n`;
    });
    csvContent += `\n`;
    
    
    // Containers
    if (response.packingSummary.containerRequirements.length > 0) {
      csvContent += `"━━━ SHIPPING CONTAINERS ━━━"\n`;
      csvContent += `"Type","Size","Qty"\n`;
      response.packingSummary.containerRequirements.forEach(container => {
        csvContent += `"${container.label}","${container.dimensions}","${container.count}"\n`;
      });
      csvContent += `\n`;
    }
    
    // Weight Analysis
    csvContent += `"━━━ WEIGHT DISTRIBUTION ━━━"\n`;
    csvContent += `"Component","Weight","Percent"\n`;
    const totalWeight = response.weightSummary.finalShipmentWeightLbs;
    const artworkWeight = response.weightSummary.totalArtworkWeightLbs;
    const packagingWeight = response.weightSummary.packagingWeightLbs.total;
    csvContent += `Artwork,${artworkWeight.toFixed(0)} lbs,${((artworkWeight/totalWeight)*100).toFixed(0)}%\n`;
    csvContent += `Packaging,${packagingWeight.toFixed(0)} lbs,${((packagingWeight/totalWeight)*100).toFixed(0)}%\n`;
    
    if (response.weightSummary.packagingWeightLbs.pallets.count > 0) {
      csvContent += `  Pallets,${response.weightSummary.packagingWeightLbs.pallets.totalWeight.toFixed(0)} lbs,\n`;
    }
    if (response.weightSummary.packagingWeightLbs.crates.count > 0) {
      csvContent += `  Crates,${response.weightSummary.packagingWeightLbs.crates.totalWeight.toFixed(0)} lbs,\n`;
    }
    csvContent += `TOTAL,${totalWeight.toFixed(0)} lbs,100%\n`;
    csvContent += `\n`;
    
    // Special Handling
    if (response.businessIntelligence.oversizedItems.length > 0) {
      csvContent += `"━━━ ⚠ SPECIAL HANDLING ━━━"\n`;
      csvContent += `"Size","Qty","Action Required"\n`;
      response.businessIntelligence.oversizedItems.forEach(item => {
        csvContent += `"${item.dimensions}","${item.quantity}","${item.recommendation}"\n`;
      });
      csvContent += `\n`;
    }
    
    // Shipping Details
    if (response.freightExport) {
      csvContent += `"━━━ SHIPPING DETAILS ━━━"\n`;
      csvContent += `"Item","Information"\n`;
      csvContent += `"Total Weight","${totalWeight.toFixed(0)} lbs"\n`;
      
      const palletCount = response.packingSummary.containerRequirements.length;
      if (palletCount > 0) {
        csvContent += `"Pallet Count","${palletCount}"\n`;
      }
      
      response.freightExport.shipmentDetails.forEach(detail => {
        if (detail.includes('Dimensions:')) {
          csvContent += `"Dimensions","${detail.replace('Dimensions:', '').trim()}"\n`;
        } else if (detail.includes('Pickup:')) {
          csvContent += `"Pickup","${detail.replace('Pickup:', '').trim()}"\n`;
        } else if (detail.includes('Delivery:')) {
          csvContent += `"Delivery","${detail.replace('Delivery:', '').trim()}"\n`;
        }
      });
      csvContent += `\n`;
      
      csvContent += `"━━━ DELIVERY REQUIREMENTS ━━━"\n`;
      csvContent += `"Requirement","Status"\n`;
      csvContent += `"Accepts Pallets","${formData.acceptsPallets ? 'Yes' : 'No'}"\n`;
      csvContent += `"Loading Dock","${formData.hasLoadingDock ? 'Available' : 'Not Available'}"\n`;
      csvContent += `"Liftgate","${formData.requiresLiftgate ? 'Required' : 'Not Required'}"\n`;
      csvContent += `"Inside Delivery","${formData.needsInsideDelivery ? 'Required' : 'Not Required'}"\n`;
      csvContent += `\n`;
    }
    
    // Footer
    csvContent += `"━━━ REPORT INFORMATION ━━━"\n`;
    csvContent += `"Generated By","ARCH Freight Calculator"\n`;
    csvContent += `"Processing Time","${response.metadata.processingTimeMs}ms"\n`;
    csvContent += `"Algorithm","${response.metadata.algorithmUsed}"\n`;
    if (response.metadata.warnings.length > 0) {
      csvContent += `"Warnings","${response.metadata.warnings.join('; ')}"\n`;
    }
    
    return csvContent;
  };

  const downloadCSVReport = () => {
    const csvContent = generateCSVContent();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    // Create proper filename with title case
    const clientName = formData.clientName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    a.download = `PackagingEstimate-${clientName}-${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const previewCSVReport = () => {
    const csvContent = generateCSVContent();
    // Remove quotes for better readability in preview
    const readableContent = csvContent
      .replace(/^"|"$/gm, '') // Remove quotes at start/end of lines
      .replace(/","/g, ' | ') // Replace "," with |
      .replace(/"/g, ''); // Remove remaining quotes
    setCsvPreviewContent(readableContent);
    setShowCsvPreview(true);
  };

  const resetForm = () => {
    setFile(null);
    setResponse(null);
    setStatus("idle");
    setError(null);
    setValidationErrors([]);
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#f8fafc",
      padding: "0"
    }}>
      <div style={{ 
        maxWidth: "1400px", 
        margin: "0 auto",
        minHeight: "100vh"
      }}>
        {/* Header */}
        <div style={{ 
          background: "white",
          borderBottom: "1px solid #e2e8f0",
          padding: "1.5rem 2rem",
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "blur(8px)",
          backgroundColor: "rgba(255, 255, 255, 0.95)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ 
                width: "40px", 
                height: "40px", 
                background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              </div>
              <div>
                <h1 style={{ 
                  margin: 0, 
                  fontSize: "1.5rem", 
                  fontWeight: "700", 
                  color: "#0f172a",
                  letterSpacing: "-0.02em"
                }}>
                  ARCH Freight Calculator
                </h1>
                <p style={{ 
                  margin: "0.125rem 0 0 0", 
                  fontSize: "0.875rem", 
                  color: "#64748b",
                  fontWeight: "400"
                }}>
                  Professional packaging estimation
                </p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "2rem" }}>
          {/* Status Indicator */}
          <StatusIndicator status={status} />

          {/* Error Display */}
          <ErrorDisplay error={error} validationErrors={validationErrors} />

          {/* Input Form - Only show when not complete */}
          {status !== "complete" && (
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "2rem",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
              border: "1px solid #e2e8f0"
            }}>
              <h2 style={{ 
                margin: "0 0 1.5rem 0", 
                fontSize: "1.25rem", 
                fontWeight: "600", 
                color: "#0f172a" 
              }}>
                New Estimate
              </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1.25rem", 
                marginBottom: "1.5rem" 
              }}>
                {/* CSV File Upload */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "0.5rem", 
                    fontWeight: "500",
                    fontSize: "0.875rem",
                    color: "#334155"
                  }}>
                    CSV File <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div style={{ 
                    position: "relative",
                    border: "2px dashed #cbd5e1",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    textAlign: "center",
                    background: "#f8fafc",
                    transition: "all 0.2s ease",
                    cursor: "pointer"
                  }}>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      style={{ 
                        position: "absolute",
                        inset: 0,
                        opacity: 0,
                        cursor: "pointer",
                        width: "100%",
                        height: "100%"
                      }}
                    />
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ margin: "0 auto 0.5rem" }}>
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                    <p style={{ margin: 0, color: "#334155", fontWeight: "500", fontSize: "0.875rem" }}>
                      {file ? `📄 ${file.name}` : "Drop file here or click to browse"}
                    </p>
                    <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                      CSV format only
                    </p>
                  </div>
                </div>

                {/* Client Name */}
                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "0.5rem", 
                    fontWeight: "500",
                    fontSize: "0.875rem",
                    color: "#334155"
                  }}>
                    Client Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    placeholder="e.g., MedStar"
                    style={{ 
                      padding: "0.625rem 0.875rem", 
                      width: "100%", 
                      border: "1px solid #cbd5e1", 
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      transition: "border-color 0.15s ease",
                      outline: "none",
                      background: "white"
                    }}
                  />
                </div>

                {/* Job Site Location */}
                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "0.5rem", 
                    fontWeight: "500",
                    fontSize: "0.875rem",
                    color: "#334155"
                  }}>
                    Job Site Location <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="jobSiteLocation"
                    value={formData.jobSiteLocation}
                    onChange={handleInputChange}
                    placeholder="e.g., Chevy Chase, MD"
                    style={{ 
                      padding: "0.625rem 0.875rem", 
                      width: "100%", 
                      border: "1px solid #cbd5e1", 
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      transition: "border-color 0.15s ease",
                      outline: "none",
                      background: "white"
                    }}
                  />
                </div>

                {/* Service Type */}
                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "0.5rem", 
                    fontWeight: "500",
                    fontSize: "0.875rem",
                    color: "#334155"
                  }}>
                    Service Type
                  </label>
                  <select
                    name="serviceType"
                    value={formData.serviceType}
                    onChange={handleInputChange}
                    style={{ 
                      padding: "0.625rem 0.875rem", 
                      width: "100%", 
                      border: "1px solid #cbd5e1", 
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      transition: "border-color 0.15s ease",
                      outline: "none",
                      background: "white",
                      cursor: "pointer"
                    }}
                  >
                    <option value="Delivery + Installation">Delivery + Installation</option>
                    <option value="Delivery Only">Delivery Only</option>
                    <option value="Installation Only">Installation Only</option>
                  </select>
                </div>

                {/* Packing Algorithm */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "0.75rem", 
                    fontWeight: "500",
                    fontSize: "0.875rem",
                    color: "#334155"
                  }}>
                    Packing Method
                  </label>
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "0.75rem" 
                  }}>
                    {PACKING_ALGORITHMS.map((algo) => (
                      <label
                        key={algo.id}
                        style={{
                          display: "block",
                          padding: "1rem",
                          border: formData.packingAlgorithm === algo.id ? "2px solid #2563eb" : "2px solid #e2e8f0",
                          borderRadius: "8px",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          background: formData.packingAlgorithm === algo.id ? "#eff6ff" : "white",
                        }}
                      >
                        <input
                          type="radio"
                          name="packingAlgorithm"
                          value={algo.id}
                          checked={formData.packingAlgorithm === algo.id}
                          onChange={handleInputChange}
                          style={{ display: "none" }}
                        />
                        <div style={{ display: "flex", alignItems: "start", gap: "0.75rem" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              fontWeight: "600", 
                              color: "#0f172a",
                              marginBottom: "0.25rem",
                              fontSize: "0.875rem"
                            }}>
                              {algo.name}
                            </div>
                            <div style={{ 
                              fontSize: "0.75rem", 
                              color: "#64748b",
                              marginBottom: "0.5rem",
                              lineHeight: "1.4"
                            }}>
                              {algo.description}
                            </div>
                            <div style={{ 
                              fontSize: "0.7rem", 
                              color: "#2563eb",
                              fontWeight: "500"
                            }}>
                              Best for: {algo.bestFor}
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Delivery Capabilities */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <fieldset style={{ 
                    border: "1px solid #cbd5e1", 
                    borderRadius: "8px", 
                    padding: "1.25rem",
                    background: "#f8fafc"
                  }}>
                    <legend style={{ 
                      fontWeight: "500", 
                      fontSize: "0.875rem", 
                      color: "#334155",
                      padding: "0 0.5rem"
                    }}>
                      Delivery Capabilities
                    </legend>
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "1rem" 
                    }}>
                      <label style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "0.75rem",
                        cursor: "pointer",
                        padding: "0.5rem",
                        borderRadius: "6px",
                        transition: "background 0.2s"
                      }}>
                        <input
                          type="checkbox"
                          name="acceptsPallets"
                          checked={formData.acceptsPallets}
                          onChange={handleInputChange}
                          style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                        <span style={{ fontWeight: "500", color: "#374151" }}>Accepts Pallets</span>
                      </label>
                      <label style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "0.75rem",
                        cursor: "pointer",
                        padding: "0.5rem",
                        borderRadius: "6px",
                        transition: "background 0.2s"
                      }}>
                        <input
                          type="checkbox"
                          name="acceptsCrates"
                          checked={formData.acceptsCrates}
                          onChange={handleInputChange}
                          style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                        <span style={{ fontWeight: "500", color: "#374151" }}>Accepts Crates</span>
                      </label>
                      <label style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "0.75rem",
                        cursor: "pointer",
                        padding: "0.5rem",
                        borderRadius: "6px",
                        transition: "background 0.2s"
                      }}>
                        <input
                          type="checkbox"
                          name="hasLoadingDock"
                          checked={formData.hasLoadingDock}
                          onChange={handleInputChange}
                          style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                        <span style={{ fontWeight: "500", color: "#374151" }}>Has Loading Dock</span>
                      </label>
                      <label style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "0.75rem",
                        cursor: "pointer",
                        padding: "0.5rem",
                        borderRadius: "6px",
                        transition: "background 0.2s"
                      }}>
                        <input
                          type="checkbox"
                          name="requiresLiftgate"
                          checked={formData.requiresLiftgate}
                          onChange={handleInputChange}
                          style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                        <span style={{ fontWeight: "500", color: "#374151" }}>Requires Liftgate</span>
                      </label>
                      <label style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "0.75rem",
                        cursor: "pointer",
                        padding: "0.5rem",
                        borderRadius: "6px",
                        transition: "background 0.2s"
                      }}>
                        <input
                          type="checkbox"
                          name="needsInsideDelivery"
                          checked={formData.needsInsideDelivery}
                          onChange={handleInputChange}
                          style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                        <span style={{ fontWeight: "500", color: "#374151" }}>Needs Inside Delivery</span>
                      </label>
                    </div>
                  </fieldset>
                </div>
              </div>

              <button
                type="submit"
                disabled={status === "uploading" || status === "processing"}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: (status === "uploading" || status === "processing") ? "#94a3b8" : "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  cursor: (status === "uploading" || status === "processing") ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  boxShadow: (status === "uploading" || status === "processing") ? "none" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                  transition: "all 0.15s ease",
                  width: "100%"
                }}
              >
                {status === "uploading" || status === "processing" ? "Processing..." : "Calculate Estimate"}
              </button>
            </form>
            </div>
          )}

          {/* CSV Preview Modal */}
          {showCsvPreview && (
            <div style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "2rem"
            }}>
              <div style={{
                background: "white",
                borderRadius: "12px",
                maxWidth: "900px",
                width: "100%",
                maxHeight: "80vh",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
              }}>
                <div style={{
                  padding: "1.5rem",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}>CSV Report Preview</h3>
                  <button
                    onClick={() => setShowCsvPreview(false)}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "1.5rem",
                      cursor: "pointer",
                      color: "#64748b",
                      padding: "0.25rem"
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{
                  padding: "1.5rem",
                  overflow: "auto",
                  flex: 1
                }}>
                  <pre style={{
                    background: "#f8fafc",
                    padding: "1rem",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    lineHeight: "1.5",
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word"
                  }}>
                    {csvPreviewContent}
                  </pre>
                </div>
                <div style={{
                  padding: "1.5rem",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "flex-end"
                }}>
                  <button
                    onClick={downloadCSVReport}
                    style={{
                      padding: "0.625rem 1.25rem",
                      background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                      fontWeight: "600"
                    }}
                  >
                    Download CSV
                  </button>
                  <button
                    onClick={() => setShowCsvPreview(false)}
                    style={{
                      padding: "0.625rem 1.25rem",
                      background: "white",
                      color: "#64748b",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                      fontWeight: "600"
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Settings Editor Modal */}
          {showSettingsEditor && status === "complete" && (
            <div style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "2rem"
            }}>
              <div style={{
                background: "white",
                borderRadius: "12px",
                maxWidth: "600px",
                width: "100%",
                maxHeight: "80vh",
                overflow: "auto",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
              }}>
                <div style={{
                  padding: "1.5rem",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}>Edit Settings</h3>
                  <button
                    onClick={() => setShowSettingsEditor(false)}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "1.5rem",
                      cursor: "pointer",
                      color: "#64748b"
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ padding: "1.5rem" }}>
                  <div style={{ display: "grid", gap: "1.5rem" }}>
                    {/* Service Type */}
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "0.875rem" }}>
                        Service Type
                      </label>
                      <select
                        name="serviceType"
                        value={formData.serviceType}
                        onChange={handleInputChange}
                        style={{ padding: "0.625rem", width: "100%", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                      >
                        <option value="Delivery + Installation">Delivery + Installation</option>
                        <option value="Delivery Only">Delivery Only</option>
                        <option value="Installation Only">Installation Only</option>
                      </select>
                    </div>

                    {/* Delivery Capabilities */}
                    <div>
                      <div style={{ fontWeight: "500", marginBottom: "0.75rem", fontSize: "0.875rem" }}>
                        Delivery Capabilities
                      </div>
                      <div style={{ display: "grid", gap: "0.75rem" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            name="acceptsPallets"
                            checked={formData.acceptsPallets}
                            onChange={handleInputChange}
                          />
                          <span style={{ fontSize: "0.875rem" }}>Accepts Pallets</span>
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            name="acceptsCrates"
                            checked={formData.acceptsCrates}
                            onChange={handleInputChange}
                          />
                          <span style={{ fontSize: "0.875rem" }}>Accepts Crates</span>
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            name="hasLoadingDock"
                            checked={formData.hasLoadingDock}
                            onChange={handleInputChange}
                          />
                          <span style={{ fontSize: "0.875rem" }}>Has Loading Dock</span>
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            name="requiresLiftgate"
                            checked={formData.requiresLiftgate}
                            onChange={handleInputChange}
                          />
                          <span style={{ fontSize: "0.875rem" }}>Requires Liftgate</span>
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            name="needsInsideDelivery"
                            checked={formData.needsInsideDelivery}
                            onChange={handleInputChange}
                          />
                          <span style={{ fontSize: "0.875rem" }}>Needs Inside Delivery</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{
                  padding: "1.5rem",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "flex-end"
                }}>
                  <button
                    onClick={() => setShowSettingsEditor(false)}
                    style={{
                      padding: "0.625rem 1.25rem",
                      background: "white",
                      color: "#64748b",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "600"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={reprocessWithCurrentSettings}
                    style={{
                      padding: "0.625rem 1.25rem",
                      background: "#2563eb",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "600"
                    }}
                  >
                    Apply & Recalculate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Report Views - Only show when complete */}
          {status === "complete" && response && (
            <ReportViews
              response={response}
              onDownloadCSV={downloadCSVReport}
              onPreviewCSV={previewCSVReport}
              onReset={resetForm}
              currentAlgorithm={formData.packingAlgorithm}
              onSwitchAlgorithm={switchPackingMethod}
              onEditSettings={() => setShowSettingsEditor(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
