"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { GrupoForm } from "@/components/grupos/grupo-form";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  UsersRound,
  Plus,
  MoreHorizontal,
  Users,
  MapPin,
  MessageCircle,
  Trash2,
  Calendar,
  Eye,
  Pencil,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { Grupo, Membro, TIPOS_GRUPO, TipoGrupo } from "@/lib/types";

interface GrupoComDetalhes extends Grupo {
  liderNome?: string;
  membrosNomes?: string[];
  unidadeId?: string;
  raioKm?: number;
}

export default function GruposPage() {
  const { igrejaId, igrejaNome, unidadesAcessiveis, unidadeId } = useAuth();
  const [grupos, setGrupos] = useState<GrupoComDetalhes[]>([]);
  const [loading, setLoading] = useState(true);
  const [grupoToDelete, setGrupoToDelete] = useState<GrupoComDetalhes | null>(
    null
  );

  // Estados para Sheets (Visualizar e Editar)
  const [grupoParaVisualizar, setGrupoParaVisualizar] = useState<GrupoComDetalhes | null>(null);
  const [grupoParaEditar, setGrupoParaEditar] = useState<GrupoComDetalhes | null>(null);
  const [showNovoGrupo, setShowNovoGrupo] = useState(false);
  const [membrosDoGrupo, setMembrosDoGrupo] = useState<Membro[]>([]);
  const [loadingMembros, setLoadingMembros] = useState(false);

  // Formulário de Edição Simples
  const [nomeEdit, setNomeEdit] = useState("");
  const [tipoEdit, setTipoEdit] = useState<any>("estudo");
  const [linkEdit, setLinkEdit] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Carrega membros do grupo
  useEffect(() => {
    if (!igrejaId || !grupoParaVisualizar || !grupoParaVisualizar.unidadeId) {
      setMembrosDoGrupo([]);
      return;
    }

    const loadMembrosDoGrupo = async () => {
      setLoadingMembros(true);
      try {
        if (!grupoParaVisualizar.membrosIds || grupoParaVisualizar.membrosIds.length === 0) {
          setMembrosDoGrupo([]);
          return;
        }

        const { data, error } = await supabase
          .from("membros")
          .select("*")
          .eq("igreja_id", igrejaId)
          .in("id", grupoParaVisualizar.membrosIds);

        if (error) throw error;

        const list: Membro[] = (data || []).map((row) => ({
          id: row.id,
          nome: row.nome,
          telefone: row.telefone || "",
          tipo: row.tipo,
          endereco: {
            bairro: row.bairro || "",
          },
        } as any));

        setMembrosDoGrupo(list);
      } catch (error) {
        console.error("Erro ao carregar membros do grupo:", error);
      } finally {
        setLoadingMembros(false);
      }
    };

    loadMembrosDoGrupo();
  }, [igrejaId, grupoParaVisualizar]);

  // Carrega valores de edição
  useEffect(() => {
    if (grupoParaEditar) {
      setNomeEdit(grupoParaEditar.nome || "");
      setTipoEdit(grupoParaEditar.tipo || "estudo");
      setLinkEdit(grupoParaEditar.linkWhatsApp || "");
    }
  }, [grupoParaEditar]);

  const loadGrupos = async () => {
    if (!igrejaId || unidadesAcessiveis.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: gruposData, error: gruposError } = await supabase
        .from("grupos")
        .select("*")
        .eq("igreja_id", igrejaId)
        .in("unidade_id", unidadesAcessiveis)
        .eq("ativo", true)
        .order("data_criacao", { ascending: false });

      if (gruposError) throw gruposError;

      const { data: membrosData, error: membrosError } = await supabase
        .from("membros")
        .select("id, nome")
        .eq("igreja_id", igrejaId);

      const membrosMap = new Map<string, string>();
      if (!membrosError && membrosData) {
        membrosData.forEach((m) => membrosMap.set(m.id, m.nome));
      }

      const list: GrupoComDetalhes[] = (gruposData || []).map((row) => {
        const membrosIds = Array.isArray(row.membros_ids) ? row.membros_ids : [];
        return {
          id: row.id,
          nome: row.nome,
          tipo: row.tipo,
          liderUid: row.lider_uid,
          liderNome: row.lider_uid ? membrosMap.get(row.lider_uid) || "Não encontrado" : "N/A",
          membrosIds: membrosIds,
          membrosNomes: membrosIds.map((id: string) => membrosMap.get(id) || "Desconhecido").slice(0, 3),
          linkWhatsApp: row.link_whatsapp || "",
          dataCriacao: row.data_criacao ? { toDate: () => new Date(row.data_criacao) } : { toDate: () => new Date() },
          ativo: row.ativo,
          unidadeId: row.unidade_id,
        };
      });

      setGrupos(list);
    } catch (error) {
      console.error("Erro ao carregar grupos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGrupos();
  }, [igrejaId, unidadeId, unidadesAcessiveis.join(",")]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grupoParaEditar || !igrejaId) return;

    if (!nomeEdit.trim()) {
      toast.error("Nome do grupo é obrigatório");
      return;
    }

    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from("grupos")
        .update({
          nome: nomeEdit.trim(),
          tipo: tipoEdit,
          link_whatsapp: linkEdit.trim() || null,
        })
        .eq("id", grupoParaEditar.id);

      if (error) throw error;

      toast.success("Grupo atualizado com sucesso!");
      setGrupoParaEditar(null);
      loadGrupos();
    } catch (error) {
      console.error("Erro ao editar grupo:", error);
      toast.error("Erro ao editar grupo");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!grupoToDelete || !igrejaId) return;

    try {
      const { error } = await supabase
        .from("grupos")
        .update({
          ativo: false,
        })
        .eq("id", grupoToDelete.id);

      if (error) throw error;
      toast.success("Grupo excluído com sucesso");
      setGrupoToDelete(null);
      loadGrupos();
    } catch (error) {
      console.error("Erro ao excluir grupo:", error);
      toast.error("Erro ao excluir grupo");
    }
  };

  const formatDate = (timestamp: { toDate: () => Date } | undefined) => {
    if (!timestamp) return "-";
    return timestamp.toDate().toLocaleDateString("pt-BR");
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "estudo":
        return "bg-blue-500";
      case "visita":
        return "bg-green-500";
      case "acompanhamento":
        return "bg-amber-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    return phone;
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grupos</h1>
          <p className="text-muted-foreground">
            {grupos.length} grupo{grupos.length !== 1 && "s"} ativo
            {grupos.length !== 1 && "s"}
          </p>
        </div>
        <Button onClick={() => setShowNovoGrupo(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Criar Grupo
        </Button>
      </div>

      {/* Groups List */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="mb-4 h-6 w-32" />
                <Skeleton className="mb-2 h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : grupos.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <Empty>
              <EmptyMedia variant="icon">
                <UsersRound className="h-10 w-10" />
              </EmptyMedia>
              <EmptyTitle>Nenhum grupo criado</EmptyTitle>
              <EmptyDescription>
                Crie grupos de WhatsApp baseados na proximidade dos membros para
                facilitar estudos, visitas e acompanhamento.
              </EmptyDescription>
              <Button onClick={() => setShowNovoGrupo(true)} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Grupo
              </Button>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {grupos.map((grupo) => (
            <Card key={grupo.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{grupo.nome}</CardTitle>
                    <Badge
                      className={`${getTipoColor(grupo.tipo)} text-white`}
                    >
                      {TIPOS_GRUPO[grupo.tipo]}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setGrupoParaVisualizar(grupo)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setGrupoParaEditar(grupo)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      {grupo.linkWhatsApp && (
                        <DropdownMenuItem asChild>
                          <a
                            href={grupo.linkWhatsApp}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="mr-2 h-4 w-4" />
                            Abrir WhatsApp
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setGrupoToDelete(grupo)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Leader */}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Líder:</span>
                  <span className="font-medium">
                    {grupo.liderNome || "N/A"}
                  </span>
                </div>

                {/* Members count */}
                <div className="flex items-center gap-2 text-sm">
                  <UsersRound className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Membros:</span>
                  <span className="font-medium">{grupo.membrosIds.length}</span>
                </div>

                {/* Radius */}
                {grupo.raioKm && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Raio:</span>
                    <span className="font-medium">{grupo.raioKm} km</span>
                  </div>
                )}

                {/* Date */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Criado em:</span>
                  <span className="font-medium">
                    {formatDate(grupo.dataCriacao)}
                  </span>
                </div>

                {/* Member names preview */}
                {grupo.membrosNomes && grupo.membrosNomes.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      {grupo.membrosNomes.join(", ")}
                      {grupo.membrosIds.length > 3 &&
                        ` e mais ${grupo.membrosIds.length - 3}`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!grupoToDelete}
        onOpenChange={() => setGrupoToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Grupo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o grupo{" "}
              <strong>{grupoToDelete?.nome}</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sheet para Visualizar Grupo */}
      <Sheet open={!!grupoParaVisualizar} onOpenChange={(open) => !open && setGrupoParaVisualizar(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-6">
          {grupoParaVisualizar && (
            <div className="space-y-6 pt-4">
              <SheetHeader className="p-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UsersRound className="h-6 w-6" />
                  </div>
                  <div>
                    <SheetTitle className="text-2xl font-bold">{grupoParaVisualizar.nome}</SheetTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge className={`${getTipoColor(grupoParaVisualizar.tipo)} text-white`}>
                        {TIPOS_GRUPO[grupoParaVisualizar.tipo]}
                      </Badge>
                      {grupoParaVisualizar.raioKm && (
                        <Badge variant="outline">{grupoParaVisualizar.raioKm} km de raio</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <Separator />

              {/* Informações Básicas */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Detalhes</h3>
                <div className="grid gap-3 grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Líder do Grupo</p>
                    <p className="text-sm font-medium">{grupoParaVisualizar.liderNome || "N/A"}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Criado em</p>
                    <p className="text-sm font-medium">{formatDate(grupoParaVisualizar.dataCriacao)}</p>
                  </div>
                </div>
                {grupoParaVisualizar.linkWhatsApp && (
                  <Button asChild className="w-full mt-2" variant="outline">
                    <a href={grupoParaVisualizar.linkWhatsApp} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4 text-green-500" />
                      Abrir Grupo no WhatsApp
                    </a>
                  </Button>
                )}
              </div>

              {/* Membros do Grupo */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Membros do Grupo ({grupoParaVisualizar.membrosIds.length})
                </h3>
                {loadingMembros ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : membrosDoGrupo.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                    Nenhum membro listado neste grupo.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {membrosDoGrupo.map((membro) => (
                      <div key={membro.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{membro.nome}</div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            {membro.telefone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {formatPhone(membro.telefone)}
                              </span>
                            )}
                            {membro.endereco?.bairro && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {membro.endereco.bairro}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] h-5">
                          {membro.tipo === "visitante" ? "Visitante" : "Membro"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet para Editar Grupo */}
      <Sheet open={!!grupoParaEditar} onOpenChange={(open) => !open && setGrupoParaEditar(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto p-6">
          {grupoParaEditar && (
            <div className="space-y-6 pt-4">
              <SheetHeader className="p-0">
                <SheetTitle className="text-2xl font-bold">Editar Grupo</SheetTitle>
                <SheetDescription className="flex flex-col gap-0.5">
                  <span>Atualize as configurações básicas do grupo</span>
                  {igrejaNome && (
                    <span className="text-xs text-muted-foreground mt-0.5">
                      Igreja: <strong className="text-foreground">{igrejaNome}</strong>
                    </span>
                  )}
                </SheetDescription>
              </SheetHeader>
              
              <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="nomeEdit">Nome do Grupo *</Label>
                  <Input
                    id="nomeEdit"
                    value={nomeEdit}
                    onChange={(e) => setNomeEdit(e.target.value)}
                    placeholder="Nome do grupo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipoEdit">Tipo do Grupo *</Label>
                  <Select value={tipoEdit} onValueChange={(v) => setTipoEdit(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TIPOS_GRUPO) as TipoGrupo[]).map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {TIPOS_GRUPO[tipo]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkEdit">Link do WhatsApp</Label>
                  <Input
                    id="linkEdit"
                    value={linkEdit}
                    onChange={(e) => setLinkEdit(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setGrupoParaEditar(null)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={savingEdit}>
                    {savingEdit && <Spinner className="mr-2 h-4 w-4" />}
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet para Criar Novo Grupo */}
      <Sheet open={showNovoGrupo} onOpenChange={setShowNovoGrupo}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto p-6">
          <SheetHeader className="p-0">
            <SheetTitle className="text-2xl font-bold">Criar Grupo</SheetTitle>
            <SheetDescription className="flex flex-col gap-0.5">
              <span>Selecione um líder e encontre membros próximos.</span>
              {igrejaNome && (
                <span className="text-xs text-muted-foreground mt-0.5">
                  Igreja: <strong className="text-foreground">{igrejaNome}</strong>
                </span>
              )}
            </SheetDescription>
          </SheetHeader>
          <GrupoForm
            onSuccess={() => {
              setShowNovoGrupo(false);
              loadGrupos();
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
