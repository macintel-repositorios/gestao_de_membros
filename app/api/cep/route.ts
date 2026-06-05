import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cep = searchParams.get("cep");

    if (!cep) {
      return NextResponse.json(
        { error: "CEP é obrigatório" },
        { status: 400 }
      );
    }

    // Remove non-digits
    const cleanCep = cep.replace(/\D/g, "");

    if (cleanCep.length !== 8) {
      return NextResponse.json(
        { error: "CEP inválido" },
        { status: 400 }
      );
    }

    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();

    if (data.erro) {
      return NextResponse.json(
        { error: "CEP não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      logradouro: data.logradouro || "",
      bairro: data.bairro || "",
      cidade: data.localidade || "",
      estado: data.uf || "",
    });
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    return NextResponse.json(
      { error: "Erro ao buscar CEP" },
      { status: 500 }
    );
  }
}
