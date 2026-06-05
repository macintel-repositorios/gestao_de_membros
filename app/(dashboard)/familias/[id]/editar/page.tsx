"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { getDoc } from "firebase/firestore";
import { getFamiliaDoc } from "@/lib/firestore";
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
        const unidadesToTry = unidadeIdParam 
          ? [unidadeIdParam] 
          : unidadesAcessiveis;
        
        let familiaData: FamiliaComUnidade | null = null;
        
        for (const unidadeId of unidadesToTry) {
          try {
            const docRef = getFamiliaDoc(igrejaId, unidadeId, familiaId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              familiaData = {
                id: docSnap.id,
                ...docSnap.data(),
                unidadeId,
              } as FamiliaComUnidade;
              break;
            }
          } catch {
            continue;
          }
        }
        
        if (!familiaData) {
          toast.error("Família não encontrada");
          router.push("/familias");
          return;
        }
        
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
