"use client";

import { useEffect, useState, useMemo } from "react";
import { query, onSnapshot, getDocs } from "firebase/firestore";
import { getMembrosCollection, getAcompanhamentosCollection } from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Users,
  Home,
  Hospital,
  BookOpen,
  MessageCircle,
  TrendingUp,
  Calendar,
  HeartHandshake,
  Download,
} from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Acompanhamento,
  TipoAcompanhamento,
  TIPOS_ACOMPANHAMENTO,
  CORES_ACOMPANHAMENTO,
  TIPOS_MEMBRO,
  TipoMembro,
} from "@/lib/types";

const ICONES_ACOMPANHAMENTO: Record<TipoAcompanhamento, React.ComponentType<{ className?: string; color?: string }>> = {
  visita_residencial: Home,
  visita_hospitalar: Hospital,
  culto_no_lar: BookOpen,
  aconselhamento: MessageCircle,
};

type PeriodoFiltro = "7dias" | "30dias" | "3meses" | "6meses" | "12meses" | "todos";

interface MembrosStats {
  total: number;
  porTipo: Record<TipoMembro, number>;
}

export default function RelatoriosPage() {
  const { igrejaId, unidadesAcessiveis } = useAuth();
  const [acompanhamentos, setAcompanhamentos] = useState<Acompanhamento[]>([]);
  const [membrosStats, setMembrosStats] = useState<MembrosStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("30dias");
  const [filtroTipo, setFiltroTipo] = useState<TipoAcompanhamento | "todos">("todos");

  useEffect(() => {
    if (!igrejaId || unidadesAcessiveis.length === 0) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        // Load acompanhamentos from all accessible units
        const acompData: Acompanhamento[] = [];
        for (const unidadeId of unidadesAcessiveis) {
          const acompRef = getAcompanhamentosCollection(igrejaId, unidadeId);
          const snapshot = await getDocs(query(acompRef));
          snapshot.forEach((docSnap) => {
            acompData.push({ id: docSnap.id, unidadeId, ...docSnap.data() } as unknown as Acompanhamento);
          });
        }
        setAcompanhamentos(acompData);

        // Load members stats from all accessible units
        const porTipo: Record<TipoMembro, number> = {
          visitante: 0,
          congregado: 0,
          membro: 0,
          obreiro: 0,
          lider: 0,
        };
        let totalMembros = 0;

        for (const unidadeId of unidadesAcessiveis) {
          const membrosRef = getMembrosCollection(igrejaId, unidadeId);
          const snapshot = await getDocs(query(membrosRef));
          totalMembros += snapshot.size;
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.tipo in porTipo) {
              porTipo[data.tipo as TipoMembro]++;
            }
          });
        }

        setMembrosStats({
          total: totalMembros,
          porTipo,
        });
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [igrejaId, unidadesAcessiveis]);

  // Filter acompanhamentos by period
  const dataInicio = useMemo(() => {
    const now = new Date();
    switch (periodo) {
      case "7dias":
        return subDays(now, 7);
      case "30dias":
        return subDays(now, 30);
      case "3meses":
        return subMonths(now, 3);
      case "6meses":
        return subMonths(now, 6);
      case "12meses":
        return subMonths(now, 12);
      default:
        return null;
    }
  }, [periodo]);

  const acompanhamentosFiltrados = useMemo(() => {
    return acompanhamentos.filter((acomp) => {
      const dataAcomp = acomp.data.toDate();
      const matchesPeriodo = dataInicio ? dataAcomp >= dataInicio : true;
      const matchesTipo = filtroTipo === "todos" || acomp.tipo === filtroTipo;
      return matchesPeriodo && matchesTipo;
    });
  }, [acompanhamentos, dataInicio, filtroTipo]);

  // Stats calculations
  const stats = useMemo(() => {
    const porTipo: Record<TipoAcompanhamento, number> = {
      visita_residencial: 0,
      visita_hospitalar: 0,
      culto_no_lar: 0,
      aconselhamento: 0,
    };

    const porResponsavel: Record<string, { nome: string; count: number }> = {};
    const membrosAtendidos = new Set<string>();

    acompanhamentosFiltrados.forEach((acomp) => {
      porTipo[acomp.tipo]++;
      membrosAtendidos.add(acomp.membroId);

      if (!porResponsavel[acomp.responsavelUid]) {
        porResponsavel[acomp.responsavelUid] = {
          nome: acomp.responsavelNome,
          count: 0,
        };
      }
      porResponsavel[acomp.responsavelUid].count++;
    });

    const topResponsaveis = Object.values(porResponsavel)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: acompanhamentosFiltrados.length,
      porTipo,
      membrosAtendidos: membrosAtendidos.size,
      topResponsaveis,
    };
  }, [acompanhamentosFiltrados]);

  // Monthly data for chart
  const dadosMensais = useMemo(() => {
    const now = new Date();
    const meses = eachMonthOfInterval({
      start: subYears(now, 1),
      end: now,
    });

    return meses.map((mes) => {
      const inicio = startOfMonth(mes);
      const fim = endOfMonth(mes);
      
      const acompDoMes = acompanhamentos.filter((acomp) => {
        const data = acomp.data.toDate();
        return data >= inicio && data <= fim;
      });

      return {
        mes: format(mes, "MMM", { locale: ptBR }),
        mesCompleto: format(mes, "MMMM yyyy", { locale: ptBR }),
        total: acompDoMes.length,
        visita_residencial: acompDoMes.filter((a) => a.tipo === "visita_residencial").length,
        visita_hospitalar: acompDoMes.filter((a) => a.tipo === "visita_hospitalar").length,
        culto_no_lar: acompDoMes.filter((a) => a.tipo === "culto_no_lar").length,
        aconselhamento: acompDoMes.filter((a) => a.tipo === "aconselhamento").length,
      };
    });
  }, [acompanhamentos]);

  const maxMensal = Math.max(...dadosMensais.map((d) => d.total), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Visualize estatísticas e métricas de acompanhamento pastoral
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoFiltro)}>
            <SelectTrigger className="w-full sm:w-44">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7dias">Últimos 7 dias</SelectItem>
              <SelectItem value="30dias">Últimos 30 dias</SelectItem>
              <SelectItem value="3meses">Últimos 3 meses</SelectItem>
              <SelectItem value="6meses">Últimos 6 meses</SelectItem>
              <SelectItem value="12meses">Últimos 12 meses</SelectItem>
              <SelectItem value="todos">Todo o período</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as TipoAcompanhamento | "todos")}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {(Object.keys(TIPOS_ACOMPANHAMENTO) as TipoAcompanhamento[]).map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {TIPOS_ACOMPANHAMENTO[tipo]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Main Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <HeartHandshake className="h-6 w-6 text-primary" />
            </div>
            <div>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{stats.total}</p>
              )}
              <p className="text-sm text-muted-foreground">Acompanhamentos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{stats.membrosAtendidos}</p>
              )}
              <p className="text-sm text-muted-foreground">Membros atendidos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
              <TrendingUp className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">
                  {membrosStats ? Math.round((stats.membrosAtendidos / membrosStats.total) * 100) || 0 : 0}%
                </p>
              )}
              <p className="text-sm text-muted-foreground">Cobertura</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">
                  {periodo !== "todos" && stats.total > 0
                    ? (stats.total / (periodo === "7dias" ? 1 : periodo === "30dias" ? 4 : periodo === "3meses" ? 13 : periodo === "6meses" ? 26 : 52)).toFixed(1)
                    : "-"}
                </p>
              )}
              <p className="text-sm text-muted-foreground">Média semanal</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By Type */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(TIPOS_ACOMPANHAMENTO) as TipoAcompanhamento[]).map((tipo) => {
          const Icon = ICONES_ACOMPANHAMENTO[tipo];
          const count = stats.porTipo[tipo];
          const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
          
          return (
            <Card key={tipo}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${CORES_ACOMPANHAMENTO[tipo]}20` }}
                    >
                      <Icon className="h-5 w-5" color={CORES_ACOMPANHAMENTO[tipo]} />
                    </div>
                    <div>
                      {loading ? (
                        <Skeleton className="h-6 w-12" />
                      ) : (
                        <p className="text-xl font-bold">{count}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{TIPOS_ACOMPANHAMENTO[tipo]}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {percentage}%
                  </Badge>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: CORES_ACOMPANHAMENTO[tipo],
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Evolução Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-end gap-1">
              {dadosMensais.slice(-6).map((mes, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative w-full">
                    <div
                      className="w-full rounded-t bg-primary transition-all hover:opacity-80"
                      style={{
                        height: `${(mes.total / maxMensal) * 180}px`,
                        minHeight: mes.total > 0 ? "8px" : "0px",
                      }}
                      title={`${mes.mesCompleto}: ${mes.total} acompanhamentos`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{mes.mes}</span>
                  <span className="text-xs font-medium">{mes.total}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Responsáveis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Responsáveis Mais Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stats.topResponsaveis.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Nenhum dado disponível para o período selecionado.
              </p>
            ) : (
              <div className="space-y-4">
                {stats.topResponsaveis.map((resp, index) => {
                  const maxCount = stats.topResponsaveis[0]?.count || 1;
                  const percentage = (resp.count / maxCount) * 100;
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {index + 1}
                          </span>
                          <span className="font-medium">{resp.nome}</span>
                        </div>
                        <Badge variant="secondary">{resp.count}</Badge>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Members Distribution */}
      {membrosStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Distribuição de Membros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {(Object.keys(TIPOS_MEMBRO) as TipoMembro[]).map((tipo) => {
                const count = membrosStats.porTipo[tipo];
                const percentage = membrosStats.total > 0 ? Math.round((count / membrosStats.total) * 100) : 0;
                
                return (
                  <div
                    key={tipo}
                    className="flex flex-col items-center rounded-lg border bg-card p-4 text-center"
                  >
                    <Badge
                      variant="secondary"
                      className="mb-2"
                      style={{
                        backgroundColor: `var(--type-${tipo})`,
                        color: "white",
                      }}
                    >
                      {TIPOS_MEMBRO[tipo]}
                    </Badge>
                    <span className="text-2xl font-bold">{count}</span>
                    <span className="text-xs text-muted-foreground">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
