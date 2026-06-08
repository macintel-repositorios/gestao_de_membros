"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { MembroForm } from "@/components/membros/membro-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Membro } from "@/lib/types";

export default function EditarMembroPage() {
  const params = useParams();
  const router = useRouter();
  const { igrejaId, unidadesAcessiveis } = useAuth();
  const [membro, setMembro] = useState<Membro | null>(null);
  const [membroUnidadeId, setMembroUnidadeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!igrejaId || unidadesAcessiveis.length === 0) {
      setLoading(false);
      return;
    }

    async function loadMembro() {
      try {
        const { data, error } = await supabase
          .from("membros")
          .select("*")
          .eq("id", params.id as string)
          .eq("igreja_id", igrejaId)
          .in("unidade_id", unidadesAcessiveis)
          .single();
          
        if (error || !data) {
          router.push("/membros");
          return;
        }

        const m: Membro = {
          id: data.id,
          nome: data.nome,
          tipo: data.tipo as any,
          cargo: data.cargo as any,
          cargoDescricao: data.cargo_descricao || "",
          telefone: data.telefone || "",
          email: data.email || "",
          fotoUrl: data.foto_url || "",
          ativo: data.ativo,
          observacoes: data.observacoes || "",
          dataNascimento: data.data_nascimento ? { toDate: () => new Date(data.data_nascimento + "T12:00:00") } : undefined,
          dataCadastro: data.data_cadastro ? { toDate: () => new Date(data.data_cadastro + "T12:00:00") } : { toDate: () => new Date() },
          dataBatismo: data.data_batismo ? { toDate: () => new Date(data.data_batismo + "T12:00:00") } : undefined,
          unidadeId: data.unidade_id,
          coordenadas: data.latitude && data.longitude ? { lat: data.latitude, lng: data.longitude } : { lat: 0, lng: 0 },
          endereco: {
            logradouro: data.logradouro || "",
            numero: data.numero || "",
            complemento: data.complemento || "",
            bairro: data.bairro || "",
            cidade: data.cidade || "",
            estado: data.estado || "",
            cep: data.cep || "",
          },
          criadoPor: data.criado_por || "",
        };

        setMembro(m);
        setMembroUnidadeId(data.unidade_id);
      } catch (error) {
        console.error("Erro ao carregar membro:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMembro();
  }, [params.id, router, igrejaId, unidadesAcessiveis]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!membro) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar Membro</h1>
        <p className="text-muted-foreground">
          Atualize os dados de {membro.nome}
        </p>
      </div>

      <MembroForm membro={membro} unidadeIdParam={membroUnidadeId || undefined} />
    </div>
  );
}
