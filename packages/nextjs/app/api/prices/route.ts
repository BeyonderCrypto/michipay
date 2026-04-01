import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=starknet&vs_currencies=usd,mxn",
      {
        // Cachear en el servidor por 5 minutos para evitar Rate Limits de la IP del servidor
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko respondió con estado: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error en la API de precios proxy:", error.message);
    // Si CoinGecko falla (Rate Limit / CORS block para el usuario), nuestro backend devuelve una tasa de respaldo
    // para que la dApp siga funcionando en modo testnet/desarrollo
    return NextResponse.json(
      { starknet: { usd: 0.5, mxn: 10.0 } },
      { status: 200 }
    );
  }
}
