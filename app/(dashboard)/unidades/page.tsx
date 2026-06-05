"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { query, onSnapshot, orderBy, collection, getDocs } from "firebase/firestore";
import { getUnidadesCollection } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import {
  Building2,
  Search,
  Plus,
  Eye,
  Edit,
  ChevronRight,
  MapPin,
  Users,
  Phone,
} from "lucide-react";
import {
  Unidade,
  TipoUnidade,
  TIPOS_UNIDADE,
} from "@/lib/types";

const CORES_TIPO_UNIDADE: Record<TipoUnidade, string> = {
  sede: "#16a34a",
  congregacao: "#2563eb",
  subcongregacao: "#9333ea",
};

interface UnidadeComContagem extends Unidade {
  totalMembros: number;
}

export default function UnidadesPage() {
  const { igrejaId, nivelAcesso, unidadesAcessiveis, temAcessoTotal } = useAuth();
  const [unidades, setUnidades] = useState<UnidadeComContagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const canManageUnidades = nivelAcesso === "full" || nivelAcesso === "admin";

  useEffect(() => {
    if (!igrejaId || !db) {
      setLoading(false);
      return;
    }

    const unidadesRef = getUnidadesCollection(igrejaId);
    const q = query(unidadesRef, orderBy("nome", "asc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const unidadesData: UnidadeComContagem[] = [];
      
      for (const docSnap of snapshot.docs) {
        const unidadeData = { id: docSnap.id, ...docSnap.data() } as Unidade;
        
        // Conta membros desta unidade
        let totalMembros = 0;
        try {
          const membrosRef = collection(db!, "igrejas", igrejaId, "unidades", unidadeData.id, "membros");
          const membrosSnapshot = await getDocs(membrosRef);
          totalMembros = membrosSnapshot.docs.filter(m => m.data().ativo !== false).length;
        } catch {
          totalMembros = 0;
        }

        unidadesData.push({
          ...unidadeData,
          totalMembros
        });
      }
      
      setUnidades(unidadesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [igrejaId]);

  // Filtra unidades baseado no acesso do usuário
  const unidadesVisiveis = unidades.filter((unidade) => {
    if (temAcessoTotal()) return true;
    return unidadesAcessiveis.includes(unidade.id);
  });

  // Filtra por busca
  const filteredUnidades = unidadesVisiveis.filter((unidade) => {
    if (!unidade.ativa) return false;

    const matchesSearch =
      unidade.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unidade.endereco?.bairro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unidade.endereco?.cidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unidade.dirigente?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Separa por tipo
  const sedes = filteredUnidades.filter(u => u.tipo === "sede");
  const congregacoes = filteredUnidades.filter(u => u.tipo === "congregacao");
  const subcongregacoes = filteredUnidades.filter(u => u.tipo === "subcongregacao");

  // Organiza em hierarquia para exibição
  const getUnidadePai = (unidadeId: string | undefined) => {
    if (!unidadeId) return null;
    return unidades.find(u => u.id === unidadeId);
  };

  const getHierarquia = (unidade: Unidade): string => {
    const parts: string[] = [];
    let current = getUnidadePai(unidade.unidadePaiId);
    while (current) {
      parts.unshift(current.nome);
      current = getUnidadePai(current.unidadePaiId);
    }
    return parts.join(" > ");
  };

  // Estatísticas
  const stats = {
    total: unidadesVisiveis.filter(u => u.ativa).length,
    sedes: unidadesVisiveis.filter(u => u.tipo === "sede" && u.ativa).length,
    congregacoes: unidadesVisiveis.filter(u => u.tipo === "congregacao" && u.ativa).length,
    subcongregacoes: unidadesVisiveis.filter(u => u.tipo === "subcongregacao" && u.ativa).length,
    totalMembros: unidadesVisiveis.reduce((acc, u) => acc + u.totalMembros, 0),
  };

  const renderUnidadeCard = (unidade: UnidadeComContagem) => (
    <Card key={unidade.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="flex h-10 w-10 items-center justify-center rounded-lg text-white shrink-0"
              style={{ backgroundColor: CORES_TIPO_UNIDADE[unidade.tipo] }}
            >
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{unidade.nome}</h3>
              {unidade.dirigente && (
                <p className="text-sm text-muted-foreground truncate">{unidade.dirigente}</p>
              )}
              {unidade.unidadePaiId && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <ChevronRight className="h-3 w-3" />
                  <span className="truncate">{getHierarquia(unidade)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={`/unidades/${unidade.id}`}>
                <Eye className="h-4 w-4" />
                <span className="sr-only">Ver detalhes</span>
              </Link>
            </Button>
            {canManageUnidades && (
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href={`/unidades/${unidade.id}/editar`}>
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Editar</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4 mt-4 pt-3 border-t text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{unidade.totalMembros} membros</span>
          </div>
          {unidade.endereco?.cidade && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{unidade.endereco.cidade}</span>
            </div>
          )}
          {unidade.telefone && (
            <div className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              <span>{unidade.telefone}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderUnidadeSection = (
    tipo: TipoUnidade, 
    unidadesLista: UnidadeComContagem[],
    titulo: string,
    descricao: string
  ) => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div 
          className="h-4 w-4 rounded-full" 
          style={{ backgroundColor: CORES_TIPO_UNIDADE[tipo] }}
        />
        <div>
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <p className="text-sm text-muted-foreground">{descricao}</p>
        </div>
      </div>

      {unidadesLista.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma {TIPOS_UNIDADE[tipo].toLowerCase()} cadastrada
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {unidadesLista.map(renderUnidadeCard)}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unidades</h1>
          <p className="text-muted-foreground">
            Gerencie as sedes, congregações e subcongregações
          </p>
        </div>
        {canManageUnidades && (
          <Button asChild>
            <Link href="/unidades/nova">
              <Plus className="mr-2 h-4 w-4" />
              Nova Unidade
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total de Unidades</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div 
                className="h-3 w-3 rounded-full" 
                style={{ backgroundColor: CORES_TIPO_UNIDADE.sede }}
              />
              <span className="text-sm text-muted-foreground">Sedes</span>
            </div>
            <div className="text-2xl font-bold">{stats.sedes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div 
                className="h-3 w-3 rounded-full" 
                style={{ backgroundColor: CORES_TIPO_UNIDADE.congregacao }}
              />
              <span className="text-sm text-muted-foreground">Congregações</span>
            </div>
            <div className="text-2xl font-bold">{stats.congregacoes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div 
                className="h-3 w-3 rounded-full" 
                style={{ backgroundColor: CORES_TIPO_UNIDADE.subcongregacao }}
              />
              <span className="text-sm text-muted-foreground">Subcongregações</span>
            </div>
            <div className="text-2xl font-bold">{stats.subcongregacoes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total de Membros</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalMembros}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, dirigente, bairro ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredUnidades.length === 0 && unidades.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <Empty>
              <EmptyMedia variant="icon">
                <Building2 className="h-10 w-10" />
              </EmptyMedia>
              <EmptyTitle>Nenhuma unidade cadastrada</EmptyTitle>
              <EmptyDescription>
                Comece cadastrando a primeira unidade (sede).
              </EmptyDescription>
              {canManageUnidades && (
                <Button asChild className="mt-4">
                  <Link href="/unidades/nova">
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar Unidade
                  </Link>
                </Button>
              )}
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Sedes */}
          {renderUnidadeSection(
            "sede", 
            sedes, 
            "Sedes", 
            "Igreja sede - ponto central da estrutura"
          )}

          {/* Congregações */}
          {renderUnidadeSection(
            "congregacao", 
            congregacoes, 
            "Congregações", 
            "Congregações vinculadas às sedes"
          )}

          {/* Subcongregações */}
          {renderUnidadeSection(
            "subcongregacao", 
            subcongregacoes, 
            "Subcongregações", 
            "Subcongregações vinculadas às congregações"
          )}
        </div>
      )}
    </div>
  );
}
