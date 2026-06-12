import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();

    // Update booking status in database

    return NextResponse.json(
      { success: true, message: 'Booking accepted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error accepting booking:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to accept booking' },
      { status: 500 }
    );
  }
}
