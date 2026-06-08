"use client";

// Dashboard principal - v2
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Map,
  UsersRound,
  UserPlus,
  TrendingUp,
  Cake,
  Gift,
  ChevronRight,
  Building2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TIPOS_MEMBRO, CORES_TIPO, TIPOS_UNIDADE, type TipoMembro, type Membro, type Igreja } from "@/lib/types";

interface DashboardStats {
  totalMembros: number;
  porTipo: Record<TipoMembro, number>;
  totalGrupos: number;
  totalUnidades: number;
  ultimosCadastros: number;
  aniversariantesHoje: Membro[];
  aniversariantesSemana: Membro[];
}

export default function DashboardPage() {
  const { 
    usuario, 
    igrejaId, 
    unidadeAtual, 
    unidadesAcessiveis, 
    todasUnidades,
    temAcessoTotal 
  } = useAuth();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [igrejaInfo, setIgrejaInfo] = useState<Igreja | null>(null);

  // Determinar unidades alvo para as estatísticas dos cards (membros/grupos)
  const targetUnidadesIds = unidadesAcessiveis;

  // Contagem de congregações, subcongregações e pontos evangelísticos.
  const baseUnidades = todasUnidades.filter(u => unidadesAcessiveis.includes(u.id));
  const countCongregacoes = baseUnidades.filter(u => u.tipo === "congregacao" && u.ativa).length;
  const countSubcongregacoes = baseUnidades.filter(u => u.tipo === "subcongregacao" && u.ativa).length;
  const countPontos = baseUnidades.filter(u => u.tipo === "ponto_evangelistico" && u.ativa).length;

  useEffect(() => {
    if (!igrejaId || unidadesAcessiveis.length === 0) {
      setLoading(false);
      return;
    }

    async function loadStats() {
      try {
        // Carrega os dados da Sede do Ministério
        const { data: igrejaData } = await supabase
          .from("igrejas")
          .select("*")
          .eq("id", igrejaId)
          .single();
        if (igrejaData) {
          setIgrejaInfo({
            id: igrejaData.id,
            nome: igrejaData.nome,
            tipo: "sede",
            ministerio: igrejaData.ministerio || "",
            convencao: igrejaData.convencao || "",
          } as any);
        }

        const porTipo: Record<TipoMembro, number> = {
          visitante: 0,
          congregado: 0,
          membro: 0,
          obreiro: 0,
          lider: 0,
        };

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        let ultimosCadastros = 0;
        let totalMembros = 0;
        let totalGrupos = 0;
        const aniversariantesHoje: Membro[] = [];
        const aniversariantesSemana: Membro[] = [];

        if (targetUnidadesIds.length > 0 && targetUnidadesIds[0] !== "none") {
          // Busca todos os membros das unidades alvo
          const { data: membrosData, error: membrosError } = await supabase
            .from("membros")
            .select("*")
            .eq("igreja_id", igrejaId)
            .in("unidade_id", targetUnidadesIds);

          if (membrosError) throw membrosError;

          (membrosData || []).forEach((row) => {
            totalMembros++;
            
            const tipo = row.tipo as TipoMembro;
            if (tipo in porTipo) {
              porTipo[tipo]++;
            }
            
            const dataCriacao = new Date(row.data_criacao);
            if (dataCriacao > thirtyDaysAgo) {
              ultimosCadastros++;
            }
            
            // Check birthdays
            if (row.data_nascimento) {
              const birthDate = new Date(row.data_nascimento + "T00:00:00");
              const today = new Date();
              const isToday = birthDate.getDate() === today.getDate() && birthDate.getMonth() === today.getMonth();
              
              const membroMapeado = {
                id: row.id,
                nome: row.nome,
                telefone: row.telefone || "",
                email: row.email,
                fotoUrl: row.foto_url,
                tipo: row.tipo as TipoMembro,
                dataNascimento: row.data_nascimento,
                unidadeId: row.unidade_id,
              } as unknown as Membro;

              if (isToday) {
                aniversariantesHoje.push(membroMapeado);
              }
              
              for (let i = 1; i <= 7; i++) {
                const futureDate = new Date(today);
                futureDate.setDate(today.getDate() + i);
                if (birthDate.getDate() === futureDate.getDate() && birthDate.getMonth() === futureDate.getMonth()) {
                  aniversariantesSemana.push(membroMapeado);
                  break;
                }
              }
            }
          });

          // Busca contagem de grupos ativos
          const { count, error: gruposError } = await supabase
            .from("grupos")
            .select("*", { count: "exact", head: true })
            .eq("igreja_id", igrejaId)
            .in("unidade_id", targetUnidadesIds)
            .eq("ativo", true);

          if (!gruposError && count !== null) {
            totalGrupos = count;
          }
        }

        setStats({
          totalMembros,
          porTipo,
          totalGrupos,
          totalUnidades: targetUnidadesIds.length,
          ultimosCadastros,
          aniversariantesHoje,
          aniversariantesSemana,
        });
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [igrejaId, targetUnidadesIds.join(",")]);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Bem-vindo, {usuario?.nome || "Marcus Garcia"}
          </h1>
          {igrejaInfo ? (
            <p className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Sede: <span className="font-semibold text-foreground">{igrejaInfo.nome}</span></span>
              {igrejaInfo.ministerio && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span>Ministério: <span className="font-semibold text-foreground">{igrejaInfo.ministerio}</span></span>
                </>
              )}
              {igrejaInfo.convencao && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span>Convenção: <span className="font-semibold text-foreground">{igrejaInfo.convencao}</span></span>
                </>
              )}
              <span className="text-muted-foreground/50">•</span>
              <Badge variant="outline" className="font-normal bg-primary/5 text-primary border-primary/20">
                Visão Geral do Ministério
              </Badge>
            </p>
          ) : (
            <p className="text-muted-foreground">
              {unidadeAtual ? (
                <>
                  {TIPOS_UNIDADE[unidadeAtual.tipo]}: <span className="font-medium">{unidadeAtual.nome}</span>
                  {temAcessoTotal() && " (Acesso Total)"}
                </>
              ) : (
                "Gerencie os membros da sua igreja com facilidade"
              )}
            </p>
          )}
        </div>
      </div>



      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Card 1: Membros */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalMembros || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Em todas as unidades
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Congregações */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Congregações</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{countCongregacoes}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Total ativo
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Subcongregações */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Subcongregações</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{countSubcongregacoes}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Total ativo
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Pontos Evangelísticos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pontos Evangelísticos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{countPontos}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Total ativo
            </p>
          </CardContent>
        </Card>

        {/* Card 5: Grupos Ativos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Grupos Ativos</CardTitle>
            <UsersRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalGrupos || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Grupos de WhatsApp
            </p>
          </CardContent>
        </Card>

        {/* Card 6: Novos (30 dias) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Novos (30 dias)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.ultimosCadastros || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Cadastros recentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Aniversariantes */}
      {!loading && (stats?.aniversariantesHoje.length || stats?.aniversariantesSemana.length) ? (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Cake className="h-5 w-5 text-amber-600" />
              Aniversariantes
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/aniversariantes" className="text-amber-600 hover:text-amber-700">
                Ver todos
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Today */}
              {stats?.aniversariantesHoje.length ? (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Gift className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Hoje</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {stats.aniversariantesHoje.map((membro) => (
                      <Link
                        key={membro.id}
                        href={`/membros/${membro.id}`}
                        className="flex items-center gap-2 rounded-lg border bg-background/80 p-2 pr-3 transition-colors hover:bg-background"
                      >
                        <Avatar className="h-10 w-10 border-2" style={{ borderColor: CORES_TIPO[membro.tipo] }}>
                          <AvatarImage src={membro.fotoUrl || undefined} alt={membro.nome} />
                          <AvatarFallback style={{ backgroundColor: CORES_TIPO[membro.tipo], color: "white" }}>
                            {membro.nome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{membro.nome.split(" ")[0]}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
              
              {/* This week */}
              {stats?.aniversariantesSemana.length ? (
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Próximos 7 dias</p>
                  <div className="flex flex-wrap gap-3">
                    {stats.aniversariantesSemana.map((membro) => {
                      const birthDate = membro.dataNascimento?.toDate();
                      return (
                        <Link
                          key={membro.id}
                          href={`/membros/${membro.id}`}
                          className="flex items-center gap-2 rounded-lg border bg-background/60 p-2 pr-3 transition-colors hover:bg-background"
                        >
                          <Avatar className="h-8 w-8 border" style={{ borderColor: CORES_TIPO[membro.tipo] }}>
                            <AvatarImage src={membro.fotoUrl || undefined} alt={membro.nome} />
                            <AvatarFallback style={{ backgroundColor: CORES_TIPO[membro.tipo], color: "white" }} className="text-xs">
                              {membro.nome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm">{membro.nome.split(" ")[0]}</span>
                            <span className="text-xs text-muted-foreground">
                              Dia {birthDate?.getDate()}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Members by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Membros por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-32" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {(Object.keys(TIPOS_MEMBRO) as TipoMembro[]).map((tipo) => (
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
                  <span className="text-2xl font-bold">
                    {stats?.porTipo[tipo] || 0}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5 text-primary" />
              Visualizar no Mapa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Veja todos os membros no mapa, filtre por tipo ou cargo, e crie
              grupos por proximidade.
            </p>
            <Button asChild>
              <Link href="/mapa">Abrir Mapa</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-primary" />
              Criar Grupo por Proximidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Selecione um líder ou obreiro e encontre membros próximos para
              criar um grupo de WhatsApp.
            </p>
            <Button asChild variant="outline">
              <Link href="/grupos/novo">Criar Grupo</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
