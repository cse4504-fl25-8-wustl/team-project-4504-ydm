/**
 * API endpoint for packing calculations
 * POST /api/pack
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculatePacking } from '../../pack/actions';
import { PackInputDTO } from '../../pack/domain/dto/PackInputDTO';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate that we have the required fields
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    // Calculate packing
    const result = await calculatePacking(body as PackInputDTO);
    
    // Return successful response
    return NextResponse.json(result, { status: 200 });
    
  } catch (error) {
    console.error('Packing calculation error:', error);
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Packing calculation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to calculate packing.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to calculate packing.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to calculate packing.' },
    { status: 405 }
  );
}
