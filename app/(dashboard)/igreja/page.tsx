"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { carregarIgreja, carregarTodasUnidades } from "@/lib/supabase-db";
import { useAuth } from "@/contexts/auth-context";
import { Igreja, Unidade, TIPOS_IGREJA, TIPOS_UNIDADE, TipoUnidade } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { UnidadeForm } from "@/components/unidades/unidade-form";
import { IgrejaForm } from "@/components/igrejas/igreja-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Church, 
  Building2, 
  MapPin, 
  Phone, 
  ChevronDown,
  ChevronRight,
  Users,
  GitBranch,
} from "lucide-react";
import Link from "next/link";

const CORES_TIPO_UNIDADE: Record<TipoUnidade, string> = {
  sede: "#16a34a",
  congregacao: "#2563eb",
  subcongregacao: "#9333ea",
  ponto_evangelistico: "#f97316",
};

interface UnidadeComContagem extends Unidade {
  totalMembros?: number;
  filhas?: UnidadeComContagem[];
}

interface IgrejaComHierarquia extends Igreja {
  unidades: UnidadeComContagem[];
  totalMembros: number;
  totalUnidades: number;
  todasUnidades: UnidadeComContagem[];
}

export default function GerenciarIgrejasPage() {
  const router = useRouter();
  const { usuario, nivelAcesso, igrejaId } = useAuth();
  const [igrejas, setIgrejas] = useState<IgrejaComHierarquia[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteUnidadeId, setDeleteUnidadeId] = useState<{ igrejaId: string; unidadeId: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedIgrejas, setExpandedIgrejas] = useState<Set<string>>(new Set());
  const [expandedUnidades, setExpandedUnidades] = useState<Set<string>>(new Set());

  // Filtros
  const [filterNome, setFilterNome] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");

  const getUnidadesFiltradas = (igreja: IgrejaComHierarquia) => {
    return igreja.todasUnidades.filter(u => {
      if (filterNome && !u.nome.toLowerCase().includes(filterNome.toLowerCase())) return false;
      if (filterTipo !== "todos" && u.tipo !== filterTipo) return false;
      return true;
    });
  };

  const isFilterActive = filterNome !== "" || filterTipo !== "todos";
  
  // Sheet states
  const [isNovoIgrejaOpen, setIsNovoIgrejaOpen] = useState(false);
  const [igrejaParaEditarId, setIgrejaParaEditarId] = useState<string | null>(null);
  
  const [isNovaUnidadeOpen, setIsNovaUnidadeOpen] = useState(false);
  const [novaUnidadeDefaults, setNovaUnidadeDefaults] = useState<{ tipo?: TipoUnidade; unidadePaiId?: string }>({});
  const [unidadeParaEditarId, setUnidadeParaEditarId] = useState<string | null>(null);
  const [parentIgrejaId, setParentIgrejaId] = useState<string | null>(null);

  // Checks user permission
  const isAdmin = nivelAcesso === "admin" || nivelAcesso === "full";

  useEffect(() => {
    if (!isAdmin) {
      router.push("/");
      return;
    }

    loadIgrejasComHierarquia();
  }, [isAdmin, router]);

  const loadIgrejasComHierarquia = async () => {
    if (!igrejaId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const igrejaData = await carregarIgreja(igrejaId);
      
      const igrejasComHierarquia: IgrejaComHierarquia[] = [];
      
      if (igrejaData) {
        // Carrega as unidades desta igreja
        const unidadesResult = await carregarTodasUnidades(igrejaId);
        
        const unidades = unidadesResult.map(u => ({
          ...u,
          filhas: []
        })) as UnidadeComContagem[];

        // Conta membros por unidade
        let totalMembros = 0;
        for (const unidade of unidades) {
          try {
            const { count, error } = await supabase
              .from("membros")
              .select("*", { count: "exact", head: true })
              .eq("unidade_id", unidade.id)
              .eq("situacao", "ativo");
            
            unidade.totalMembros = (!error && count !== null) ? count : 0;
            totalMembros += unidade.totalMembros;
          } catch {
            unidade.totalMembros = 0;
          }
        }

        // Organiza hierarquia
        const sedes = unidades.filter(u => u.tipo === "sede");
        const congregacoes = unidades.filter(u => u.tipo === "congregacao");
        const subcongregacoes = unidades.filter(u => u.tipo === "subcongregacao");
        const pontosEvangelisticos = unidades.filter(u => u.tipo === "ponto_evangelistico");

        // Associa pontos evangelísticos a quem for de direito (sede, congregação ou subcongregação)
        pontosEvangelisticos.forEach(ponto => {
          const pai = unidades.find(u => u.id === ponto.unidadePaiId);
          if (pai) {
            pai.filhas = pai.filhas || [];
            pai.filhas.push(ponto);
          }
        });

        // Associa subcongregações às congregações
        subcongregacoes.forEach(sub => {
          const pai = unidades.find(u => u.id === sub.unidadePaiId);
          if (pai) {
            pai.filhas = pai.filhas || [];
            pai.filhas.push(sub);
          }
        });

        // Associa congregações às sedes
        congregacoes.forEach(cong => {
          const pai = unidades.find(u => u.id === cong.unidadePaiId);
          if (pai) {
            pai.filhas = pai.filhas || [];
            pai.filhas.push(cong);
          }
        });

        igrejasComHierarquia.push({
          ...igrejaData,
          unidades: sedes.length > 0 ? sedes : unidades,
          todasUnidades: unidades,
          totalMembros,
          totalUnidades: unidades.length,
        });
      }
      
      setIgrejas(igrejasComHierarquia);
      
      // Expande todas as igrejas por padrão
      setExpandedIgrejas(new Set(igrejasComHierarquia.map(i => i.id)));
    } catch (error) {
      console.error("Erro ao carregar igrejas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIgreja = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);
      const { error } = await supabase
        .from("igrejas")
        .delete()
        .eq("id", deleteId);
      
      if (error) throw error;
      
      setIgrejas(prev => prev.filter(i => i.id !== deleteId));
      setDeleteId(null);
      toast.success("Igreja excluída com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir igreja:", error);
      toast.error("Erro ao excluir igreja");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteUnidade = async () => {
    if (!deleteUnidadeId) return;

    try {
      setDeleting(true);
      const { error } = await supabase
        .from("unidades")
        .delete()
        .eq("id", deleteUnidadeId.unidadeId);

      if (error) throw error;
      
      await loadIgrejasComHierarquia();
      setDeleteUnidadeId(null);
      toast.success("Unidade excluída com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir unidade:", error);
      toast.error("Erro ao excluir unidade");
    } finally {
      setDeleting(false);
    }
  };

  const abrirModalNovaUnidade = (igrejaId: string, tipo?: TipoUnidade, unidadePaiId?: string) => {
    setNovaUnidadeDefaults({ tipo, unidadePaiId });
    setIsNovaUnidadeOpen(true);
  };

  const toggleIgreja = (id: string) => {
    setExpandedIgrejas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleUnidade = (id: string) => {
    setExpandedUnidades(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Obtém unidades disponíveis para seleção como pai
  const getUnidadesPai = (igrejaId: string, tipo: TipoUnidade) => {
    const igreja = igrejas.find(i => i.id === igrejaId);
    if (!igreja) return [];

    if (tipo === "congregacao") {
      return igreja.todasUnidades.filter(u => u.tipo === "sede");
    }
    if (tipo === "subcongregacao") {
      return igreja.todasUnidades.filter(u => u.tipo === "congregacao");
    }
    if (tipo === "ponto_evangelistico") {
      return igreja.todasUnidades.filter(u => u.tipo === "sede" || u.tipo === "congregacao" || u.tipo === "subcongregacao");
    }
    return [];
  };

  const renderUnidade = (unidade: UnidadeComContagem, igrejaId: string, depth: number = 0) => {
    const hasFilhas = unidade.filhas && unidade.filhas.length > 0;
    const isExpanded = expandedUnidades.has(unidade.id);

    // Determina quais tipos de unidade podem ser criadas como filhas
    const tiposFilhas: TipoUnidade[] = [];
    if (unidade.tipo === "sede") {
      tiposFilhas.push("congregacao", "ponto_evangelistico");
    } else if (unidade.tipo === "congregacao") {
      tiposFilhas.push("subcongregacao", "ponto_evangelistico");
    } else if (unidade.tipo === "subcongregacao") {
      tiposFilhas.push("ponto_evangelistico");
    }

    return (
      <div key={unidade.id} style={{ marginLeft: depth * 24 }}>
        <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 group">
          {hasFilhas || tiposFilhas.length > 0 ? (
            <button onClick={() => toggleUnidade(unidade.id)} className="p-0.5">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}
          
          <div 
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: CORES_TIPO_UNIDADE[unidade.tipo] }}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{unidade.nome}</span>
              <Badge 
                variant="secondary" 
                className="text-xs"
                style={{ 
                  backgroundColor: `${CORES_TIPO_UNIDADE[unidade.tipo]}20`,
                  color: CORES_TIPO_UNIDADE[unidade.tipo],
                }}
              >
                {TIPOS_UNIDADE[unidade.tipo]}
              </Badge>
            </div>
            {unidade.dirigente && (
              <p className="text-xs text-muted-foreground truncate">{unidade.dirigente}</p>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{unidade.totalMembros || 0}</span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {tiposFilhas.map(tipo => (
              <Button 
                key={tipo}
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => abrirModalNovaUnidade(igrejaId, tipo, unidade.id)}
                title={`Adicionar ${TIPOS_UNIDADE[tipo]}`}
              >
                <Plus className="h-3.5 w-3.5" style={{ color: CORES_TIPO_UNIDADE[tipo] }} />
              </Button>
            ))}
             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
              setParentIgrejaId(igrejaId);
              setUnidadeParaEditarId(unidade.id);
            }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => setDeleteUnidadeId({ igrejaId, unidadeId: unidade.id })}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {(hasFilhas || tiposFilhas.length > 0) && isExpanded && (
          <div className="border-l-2 border-muted ml-2.5">
            {unidade.filhas?.map(filha => renderUnidade(filha, igrejaId, depth + 1))}
            {tiposFilhas.map(tipo => (
              <button 
                key={tipo}
                onClick={() => abrirModalNovaUnidade(igrejaId, tipo, unidade.id)}
                className="flex items-center gap-2 py-2 px-3 ml-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-4 w-4" style={{ color: CORES_TIPO_UNIDADE[tipo] }} />
                Adicionar {TIPOS_UNIDADE[tipo]}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gerenciar Igrejas</h1>
          <p className="text-muted-foreground">
            Crie e gerencie igrejas, sedes, congregações e subcongregações
          </p>
        </div>
        <Button onClick={() => setIsNovoIgrejaOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Igreja
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Buscar congregação/unidade por nome..."
              value={filterNome}
              onChange={(e) => setFilterNome(e.target.value)}
            />
          </div>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Tipo de Unidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as Congregações / Pontos</SelectItem>
              <SelectItem value="sede">Sede</SelectItem>
              <SelectItem value="congregacao">Congregação</SelectItem>
              <SelectItem value="subcongregacao">Subcongregação</SelectItem>
              <SelectItem value="ponto_evangelistico">Ponto Evangelístico</SelectItem>
            </SelectContent>
          </Select>
          {isFilterActive && (
            <Button
              variant="ghost"
              onClick={() => {
                setFilterNome("");
                setFilterTipo("todos");
              }}
            >
              Limpar Filtros
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas Gerais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Church className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Congregações</p>
                <p className="text-2xl font-bold">{igrejas.reduce((acc, i) => acc + (isFilterActive ? getUnidadesFiltradas(i).filter(u => u.tipo === "congregacao").length : i.todasUnidades.filter(u => u.tipo === "congregacao").length), 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Subcongregações</p>
                <p className="text-2xl font-bold">{igrejas.reduce((acc, i) => acc + (isFilterActive ? getUnidadesFiltradas(i).filter(u => u.tipo === "subcongregacao").length : i.todasUnidades.filter(u => u.tipo === "subcongregacao").length), 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <MapPin className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pontos Evang.</p>
                <p className="text-2xl font-bold">{igrejas.reduce((acc, i) => acc + (isFilterActive ? getUnidadesFiltradas(i).filter(u => u.tipo === "ponto_evangelistico").length : i.todasUnidades.filter(u => u.tipo === "ponto_evangelistico").length), 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Membros</p>
                <p className="text-2xl font-bold">{igrejas.reduce((acc, i) => acc + (isFilterActive ? getUnidadesFiltradas(i).reduce((mAcc, u) => mAcc + (u.totalMembros || 0), 0) : i.totalMembros), 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <GitBranch className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hierarquia</p>
                <p className="text-2xl font-bold">4 níveis</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legenda */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-sm font-medium text-muted-foreground">Legenda:</span>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: CORES_TIPO_UNIDADE.sede }} />
              <span className="text-sm">Sede</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: CORES_TIPO_UNIDADE.congregacao }} />
              <span className="text-sm">Congregação</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: CORES_TIPO_UNIDADE.subcongregacao }} />
              <span className="text-sm">Subcongregação</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: CORES_TIPO_UNIDADE.ponto_evangelistico }} />
              <span className="text-sm">Ponto Evangelístico</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {igrejas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Church className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma igreja cadastrada</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Comece cadastrando a primeira igreja do sistema.
            </p>
            <Button onClick={() => setIsNovoIgrejaOpen(true)} className="mt-6">
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Igreja
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {igrejas.map((igreja) => (
            <Card key={igreja.id}>
              <Collapsible open={expandedIgrejas.has(igreja.id)} onOpenChange={() => toggleIgreja(igreja.id)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          {expandedIgrejas.has(igreja.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Church className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{igreja.nome}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-1">
                          {igreja.endereco?.cidade && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {igreja.endereco.cidade}/{igreja.endereco.estado}
                            </span>
                          )}
                          {igreja.telefone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {igreja.telefone}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2">
                        <p className="text-sm font-medium">{igreja.totalMembros} membros</p>
                        <p className="text-xs text-muted-foreground">{igreja.totalUnidades} unidades</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setIgrejaParaEditarId(igreja.id)}>
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(igreja.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-muted-foreground">Estrutura Hierárquica</h4>
                      </div>

                      {isFilterActive ? (
                        <div className="space-y-1">
                          {getUnidadesFiltradas(igreja).length === 0 ? (
                            <p className="text-center py-8 text-sm text-muted-foreground">Nenhuma unidade encontrada para os filtros aplicados.</p>
                          ) : (
                            getUnidadesFiltradas(igreja).map(unidade => (
                              <div key={unidade.id} className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 group">
                                <div 
                                  className="h-3 w-3 rounded-full shrink-0"
                                  style={{ backgroundColor: CORES_TIPO_UNIDADE[unidade.tipo] }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium truncate">{unidade.nome}</span>
                                    <Badge 
                                      variant="secondary" 
                                      className="text-xs"
                                      style={{ 
                                        backgroundColor: `${CORES_TIPO_UNIDADE[unidade.tipo]}20`,
                                        color: CORES_TIPO_UNIDADE[unidade.tipo],
                                      }}
                                    >
                                      {TIPOS_UNIDADE[unidade.tipo]}
                                    </Badge>
                                  </div>
                                  {unidade.dirigente && (
                                    <p className="text-xs text-muted-foreground truncate">{unidade.dirigente}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Users className="h-4 w-4" />
                                  <span>{unidade.totalMembros || 0}</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                    setParentIgrejaId(igreja.id);
                                    setUnidadeParaEditarId(unidade.id);
                                  }}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => setDeleteUnidadeId({ igrejaId: igreja.id, unidadeId: unidade.id })}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {igreja.unidades.map(unidade => renderUnidade(unidade, igreja.id))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      {/* Drawer: Nova Igreja */}
      <Sheet open={isNovoIgrejaOpen} onOpenChange={setIsNovoIgrejaOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-6 overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Nova Igreja</SheetTitle>
            <SheetDescription>
              Cadastre uma nova igreja no sistema
            </SheetDescription>
          </SheetHeader>
          <IgrejaForm
            onSuccess={() => {
              setIsNovoIgrejaOpen(false);
              loadIgrejasComHierarquia();
            }}
            onCancel={() => setIsNovoIgrejaOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Drawer: Editar Igreja */}
      <Sheet open={!!igrejaParaEditarId} onOpenChange={(open) => !open && setIgrejaParaEditarId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-6 overflow-y-auto">
          {igrejaParaEditarId && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle>Editar Igreja</SheetTitle>
                <SheetDescription>
                  Atualize os dados da igreja
                </SheetDescription>
              </SheetHeader>
              <IgrejaForm
                igrejaId={igrejaParaEditarId}
                onSuccess={() => {
                  setIgrejaParaEditarId(null);
                  loadIgrejasComHierarquia();
                }}
                onCancel={() => setIgrejaParaEditarId(null)}
              />
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Drawer: Nova Unidade */}
      <Sheet open={isNovaUnidadeOpen} onOpenChange={setIsNovaUnidadeOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-6 overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Nova Congregação / Subcongregação</SheetTitle>
            <SheetDescription>
              Adicione uma nova congregação/subcongregação à hierarquia
            </SheetDescription>
          </SheetHeader>
          <UnidadeForm
            defaultTipo={novaUnidadeDefaults.tipo}
            defaultUnidadePaiId={novaUnidadeDefaults.unidadePaiId}
            onSuccess={() => {
              setIsNovaUnidadeOpen(false);
              loadIgrejasComHierarquia();
            }}
            onCancel={() => setIsNovaUnidadeOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Drawer: Editar Unidade */}
      <Sheet open={!!unidadeParaEditarId} onOpenChange={(open) => {
        if (!open) {
          setUnidadeParaEditarId(null);
          setParentIgrejaId(null);
        }
      }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-6 overflow-y-auto">
          {unidadeParaEditarId && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle>Editar Congregação / Subcongregação</SheetTitle>
                <SheetDescription>
                  Atualize os dados da congregação/subcongregação
                </SheetDescription>
              </SheetHeader>
              <IgrejaForm
                unidadeId={unidadeParaEditarId}
                parentIgrejaId={parentIgrejaId || undefined}
                onSuccess={() => {
                  setUnidadeParaEditarId(null);
                  setParentIgrejaId(null);
                  loadIgrejasComHierarquia();
                }}
                onCancel={() => {
                  setUnidadeParaEditarId(null);
                  setParentIgrejaId(null);
                }}
              />
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Alert Dialog Excluir Igreja */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Igreja</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta igreja? Esta ação não pode ser desfeita
              e todos os dados relacionados (membros, unidades, etc.) serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIgreja}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog Excluir Unidade */}
      <AlertDialog open={!!deleteUnidadeId} onOpenChange={() => setDeleteUnidadeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Congregação / Subcongregação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta congregação/subcongregação? Esta ação não pode ser desfeita
              e todos os membros associados serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUnidade}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
