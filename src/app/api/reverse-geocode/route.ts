import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json(
      { success: false, error: "Missing latitude or longitude" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
      {
        headers: {
          "User-Agent": "SewaKhoj/1.0 (https://sewakhoj.com)",
          "Accept-Language": "ne,en",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API responded with status: ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch address details" },
      { status: 500 }
    );
  }
}
