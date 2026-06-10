"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AcompanhamentoForm } from "@/components/acompanhamento/acompanhamento-form";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Search,
  Home,
  Hospital,
  BookOpen,
  MessageCircle,
  Calendar,
  User,
  ChevronRight,
  HeartHandshake,
  Clock,
  Building2,
  Phone,
  MapPin,
  CalendarClock,
  Trash2,
  ChevronDown,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Acompanhamento,
  TipoAcompanhamento,
  TIPOS_ACOMPANHAMENTO,
  CORES_ACOMPANHAMENTO,
  CORES_TIPO,
} from "@/lib/types";

const ICONES_ACOMPANHAMENTO: Record<TipoAcompanhamento, React.ComponentType<{ className?: string; color?: string }>> = {
  visita_residencial: Home,
  visita_hospitalar: Hospital,
  culto_no_lar: BookOpen,
  aconselhamento: MessageCircle,
};

export default function AcompanhamentoPage() {
  const { usuario, igrejaId, unidadesAcessiveis, igrejaNome } = useAuth();
  const [acompanhamentos, setAcompanhamentos] = useState<Acompanhamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<TipoAcompanhamento | "todos">("todos");
  
  const [acompParaVisualizar, setAcompParaVisualizar] = useState<Acompanhamento | null>(null);
  const [isNovoOpen, setIsNovoOpen] = useState(false);
  const [expandedAcomps, setExpandedAcomps] = useState<Record<string, boolean>>({});

  const canCreate = usuario?.nivelAcesso === "full" || 
                    usuario?.nivelAcesso === "admin" || 
                    usuario?.nivelAcesso === "user";

  const canDelete = usuario?.nivelAcesso === "admin" || usuario?.nivelAcesso === "full";

  const loadAcompanhamentos = async () => {
    if (!igrejaId || unidadesAcessiveis.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: acompData, error: acompError } = await supabase
        .from("acompanhamentos")
        .select("*")
        .eq("igreja_id", igrejaId)
        .in("unidade_id", unidadesAcessiveis)
        .order("data", { ascending: false })
        .limit(50);

      if (acompError) throw acompError;

      const { data: membrosData } = await supabase
        .from("membros")
        .select("id, nome, foto_url")
        .eq("igreja_id", igrejaId);

      const { data: usuariosData } = await supabase
        .from("usuarios")
        .select("id, nome")
        .eq("igreja_id", igrejaId);

      const membrosMap = new Map<string, { nome: string; fotoUrl: string }>();
      if (membrosData) {
        membrosData.forEach((m) => membrosMap.set(m.id, { nome: m.nome, fotoUrl: m.foto_url || "" }));
      }

      const usersMap = new Map<string, string>();
      if (usuariosData) {
        usuariosData.forEach((u) => usersMap.set(u.id, u.nome));
      }

      const list: Acompanhamento[] = (acompData || []).map((row) => {
        const membro = membrosMap.get(row.membro_id);
        const responsavelNome = row.responsavel_uid ? (usersMap.get(row.responsavel_uid) || membrosMap.get(row.responsavel_uid)?.nome || "Não encontrado") : "N/A";
        
        return {
          id: row.id,
          membroId: row.membro_id,
          membroNome: membro?.nome || "Membro não encontrado",
          membroFotoUrl: membro?.fotoUrl || "",
          tipo: row.tipo as TipoAcompanhamento,
          data: row.data ? { toDate: () => new Date(row.data) } : { toDate: () => new Date() },
          responsavelUid: row.responsavel_uid || "",
          responsavelNome: responsavelNome,
          descricao: row.descricao,
          dadosHospital: row.dados_hospital || undefined,
          proximoContato: row.proximo_contato ? { toDate: () => new Date(row.proximo_contato) } : undefined,
          observacoes: row.observacoes || "",
          dataCriacao: row.data_criacao ? { toDate: () => new Date(row.data_criacao) } : { toDate: () => new Date() },
          unidadeId: row.unidade_id,
        };
      });

      setAcompanhamentos(list);
    } catch (error) {
      console.error("Erro ao carregar acompanhamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAcompanhamentos();
  }, [igrejaId, unidadesAcessiveis]);

  const handleDelete = async (acomp: Acompanhamento) => {
    if (!acomp || !igrejaId) return;

    try {
      const { error } = await supabase
        .from("acompanhamentos")
        .delete()
        .eq("id", acomp.id);

      if (error) throw error;
      toast.success("Acompanhamento excluído com sucesso");
      setAcompanhamentos((prev) => prev.filter((item) => item.id !== acomp.id));
      setAcompParaVisualizar(null);
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir acompanhamento");
    }
  };

  const filteredAcompanhamentos = acompanhamentos.filter((acomp) => {
    const matchesSearch =
      acomp.membroNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acomp.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acomp.responsavelNome.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTipo = filterTipo === "todos" || acomp.tipo === filterTipo;

    return matchesSearch && matchesTipo;
  });

  // Group by date
  const groupedByDate = filteredAcompanhamentos.reduce((acc, acomp) => {
    const dateKey = format(acomp.data.toDate(), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(acomp);
    return acc;
  }, {} as Record<string, Acompanhamento[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Acompanhamento Pastoral</h1>
          <p className="text-muted-foreground flex flex-col gap-0.5">
            <span>Registre e acompanhe visitas, cultos no lar e aconselhamentos</span>
            {igrejaNome && (
              <span className="text-xs text-muted-foreground mt-0.5">
                Igreja: <strong className="text-foreground">{igrejaNome}</strong>
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/acompanhamento/relatorios">
              <BarChart3 className="mr-2 h-4 w-4" />
              Relatórios
            </Link>
          </Button>
          {canCreate && (
            <Button onClick={() => setIsNovoOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Registro
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(TIPOS_ACOMPANHAMENTO) as TipoAcompanhamento[]).map((tipo) => {
          const Icon = ICONES_ACOMPANHAMENTO[tipo];
          const count = acompanhamentos.filter((a) => a.tipo === tipo).length;
          return (
            <Card key={tipo}>
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${CORES_ACOMPANHAMENTO[tipo]}20` }}
                >
                  <Icon className="h-6 w-6" color={CORES_ACOMPANHAMENTO[tipo]} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loading ? "-" : count}</p>
                  <p className="text-sm text-muted-foreground">{TIPOS_ACOMPANHAMENTO[tipo]}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por membro, descrição ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filterTipo}
            onValueChange={(v) => setFilterTipo(v as TipoAcompanhamento | "todos")}
          >
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

      {/* List */}
      {loading ? (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredAcompanhamentos.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <Empty>
              <EmptyMedia variant="icon">
                <HeartHandshake className="h-10 w-10" />
              </EmptyMedia>
              <EmptyTitle>
                {acompanhamentos.length === 0
                  ? "Nenhum acompanhamento registrado"
                  : "Nenhum resultado encontrado"}
              </EmptyTitle>
              <EmptyDescription>
                {acompanhamentos.length === 0
                  ? "Comece registrando uma visita ou culto no lar."
                  : "Tente ajustar os filtros de busca."}
              </EmptyDescription>
              {acompanhamentos.length === 0 && canCreate && (
                <Button onClick={() => setIsNovoOpen(true)} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Registro
                </Button>
              )}
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => {
            const dateAcompanhamentos = groupedByDate[dateKey];
            const date = new Date(dateKey + "T12:00:00");
            const isToday = format(new Date(), "yyyy-MM-dd") === dateKey;
            const isYesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd") === dateKey;

            return (
              <div key={dateKey}>
                <div className="mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">
                    {isToday
                      ? "Hoje"
                      : isYesterday
                      ? "Ontem"
                      : format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {dateAcompanhamentos.length}
                  </Badge>
                </div>
                <>
                  {/* Desktop View */}
                  <div className="hidden sm:block">
                    <Card>
                      <CardContent className="divide-y p-0">
                        {dateAcompanhamentos.map((acomp) => {
                          const Icon = ICONES_ACOMPANHAMENTO[acomp.tipo];
                          return (
                            <div
                              key={acomp.id}
                              onClick={() => setAcompParaVisualizar(acomp)}
                              className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50 cursor-pointer"
                            >
                              <div className="relative">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={acomp.membroFotoUrl || undefined} alt={acomp.membroNome} />
                                  <AvatarFallback>
                                    {acomp.membroNome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div
                                  className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-white"
                                  style={{ backgroundColor: CORES_ACOMPANHAMENTO[acomp.tipo] }}
                                >
                                  <Icon className="h-3 w-3" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium truncate">{acomp.membroNome}</p>
                                  <Badge
                                    variant="outline"
                                    className="shrink-0 text-xs"
                                    style={{
                                      borderColor: CORES_ACOMPANHAMENTO[acomp.tipo],
                                      color: CORES_ACOMPANHAMENTO[acomp.tipo],
                                    }}
                                  >
                                    {TIPOS_ACOMPANHAMENTO[acomp.tipo]}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {acomp.descricao}
                                </p>
                                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  <span>{acomp.responsavelNome}</span>
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Mobile View */}
                  <div className="block sm:hidden space-y-3">
                    {dateAcompanhamentos.map((acomp) => {
                      const Icon = ICONES_ACOMPANHAMENTO[acomp.tipo];
                      const isExpanded = !!expandedAcomps[acomp.id];
                      return (
                        <Card key={acomp.id} className="overflow-hidden border border-muted">
                          <div
                            onClick={() => setExpandedAcomps(prev => ({ ...prev, [acomp.id]: !prev[acomp.id] }))}
                            className="p-3 flex items-center justify-between cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative shrink-0">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={acomp.membroFotoUrl || undefined} alt={acomp.membroNome} />
                                  <AvatarFallback className="text-xs bg-muted">
                                    {acomp.membroNome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div
                                  className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-white"
                                  style={{ backgroundColor: CORES_ACOMPANHAMENTO[acomp.tipo] }}
                                >
                                  <Icon className="h-2.5 w-2.5" />
                                </div>
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-sm truncate">{acomp.membroNome}</h4>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4 py-0 px-1 mt-0.5"
                                  style={{
                                    borderColor: CORES_ACOMPANHAMENTO[acomp.tipo],
                                    color: CORES_ACOMPANHAMENTO[acomp.tipo],
                                  }}
                                >
                                  {TIPOS_ACOMPANHAMENTO[acomp.tipo]}
                                </Badge>
                              </div>
                            </div>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                          </div>

                          {isExpanded && (
                            <CardContent className="border-t bg-muted/20 p-3 space-y-3 text-sm animate-in fade-in duration-200">
                              <div className="space-y-2">
                                <div className="text-xs">
                                  <span className="text-muted-foreground font-medium block">Descrição:</span>
                                  <p className="mt-0.5 text-muted-foreground line-clamp-4">{acomp.descricao}</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-dashed">
                                  <div className="flex flex-col">
                                    <span className="text-muted-foreground font-medium">Responsável</span>
                                    <span className="mt-0.5">{acomp.responsavelNome}</span>
                                  </div>
                                  {acomp.proximoContato && (
                                    <div className="flex flex-col">
                                      <span className="text-muted-foreground font-medium">Próximo Contato</span>
                                      <span className="mt-0.5 text-amber-600 dark:text-amber-400 font-semibold">
                                        {format(acomp.proximoContato.toDate(), "dd/MM/yyyy", { locale: ptBR })}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-2 justify-end pt-2 border-t">
                                <Button size="sm" variant="outline" onClick={() => setAcompParaVisualizar(acomp)}>
                                  Detalhes
                                </Button>
                                {canDelete && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir Acompanhamento</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja excluir este registro de acompanhamento? Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDelete(acomp)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Excluir
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer: Novo Registro */}
      <Sheet open={isNovoOpen} onOpenChange={setIsNovoOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-6 overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Novo Acompanhamento</SheetTitle>
            <SheetDescription>
              Registre uma visita, culto no lar ou aconselhamento
            </SheetDescription>
          </SheetHeader>
          <AcompanhamentoForm
            onSuccess={() => {
              setIsNovoOpen(false);
              loadAcompanhamentos();
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Drawer: Visualizar Detalhes */}
      <Sheet open={!!acompParaVisualizar} onOpenChange={(open) => !open && setAcompParaVisualizar(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-6 overflow-y-auto">
          {acompParaVisualizar && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <SheetTitle>{TIPOS_ACOMPANHAMENTO[acompParaVisualizar.tipo]}</SheetTitle>
                  <Badge
                    style={{
                      backgroundColor: CORES_ACOMPANHAMENTO[acompParaVisualizar.tipo],
                      color: "white",
                    }}
                  >
                    {TIPOS_ACOMPANHAMENTO[acompParaVisualizar.tipo]}
                  </Badge>
                </div>
                <SheetDescription>
                  {format(acompParaVisualizar.data.toDate(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6">
                {/* Member Info */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-semibold">Membro</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <Link
                      href={`/membros/${acompParaVisualizar.membroId}`}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={acompParaVisualizar.membroFotoUrl || undefined} />
                        <AvatarFallback className="text-sm">
                          {acompParaVisualizar.membroNome.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{acompParaVisualizar.membroNome}</p>
                        <p className="text-xs text-muted-foreground">Ver perfil completo</p>
                      </div>
                    </Link>
                  </CardContent>
                </Card>

                {/* Description */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-semibold">Descrição</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {acompParaVisualizar.descricao}
                    </p>
                    {acompParaVisualizar.observacoes && (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="mb-1 text-xs font-semibold">Observações</p>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {acompParaVisualizar.observacoes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Hospital Details */}
                {acompParaVisualizar.tipo === "visita_hospitalar" && acompParaVisualizar.dadosHospital && (
                  <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
                    <CardHeader className="py-3">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
                        <Hospital className="h-4 w-4" />
                        Dados Hospitalares
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2 text-xs">
                      {acompParaVisualizar.dadosHospital.nomeHospital && (
                        <div>
                          <p className="text-muted-foreground">Hospital</p>
                          <p className="font-medium">{acompParaVisualizar.dadosHospital.nomeHospital}</p>
                        </div>
                      )}
                      {acompParaVisualizar.dadosHospital.enderecoHospital && (
                        <div>
                          <p className="text-muted-foreground">Endereço</p>
                          <p className="font-medium">{acompParaVisualizar.dadosHospital.enderecoHospital}</p>
                        </div>
                      )}
                      {acompParaVisualizar.dadosHospital.telefoneHospital && (
                        <div>
                          <p className="text-muted-foreground">Telefone</p>
                          <p className="font-medium">{acompParaVisualizar.dadosHospital.telefoneHospital}</p>
                        </div>
                      )}
                      {acompParaVisualizar.dadosHospital.quartoLeito && (
                        <div>
                          <p className="text-muted-foreground">Quarto / Leito</p>
                          <p className="font-medium">{acompParaVisualizar.dadosHospital.quartoLeito}</p>
                        </div>
                      )}
                      {acompParaVisualizar.dadosHospital.horarioVisita && (
                        <div>
                          <p className="text-muted-foreground">Horário de Visita</p>
                          <p className="font-medium">{acompParaVisualizar.dadosHospital.horarioVisita}</p>
                        </div>
                      )}
                      {acompParaVisualizar.dadosHospital.previsaoAlta && (
                        <div>
                          <p className="text-muted-foreground">Previsão de Alta</p>
                          <p className="font-medium">
                            {format(acompParaVisualizar.dadosHospital.previsaoAlta.toDate(), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Info Card */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-semibold">Informações Gerais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Responsável</span>
                      <span className="font-medium">{acompParaVisualizar.responsavelNome}</span>
                    </div>
                    {acompParaVisualizar.proximoContato && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Próximo Contato</span>
                        <span className="font-medium text-amber-600 dark:text-amber-400">
                          {format(acompParaVisualizar.proximoContato.toDate(), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Registrado em</span>
                      <span>
                        {format(acompParaVisualizar.dataCriacao.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Acompanhamento</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir este registro de acompanhamento? Esta ação não pode
                            ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(acompParaVisualizar)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button variant="outline" onClick={() => setAcompParaVisualizar(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
