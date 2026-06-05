import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { endereco } = await request.json();

    if (!endereco) {
      return NextResponse.json(
        { error: "Endereço é obrigatório" },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key do Google Maps não configurada. Por favor, configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY nas variáveis de ambiente." },
        { status: 500 }
      );
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      endereco
    )}&key=${apiKey}&language=pt-BR&region=br`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return NextResponse.json({
        lat: location.lat,
        lng: location.lng,
        formatted_address: data.results[0].formatted_address,
      });
    }

    // Tratar erros específicos do Google Maps API
    if (data.status === "ZERO_RESULTS") {
      return NextResponse.json(
        { error: "Endereço não encontrado. Verifique se o endereço está completo e correto." },
        { status: 404 }
      );
    }

    if (data.status === "REQUEST_DENIED") {
      console.log("[v0] Geocode REQUEST_DENIED - error_message:", data.error_message);
      return NextResponse.json(
        { error: `Erro de autenticação com Google Maps: ${data.error_message || "Verifique se a API Key está correta e se a Geocoding API está habilitada."}` },
        { status: 500 }
      );
    }

    if (data.status === "OVER_QUERY_LIMIT") {
      return NextResponse.json(
        { error: "Limite de requisições do Google Maps atingido. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: `Erro ao buscar endereço: ${data.status}` },
      { status: 404 }
    );
  } catch {
    return NextResponse.json(
      { error: "Erro ao processar geocoding" },
      { status: 500 }
    );
  }
}
