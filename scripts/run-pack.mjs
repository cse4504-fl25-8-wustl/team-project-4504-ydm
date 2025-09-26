#!/usr/bin/env node

/**
 * CLI runner for packing calculations
 * Usage: node run-pack.mjs <input-file.json>
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Example input data based on real project examples
const EXAMPLE_INPUT = {
  workOrder: "WO-21234",
  clientName: "OLG Ortho Sports",
  jobSiteLocation: "Chevy Chase, MD",
  deliveryCapabilities: {
    acceptsPallets: true,
    acceptsCrates: true,
    loadingDockAccess: true,
    liftgateRequired: false,
    insideDeliveryNeeded: false
  },
  serviceType: "Delivery + Installation",
  items: [
    // Standard pieces (49 pieces estimated at 43" x 33")
    ...Array.from({ length: 49 }, (_, i) => ({
      lineNumber: i + 1,
      quantity: 1,
      tagNumber: i + 1,
      finalMedium: "Paper Print - Framed",
      outsideSizeWidth: 43,
      outsideSizeHeight: 33,
      glazing: "Regular Glass",
      frame1Moulding: "26930-BX",
      hardware: "3 pt Sec"
    })),
    // Oversized pieces
    {
      lineNumber: 50,
      quantity: 2,
      tagNumber: 50,
      finalMedium: "Paper Print - Framed",
      outsideSizeWidth: 46,
      outsideSizeHeight: 34,
      glazing: "Regular Glass",
      frame1Moulding: "26930-BX",
      hardware: "4 pt Sec"
    },
    {
      lineNumber: 51,
      quantity: 1,
      tagNumber: 51,
      finalMedium: "Paper Print - Framed",
      outsideSizeWidth: 56,
      outsideSizeHeight: 32,
      glazing: "Regular Glass",
      frame1Moulding: "26930-BX",
      hardware: "4 pt Sec"
    },
    {
      lineNumber: 52,
      quantity: 3,
      tagNumber: 52,
      finalMedium: "Paper Print - Framed",
      outsideSizeWidth: 48,
      outsideSizeHeight: 32,
      glazing: "Regular Glass",
      frame1Moulding: "26930-BX",
      hardware: "4 pt Sec"
    }
  ]
};

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node run-pack.mjs <input-file.json>');
    console.log('Or: node run-pack.mjs --example (to run with example data)');
    console.log('Or: node run-pack.mjs --check-server (to check if dev server is running)');
    console.log('');
    console.log('Note: This script calls the localhost API, so make sure the dev server is running:');
    console.log('  npm run dev');
    process.exit(1);
  }
  
  let inputData;
  
  if (args[0] === '--example') {
    console.log('Running with example data (WO-21234 - OLG Ortho Sports)...');
    inputData = EXAMPLE_INPUT;
  } else if (args[0] === '--check-server') {
    console.log('Checking if development server is running...');
    try {
      const response = await fetch('http://localhost:3000/api/pack', { method: 'GET' });
      if (response.status === 405) {
        console.log('✅ Development server is running!');
        console.log('You can now run: node run-pack.mjs --example');
      } else {
        console.log('⚠️  Server responded with unexpected status:', response.status);
      }
    } catch (error) {
      console.log('❌ Development server is not running.');
      console.log('Please start it with: npm run dev');
    }
    process.exit(0);
  } else {
    const inputFile = args[0];
    try {
      const fileContent = readFileSync(inputFile, 'utf8');
      inputData = JSON.parse(fileContent);
    } catch (error) {
      console.error(`Error reading input file: ${error.message}`);
      process.exit(1);
    }
  }
  
  try {
    console.log('Calculating packing solution...');
    console.log(`Work Order: ${inputData.workOrder}`);
    console.log(`Client: ${inputData.clientName}`);
    console.log(`Items: ${inputData.items.length} line items`);
    
    // Call the actual API endpoint
    const result = await callPackingAPI(inputData);
    
    // Output results
    console.log('\n=== PACKING CALCULATION RESULTS ===');
    console.log(`Total Pieces: ${result.totalPieces}`);
    console.log(`Total Artwork Weight: ${result.weightSummary.totalArtworkWeight} lbs`);
    console.log(`Total Packaging Weight: ${result.weightSummary.totalPackagingWeight} lbs`);
    console.log(`Final Shipment Weight: ${result.weightSummary.finalShipmentWeight} lbs`);
    
    console.log('\n=== PACKING SUMMARY ===');
    console.log(`Standard Boxes: ${result.packingSummary.boxRequirements.standardBoxes}`);
    console.log(`Large Boxes: ${result.packingSummary.boxRequirements.largeBoxes}`);
    console.log(`Total Boxes: ${result.packingSummary.boxRequirements.totalBoxes}`);
    console.log(`Standard Pallets: ${result.packingSummary.containerRequirements.standardPallets}`);
    console.log(`Oversize Pallets: ${result.packingSummary.containerRequirements.oversizePallets}`);
    console.log(`Crates: ${result.packingSummary.containerRequirements.crates}`);
    
    console.log('\n=== COST ESTIMATE ===');
    console.log(`Estimated Cost: $${result.cost.estimatedCost}`);
    
    console.log('\n=== BUSINESS INTELLIGENCE ===');
    if (result.businessIntelligence.oversizedItemsFlagged.length > 0) {
      console.log('Oversized Items:');
      result.businessIntelligence.oversizedItemsFlagged.forEach(item => {
        console.log(`  - ${item.dimensions} (Qty: ${item.quantity}) = ${item.weight} lbs`);
      });
    }
    
    if (result.businessIntelligence.riskFlags.length > 0) {
      console.log('Risk Flags:');
      result.businessIntelligence.riskFlags.forEach(flag => {
        console.log(`  - ${flag}`);
      });
    }
    
    // Save results to file
    const outputFile = `packing-result-${inputData.workOrder}.json`;
    writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`\nResults saved to: ${outputFile}`);
    
  } catch (error) {
    console.error('Error calculating packing:', error.message);
    process.exit(1);
  }
}

/**
 * Call the actual packing API endpoint
 */
async function callPackingAPI(inputData) {
  const apiUrl = 'http://localhost:3000/api/pack';
  
  try {
    console.log('Calling packing API...');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inputData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ API call successful!');
    return result;
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`Cannot connect to API at ${apiUrl}. Make sure the development server is running:\n  npm run dev`);
    }
    throw error;
  }
}

// Note: Helper functions removed - now using real API implementation

// Run the CLI
main().catch(console.error);
