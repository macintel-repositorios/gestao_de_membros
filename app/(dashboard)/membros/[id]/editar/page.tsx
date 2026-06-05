"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDoc, getDocs, query } from "firebase/firestore";
import { getMembroDoc, getMembrosCollection } from "@/lib/firestore";
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
        // Search for member in all accessible units
        for (const unidadeId of unidadesAcessiveis) {
          const docRef = getMembroDoc(igrejaId!, unidadeId, params.id as string);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setMembro({ id: docSnap.id, unidadeId, ...docSnap.data() } as Membro);
            setMembroUnidadeId(unidadeId);
            return;
          }
        }
        // Not found in any unit
        router.push("/membros");
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
