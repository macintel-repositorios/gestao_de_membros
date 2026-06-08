"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Familia } from "@/lib/types";
import { FamiliaForm } from "@/components/familias/familia-form";

interface FamiliaComUnidade extends Familia {
  unidadeId: string;
}

export default function EditarFamiliaPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { igrejaId, unidadesAcessiveis, nivelAcesso } = useAuth();
  
  const familiaId = params.id as string;
  const unidadeIdParam = searchParams.get("unidade");
  
  const [familia, setFamilia] = useState<FamiliaComUnidade | null>(null);
  const [loading, setLoading] = useState(true);
  
  const canEdit = nivelAcesso === "admin" || nivelAcesso === "full";

  useEffect(() => {
    if (!canEdit) {
      toast.error("Você não tem permissão para editar famílias");
      router.push("/familias");
      return;
    }
    
    async function loadFamilia() {
      if (!igrejaId || !familiaId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("familias")
          .select("*")
          .eq("id", familiaId)
          .eq("igreja_id", igrejaId)
          .in("unidade_id", unidadesAcessiveis)
          .single();

        if (error || !data) {
          toast.error("Família não encontrada");
          router.push("/familias");
          return;
        }

        const familiaData: FamiliaComUnidade = {
          id: data.id,
          nome: data.nome,
          responsavel1Id: data.responsavel_1_id,
          responsavel1Nome: "",
          responsavel2Id: data.responsavel_2_id || undefined,
          responsavel2Nome: "",
          dependentes: (data.dependentes || []).map((dep: any) => ({
            ...dep,
            dataNascimento: dep.dataNascimento ? { toDate: () => new Date(dep.dataNascimento) } : undefined,
          })),
          observacoes: data.observacoes || "",
          unidadeId: data.unidade_id,
          dataCriacao: data.data_criacao ? { toDate: () => new Date(data.data_criacao) } : { toDate: () => new Date() },
          dataAtualizacao: data.data_atualizacao ? { toDate: () => new Date(data.data_atualizacao) } : undefined,
          criadoPor: data.criado_por || "",
          ativo: data.ativo,
        };
        
        setFamilia(familiaData);
      } catch (error) {
        console.error("Erro ao carregar família:", error);
        toast.error("Erro ao carregar dados da família");
      } finally {
        setLoading(false);
      }
    }
    
    loadFamilia();
  }, [igrejaId, familiaId, unidadeIdParam, unidadesAcessiveis, router, canEdit]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!familia) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar Família</h1>
        <p className="text-muted-foreground">
          Atualize os dados da {familia.nome}
        </p>
      </div>
      <FamiliaForm familia={familia} unidadeIdParam={familia.unidadeId} />
    </div>
  );
}
