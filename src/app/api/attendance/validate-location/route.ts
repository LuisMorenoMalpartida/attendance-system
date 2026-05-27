import { NextRequest, NextResponse } from 'next/server';

// Coordenadas de la oficina (ejemplo)
const OFFICE_LOCATION = {
  latitude: 19.432608,  // Ciudad de México
  longitude: -99.133209,
  radiusKm: 0.5, // 500 metros de radio permitido
};

function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function POST(req: NextRequest) {
  try {
    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Coordenadas requeridas' },
        { status: 400 }
      );
    }

    const distance = calculateDistance(
      latitude, 
      longitude, 
      OFFICE_LOCATION.latitude, 
      OFFICE_LOCATION.longitude
    );

    const isWithinRadius = distance <= OFFICE_LOCATION.radiusKm;

    return NextResponse.json({
      valid: true,
      distance: Math.round(distance * 1000), // metros
      isWithinRadius,
      message: isWithinRadius 
        ? 'Ubicación válida' 
        : `Estás a ${Math.round(distance * 1000)}m de la oficina (máximo ${OFFICE_LOCATION.radiusKm * 1000}m)`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al validar ubicación' },
      { status: 500 }
    );
  }
}