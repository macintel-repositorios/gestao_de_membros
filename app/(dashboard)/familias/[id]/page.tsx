"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getDoc } from "firebase/firestore";
import { getFamiliaDoc, getMembroDoc } from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Pencil,
  Home,
  Users,
  Baby,
  Calendar,
  User,
  Phone,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Familia, Membro, PARENTESCOS, SEXOS } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FamiliaComUnidade extends Familia {
  unidadeId: string;
}

interface MembroDetalhado extends Pick<Membro, 'id' | 'nome' | 'telefone' | 'fotoUrl'> {
  unidadeId: string;
}

export default function FamiliaDetalhesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { igrejaId, unidadesAcessiveis, nivelAcesso } = useAuth();
  
  const familiaId = params.id as string;
  const unidadeIdParam = searchParams.get("unidade");
  
  const [familia, setFamilia] = useState<FamiliaComUnidade | null>(null);
  const [responsavel1, setResponsavel1] = useState<MembroDetalhado | null>(null);
  const [responsavel2, setResponsavel2] = useState<MembroDetalhado | null>(null);
  const [loading, setLoading] = useState(true);
  
  const canEdit = nivelAcesso === "admin" || nivelAcesso === "full";

  useEffect(() => {
    async function loadFamilia() {
      if (!igrejaId || !familiaId) return;
      
      setLoading(true);
      try {
        // Tentar carregar da unidade especificada ou buscar em todas
        const unidadesToTry = unidadeIdParam 
          ? [unidadeIdParam] 
          : unidadesAcessiveis;
        
        let familiaData: FamiliaComUnidade | null = null;
        let foundUnidadeId = "";
        
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
              foundUnidadeId = unidadeId;
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
        
        // Carregar dados do responsável 1
        if (familiaData.responsavel1Id) {
          for (const unidadeId of unidadesAcessiveis) {
            try {
              const membroRef = getMembroDoc(igrejaId, unidadeId, familiaData.responsavel1Id);
              const membroSnap = await getDoc(membroRef);
              if (membroSnap.exists()) {
                const data = membroSnap.data();
                setResponsavel1({
                  id: membroSnap.id,
                  nome: data.nome,
                  telefone: data.telefone,
                  fotoUrl: data.fotoUrl,
                  unidadeId,
                });
                break;
              }
            } catch {
              continue;
            }
          }
        }
        
        // Carregar dados do responsável 2
        if (familiaData.responsavel2Id) {
          for (const unidadeId of unidadesAcessiveis) {
            try {
              const membroRef = getMembroDoc(igrejaId, unidadeId, familiaData.responsavel2Id);
              const membroSnap = await getDoc(membroRef);
              if (membroSnap.exists()) {
                const data = membroSnap.data();
                setResponsavel2({
                  id: membroSnap.id,
                  nome: data.nome,
                  telefone: data.telefone,
                  fotoUrl: data.fotoUrl,
                  unidadeId,
                });
                break;
              }
            } catch {
              continue;
            }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar família:", error);
        toast.error("Erro ao carregar dados da família");
      } finally {
        setLoading(false);
      }
    }
    
    loadFamilia();
  }, [igrejaId, familiaId, unidadeIdParam, unidadesAcessiveis, router]);

  const getInitials = (nome: string) => {
    return nome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const formatPhone = (phone: string) => {
    if (phone?.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    return phone || "-";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!familia) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Home className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{familia.nome}</h1>
              <p className="text-muted-foreground">
                Cadastrada em {familia.dataCriacao && format(familia.dataCriacao.toDate(), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>
        {canEdit && (
          <Button asChild>
            <Link href={`/familias/${familia.id}/editar?unidade=${familia.unidadeId}`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        )}
      </div>

      {/* Responsáveis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Responsáveis
          </CardTitle>
          <CardDescription>
            Membros responsáveis pela família
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Responsável 1 */}
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <Avatar className="h-14 w-14">
                <AvatarImage src={responsavel1?.fotoUrl || undefined} />
                <AvatarFallback className="text-lg">
                  {getInitials(familia.responsavel1Nome)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{familia.responsavel1Nome}</span>
                  <Badge variant="secondary" className="text-xs">Responsável 1</Badge>
                </div>
                {responsavel1?.telefone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {formatPhone(responsavel1.telefone)}
                  </div>
                )}
                <Button variant="link" size="sm" className="h-auto p-0" asChild>
                  <Link href={`/membros/${familia.responsavel1Id}?unidade=${responsavel1?.unidadeId || familia.unidadeId}`}>
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Ver perfil
                  </Link>
                </Button>
              </div>
            </div>

            {/* Responsável 2 */}
            {familia.responsavel2Nome ? (
              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={responsavel2?.fotoUrl || undefined} />
                  <AvatarFallback className="text-lg">
                    {getInitials(familia.responsavel2Nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{familia.responsavel2Nome}</span>
                    <Badge variant="secondary" className="text-xs">Responsável 2</Badge>
                  </div>
                  {responsavel2?.telefone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {formatPhone(responsavel2.telefone)}
                    </div>
                  )}
                  <Button variant="link" size="sm" className="h-auto p-0" asChild>
                    <Link href={`/membros/${familia.responsavel2Id}?unidade=${responsavel2?.unidadeId || familia.unidadeId}`}>
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Ver perfil
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-4 border rounded-lg border-dashed text-muted-foreground">
                <User className="mr-2 h-4 w-4" />
                Sem segundo responsável
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dependentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Baby className="h-5 w-5" />
            Dependentes
          </CardTitle>
          <CardDescription>
            Filhos, netos e outros dependentes da família
          </CardDescription>
        </CardHeader>
        <CardContent>
          {familia.dependentes && familia.dependentes.length > 0 ? (
            <div className="space-y-3">
              {familia.dependentes.map((dependente) => (
                <div
                  key={dependente.id}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-sm">
                      {getInitials(dependente.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{dependente.nome}</span>
                      <Badge variant="outline" className="text-xs">
                        {PARENTESCOS[dependente.parentesco]}
                      </Badge>
                      {dependente.membroVinculadoId && (
                        <Badge variant="secondary" className="text-xs">
                          Membro vinculado
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      {dependente.dataNascimento && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(dependente.dataNascimento.toDate(), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                      {dependente.sexo && (
                        <span>{SEXOS[dependente.sexo]}</span>
                      )}
                    </div>
                  </div>
                  {dependente.membroVinculadoId && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/membros/${dependente.membroVinculadoId}?unidade=${familia.unidadeId}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Baby className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Nenhum dependente cadastrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Observações */}
      {familia.observacoes && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {familia.observacoes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
