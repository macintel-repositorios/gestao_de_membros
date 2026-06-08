"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { FamiliaForm } from "@/components/familias/familia-form";
import {
  Home,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Plus,
  Users,
  Baby,
  Building2,
  Calendar,
  User,
  Phone,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Familia, PARENTESCOS, SEXOS } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FamiliaComUnidade extends Familia {
  unidadeId: string;
}

export default function FamiliasPage() {
  const { igrejaId, unidadeAtual, unidadesAcessiveis, todasUnidades, nivelAcesso, temAcessoTotal } = useAuth();
  const [familias, setFamilias] = useState<FamiliaComUnidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUnidade, setFilterUnidade] = useState<string>("todos");
  const [familiaToDeactivate, setFamiliaToDeactivate] = useState<FamiliaComUnidade | null>(null);

  // Estados para Sheets (Visualizar e Editar)
  const [familiaParaVisualizar, setFamiliaParaVisualizar] = useState<FamiliaComUnidade | null>(null);
  const [familiaParaEditar, setFamiliaParaEditar] = useState<FamiliaComUnidade | null>(null);
  const [showNovaFamilia, setShowNovaFamilia] = useState(false);
  const [responsavel1, setResponsavel1] = useState<any | null>(null);
  const [responsavel2, setResponsavel2] = useState<any | null>(null);
  const [loadingResponsaveis, setLoadingResponsaveis] = useState(false);

  const canEdit = nivelAcesso === "admin" || nivelAcesso === "full";

  // Carrega responsáveis dinamicamente ao selecionar família para visualizar
  useEffect(() => {
    if (!igrejaId || !familiaParaVisualizar) {
      setResponsavel1(null);
      setResponsavel2(null);
      return;
    }

    const loadResponsaveis = async () => {
      setLoadingResponsaveis(true);
      try {
        // Responsável 1
        let r1 = null;
        if (familiaParaVisualizar.responsavel1Id) {
          const { data, error } = await supabase
            .from("membros")
            .select("id, nome, telefone, foto_url, unidade_id")
            .eq("id", familiaParaVisualizar.responsavel1Id)
            .single();
          if (data && !error) {
            r1 = {
              id: data.id,
              nome: data.nome,
              telefone: data.telefone || "",
              fotoUrl: data.foto_url || "",
              unidadeId: data.unidade_id,
            };
          }
        }

        // Responsável 2
        let r2 = null;
        if (familiaParaVisualizar.responsavel2Id) {
          const { data, error } = await supabase
            .from("membros")
            .select("id, nome, telefone, foto_url, unidade_id")
            .eq("id", familiaParaVisualizar.responsavel2Id)
            .single();
          if (data && !error) {
            r2 = {
              id: data.id,
              nome: data.nome,
              telefone: data.telefone || "",
              fotoUrl: data.foto_url || "",
              unidadeId: data.unidade_id,
            };
          }
        }

        setResponsavel1(r1);
        setResponsavel2(r2);
      } catch (error) {
        console.error("Erro ao carregar responsáveis da família:", error);
      } finally {
        setLoadingResponsaveis(false);
      }
    };

    loadResponsaveis();
  }, [igrejaId, familiaParaVisualizar]);

  const formatPhone = (phone: string) => {
    if (phone?.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    return phone || "-";
  };

  const loadFamilias = async () => {
    if (!igrejaId || unidadesAcessiveis.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("familias")
        .select("*")
        .eq("igreja_id", igrejaId)
        .in("unidade_id", unidadesAcessiveis)
        .order("nome", { ascending: true });

      if (error) throw error;

      const list: FamiliaComUnidade[] = (data || []).map((row) => ({
        id: row.id,
        nome: row.nome,
        responsavel1Id: row.responsavel_1_id,
        responsavel1Nome: "",
        responsavel2Id: row.responsavel_2_id || undefined,
        responsavel2Nome: "",
        dependentes: (row.dependentes || []).map((dep: any) => ({
          ...dep,
          dataNascimento: dep.dataNascimento ? { toDate: () => new Date(dep.dataNascimento) } : undefined,
        })),
        observacoes: row.observacoes || "",
        unidadeId: row.unidade_id,
        dataCriacao: row.data_criacao ? { toDate: () => new Date(row.data_criacao) } : { toDate: () => new Date() },
        dataAtualizacao: row.data_atualizacao ? { toDate: () => new Date(row.data_atualizacao) } : undefined,
        criadoPor: row.criado_por || "",
        ativo: row.ativo,
      }));

      const { data: membrosData } = await supabase
        .from("membros")
        .select("id, nome")
        .eq("igreja_id", igrejaId);

      const membrosMap = new Map<string, string>();
      if (membrosData) {
        membrosData.forEach((m) => membrosMap.set(m.id, m.nome));
      }

      list.forEach((fam) => {
        fam.responsavel1Nome = membrosMap.get(fam.responsavel1Id) || "Não encontrado";
        if (fam.responsavel2Id) {
          fam.responsavel2Nome = membrosMap.get(fam.responsavel2Id) || "Não encontrado";
        }
      });

      setFamilias(list);
    } catch (err) {
      console.error("Erro ao carregar famílias:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamilias();
  }, [igrejaId, unidadesAcessiveis.join(",")]);

  const filteredFamilias = familias.filter((familia) => {
    if (!familia.ativo) return false;

    if (filterUnidade !== "todos" && familia.unidadeId !== filterUnidade) return false;

    const matchesSearch =
      familia.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      familia.responsavel1Nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (familia.responsavel2Nome && familia.responsavel2Nome.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  const handleDeactivate = async () => {
    if (!familiaToDeactivate || !igrejaId) return;

    try {
      const { error } = await supabase
        .from("familias")
        .update({ ativo: false })
        .eq("id", familiaToDeactivate.id);

      if (error) throw error;
      toast.success("Família desativada com sucesso");
      setFamiliaToDeactivate(null);
      loadFamilias();
    } catch (error) {
      console.error("Erro ao desativar família:", error);
      toast.error("Erro ao desativar família");
    }
  };

  const getUnidadeNome = (unidadeId: string) => {
    const unidade = todasUnidades.find((u) => u.id === unidadeId);
    return unidade?.nome || "Não definida";
  };

  const unidadesParaFiltro = todasUnidades.filter((u) => 
    unidadesAcessiveis.includes(u.id)
  );

  const getInitials = (nome: string) => {
    return nome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Famílias</h1>
          <p className="text-muted-foreground">
            {filteredFamilias.length} família{filteredFamilias.length !== 1 && "s"}{" "}
            {temAcessoTotal() ? "em todas as unidades" : `em ${unidadesAcessiveis.length} unidade(s)`}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowNovaFamilia(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Família
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome da família ou responsáveis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {unidadesParaFiltro.length > 1 && (
            <Select
              value={filterUnidade}
              onValueChange={setFilterUnidade}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as unidades</SelectItem>
                {unidadesParaFiltro.map((unidade) => (
                  <SelectItem key={unidade.id} value={unidade.id}>
                    {unidade.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Families Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-6 w-48" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredFamilias.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <Empty>
              <EmptyMedia variant="icon">
                <Home className="h-10 w-10" />
              </EmptyMedia>
              <EmptyTitle>
                {familias.length === 0
                  ? "Nenhuma família cadastrada"
                  : "Nenhuma família encontrada"}
              </EmptyTitle>
              <EmptyDescription>
                {familias.length === 0
                  ? "Comece cadastrando a primeira família."
                  : "Tente ajustar os filtros de busca."}
              </EmptyDescription>
              {familias.length === 0 && canEdit && (
                <Button onClick={() => setShowNovaFamilia(true)} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Família
                </Button>
              )}
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFamilias.map((familia) => (
            <Card key={`${familia.unidadeId}-${familia.id}`} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Home className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{familia.nome}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setFamiliaParaVisualizar(familia)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar
                      </DropdownMenuItem>
                      {canEdit && (
                        <>
                          <DropdownMenuItem
                            onClick={() => setFamiliaParaEditar(familia)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setFamiliaToDeactivate(familia)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Desativar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Responsáveis */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Responsáveis</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">
                          {getInitials(familia.responsavel1Nome)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{familia.responsavel1Nome}</span>
                    </div>
                    {familia.responsavel2Nome && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">
                            {getInitials(familia.responsavel2Nome)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{familia.responsavel2Nome}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dependentes */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Baby className="h-4 w-4" />
                    <span>Dependentes</span>
                  </div>
                  {familia.dependentes && familia.dependentes.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {familia.dependentes.slice(0, 3).map((dep) => (
                        <Badge key={dep.id} variant="secondary" className="text-xs">
                          {dep.nome} ({PARENTESCOS[dep.parentesco]})
                        </Badge>
                      ))}
                      {familia.dependentes.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{familia.dependentes.length - 3}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Nenhum dependente</span>
                  )}
                </div>

                {/* Unidade */}
                {unidadesParaFiltro.length > 1 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                    <Building2 className="h-3 w-3" />
                    {getUnidadeNome(familia.unidadeId)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog
        open={!!familiaToDeactivate}
        onOpenChange={() => setFamiliaToDeactivate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Família</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar a{" "}
              <strong>{familiaToDeactivate?.nome}</strong>? A família não será
              excluída, apenas ficará inativa no sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sheet para Visualizar Família */}
      <Sheet open={!!familiaParaVisualizar} onOpenChange={(open) => !open && setFamiliaParaVisualizar(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-6">
          {familiaParaVisualizar && (
            <div className="space-y-6 pt-4">
              <SheetHeader className="p-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Home className="h-6 w-6" />
                  </div>
                  <div>
                    <SheetTitle className="text-2xl font-bold">{familiaParaVisualizar.nome}</SheetTitle>
                    <SheetDescription>
                      Cadastrada em {familiaParaVisualizar.dataCriacao && format(familiaParaVisualizar.dataCriacao.toDate(), "dd/MM/yyyy", { locale: ptBR })}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <Separator />

              {/* Responsáveis */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Responsáveis
                </h3>
                {loadingResponsaveis ? (
                  <div className="space-y-2">
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Responsável 1 */}
                    <div className="flex items-start gap-3 p-3 border rounded-lg">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={responsavel1?.fotoUrl || undefined} />
                        <AvatarFallback className="text-sm">
                          {getInitials(familiaParaVisualizar.responsavel1Nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{familiaParaVisualizar.responsavel1Nome}</div>
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">Responsável 1</Badge>
                        {responsavel1?.telefone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                            <Phone className="h-3 w-3" />
                            <a href={`tel:+55${responsavel1.telefone}`} className="hover:underline">
                              {formatPhone(responsavel1.telefone)}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Responsável 2 */}
                    {familiaParaVisualizar.responsavel2Nome ? (
                      <div className="flex items-start gap-3 p-3 border rounded-lg">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={responsavel2?.fotoUrl || undefined} />
                          <AvatarFallback className="text-sm">
                            {getInitials(familiaParaVisualizar.responsavel2Nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{familiaParaVisualizar.responsavel2Nome}</div>
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">Responsável 2</Badge>
                          {responsavel2?.telefone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                              <Phone className="h-3 w-3" />
                              <a href={`tel:+55${responsavel2.telefone}`} className="hover:underline">
                                {formatPhone(responsavel2.telefone)}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center p-3 border rounded-lg border-dashed text-xs text-muted-foreground">
                        <User className="mr-1.5 h-3.5 w-3.5" />
                        Sem segundo responsável
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dependentes */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Baby className="h-4 w-4" />
                  Dependentes
                </h3>
                {familiaParaVisualizar.dependentes && familiaParaVisualizar.dependentes.length > 0 ? (
                  <div className="space-y-2">
                    {familiaParaVisualizar.dependentes.map((dep) => (
                      <div key={dep.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(dep.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-sm truncate">{dep.nome}</span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                              {PARENTESCOS[dep.parentesco]}
                            </Badge>
                            {dep.membroVinculadoId && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                Vinculado
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            {dep.dataNascimento && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(dep.dataNascimento.toDate(), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            )}
                            {dep.sexo && (
                              <span>{SEXOS[dep.sexo]}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                    Nenhum dependente cadastrado.
                  </p>
                )}
              </div>

              {/* Observações */}
              {familiaParaVisualizar.observacoes && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Observações</h3>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted/40 p-3 rounded-lg border">
                    {familiaParaVisualizar.observacoes}
                  </p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet para Editar Família */}
      <Sheet open={!!familiaParaEditar} onOpenChange={(open) => !open && setFamiliaParaEditar(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-6">
          {familiaParaEditar && (
            <div className="space-y-6 pt-4">
              <SheetHeader className="p-0">
                <SheetTitle className="text-2xl font-bold">Editar Família</SheetTitle>
                <SheetDescription>
                  Atualize os dados e membros da {familiaParaEditar.nome}
                </SheetDescription>
              </SheetHeader>
              <FamiliaForm
                familia={familiaParaEditar}
                unidadeIdParam={familiaParaEditar.unidadeId}
                onSuccess={() => {
                  setFamiliaParaEditar(null);
                  toast.success("Família atualizada com sucesso!");
                  loadFamilias();
                }}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet para Cadastrar Nova Família */}
      <Sheet open={showNovaFamilia} onOpenChange={setShowNovaFamilia}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-6">
          <SheetHeader className="p-0">
            <SheetTitle className="text-2xl font-bold">Nova Família</SheetTitle>
            <SheetDescription>
              Cadastre uma nova família no sistema.
            </SheetDescription>
          </SheetHeader>
          <div className="pt-4">
            <FamiliaForm
              onSuccess={() => {
                setShowNovaFamilia(false);
                toast.success("Família cadastrada com sucesso!");
                loadFamilias();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
