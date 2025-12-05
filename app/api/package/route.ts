import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { PackagingService } from "../../services/PackagingService";
import type { DeliveryCapabilities } from "../../requests/PackagingRequest";

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Extract form data
    const clientName = formData.get("clientName") as string;
    const jobSiteLocation = formData.get("jobSiteLocation") as string;
    const serviceType = formData.get("serviceType") as string;
    const packingAlgorithm = (formData.get("packingAlgorithm") as string) || "first-fit";
    const acceptsPallets = formData.get("acceptsPallets") === "true";
    const acceptsCrates = formData.get("acceptsCrates") === "true";
    const hasLoadingDock = formData.get("hasLoadingDock") === "true";
    const requiresLiftgate = formData.get("requiresLiftgate") === "true";
    const needsInsideDelivery = formData.get("needsInsideDelivery") === "true";

    if (!clientName || !jobSiteLocation || !serviceType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Save uploaded file to temp directory
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Generate unique temp filename
    const tempFileName = `upload-${randomBytes(16).toString("hex")}.csv`;
    tempFilePath = join(tmpdir(), tempFileName);
    
    await writeFile(tempFilePath, buffer);

    // Build delivery capabilities
    const deliveryCapabilities: DeliveryCapabilities = {
      acceptsPallets,
      acceptsCrates,
      hasLoadingDock,
      requiresLiftgate,
      needsInsideDelivery,
    };

    // Run packaging job
    const result = await PackagingService.runPackagingJob({
      csvFilePath: tempFilePath,
      clientName,
      jobSiteLocation,
      serviceType,
      deliveryCapabilities,
      packingAlgorithm,
      quiet: true,
    });

    // Clean up temp file
    if (tempFilePath) {
      await unlink(tempFilePath);
      tempFilePath = null;
    }

    return NextResponse.json({
      response: result.response,
      artItemCount: result.artItemCount,
      totalPieceCount: result.totalPieceCount,
    });
  } catch (error) {
    // Clean up temp file on error
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch {
        // Ignore cleanup errors
      }
    }

    console.error("Error processing packaging request:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
