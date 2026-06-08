"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { MembroForm } from "@/components/membros/membro-form";
import {
  UserPlus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  UserX,
  Users,
  Phone,
  Mail,
  MapPin,
  Building2,
  Copy,
  Calendar,
  Briefcase,
  Cake,
  Home,
  Hospital,
  BookOpen,
  MessageCircle,
  HeartHandshake,
  User,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Membro,
  TipoMembro,
  CargoMembro,
  Acompanhamento,
  TipoAcompanhamento,
  TIPOS_MEMBRO,
  CARGOS_MEMBRO,
  TIPOS_UNIDADE,
  TIPOS_ACOMPANHAMENTO,
  CORES_ACOMPANHAMENTO,
} from "@/lib/types";
import { QRCodeModal } from "@/components/qr-code-modal";
import { useUnidadeSelecionada } from "@/contexts/unidade-selecionada-context";
import { CartaoMembroModal } from "@/components/membros/cartao-membro-modal";

// Membro com unidadeId para rastreamento
interface MembroComUnidade extends Membro {
  unidadeId: string;
}

const ICONES_ACOMPANHAMENTO: Record<TipoAcompanhamento, React.ComponentType<{ className?: string }>> = {
  visita_residencial: Home,
  visita_hospitalar: Hospital,
  culto_no_lar: BookOpen,
  aconselhamento: MessageCircle,
};

export default function MembrosPage() {
  const { usuario, igrejaId, unidadesAcessiveis, todasUnidades, nivelAcesso, temAcessoTotal } = useAuth();
  const { unidadeSelecionada, visualizandoTodas } = useUnidadeSelecionada();
  const [membros, setMembros] = useState<MembroComUnidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<TipoMembro | "todos">("todos");
  const [filterCargo, setFilterCargo] = useState<CargoMembro | "todos">("todos");
  const [filterUnidade, setFilterUnidade] = useState<string>("todos");
  const [memberToDeactivate, setMemberToDeactivate] = useState<MembroComUnidade | null>(null);

  // Estados para Drawer/Sheet
  const editFormRef = useRef<any>(null);
  const [showNovoMembro, setShowNovoMembro] = useState(false);
  const [membroParaVisualizar, setMembroParaVisualizar] = useState<MembroComUnidade[] | any>(null);
  const [membroParaEditar, setMembroParaEditar] = useState<MembroComUnidade[] | any>(null);
  const [membroParaCartao, setMembroParaCartao] = useState<MembroComUnidade[] | any>(null);
  const [acompanhamentos, setAcompanhamentos] = useState<Acompanhamento[]>([]);
  const [loadingAcomp, setLoadingAcomp] = useState(false);

  // Carrega acompanhamentos quando visualizando um membro
  useEffect(() => {
    if (!igrejaId || !membroParaVisualizar) {
      setAcompanhamentos([]);
      return;
    }

    const loadAcompanhamentos = async () => {
      setLoadingAcomp(true);
      try {
        const { data, error } = await supabase
          .from("acompanhamentos")
          .select("*")
          .eq("membro_id", membroParaVisualizar.id)
          .order("data", { ascending: false });
        
        if (error) throw error;
        
        const list = (data || []).map(row => ({
          id: row.id,
          tipo: row.tipo as TipoAcompanhamento,
          data: { toDate: () => new Date(row.data) },
          descricao: row.descricao,
          responsavelNome: row.responsavel_nome || "",
          membroId: row.membro_id,
          membroNome: membroParaVisualizar.nome,
          responsavelUid: row.responsavel_uid || "",
          dataCriacao: row.data_criacao ? { toDate: () => new Date(row.data_criacao) } : { toDate: () => new Date() },
        }));
        
        setAcompanhamentos(list);
      } catch (error) {
        console.error("Erro ao carregar acompanhamentos:", error);
      } finally {
        setLoadingAcomp(false);
      }
    };

    loadAcompanhamentos();
  }, [igrejaId, membroParaVisualizar]);

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    return phone;
  };

  const formatCep = (cep: string) => {
    if (cep.length === 8) {
      return `${cep.slice(0, 5)}-${cep.slice(5)}`;
    }
    return cep;
  };

  const formatDate = (timestamp: { toDate: () => Date } | undefined) => {
    if (!timestamp) return "-";
    return timestamp.toDate().toLocaleDateString("pt-BR");
  };

  const canEdit = nivelAcesso === "admin" || nivelAcesso === "full";

  // Determina quais unidades carregar baseado na seleção
  const unidadesParaCarregar = visualizandoTodas 
    ? unidadesAcessiveis 
    : unidadeSelecionada 
      ? [unidadeSelecionada.id] 
      : unidadesAcessiveis;

  const loadMembros = async () => {
    if (!igrejaId || unidadesParaCarregar.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("membros")
        .select("*")
        .eq("igreja_id", igrejaId)
        .in("unidade_id", unidadesParaCarregar)
        .order("nome", { ascending: true });

      if (error) throw error;

      const list: MembroComUnidade[] = (data || []).map(row => ({
        id: row.id,
        nome: row.nome,
        tipo: row.tipo as TipoMembro,
        cargo: row.cargo as CargoMembro,
        cargoDescricao: row.cargo_descricao || "",
        telefone: row.telefone || "",
        email: row.email || "",
        fotoUrl: row.foto_url || "",
        ativo: row.ativo ?? (row.situacao === "ativo"),
        observacoes: row.observacoes || "",
        dataNascimento: row.data_nascimento ? { toDate: () => new Date(row.data_nascimento + "T12:00:00") } : undefined,
        dataCadastro: row.data_cadastro ? { toDate: () => new Date(row.data_cadastro + "T12:00:00") } : { toDate: () => new Date() },
        dataBatismo: row.data_batismo ? { toDate: () => new Date(row.data_batismo + "T12:00:00") } : undefined,
        unidadeId: row.unidade_id,
        coordenadas: row.latitude && row.longitude ? { lat: row.latitude, lng: row.longitude } : { lat: 0, lng: 0 },
        endereco: {
          logradouro: row.logradouro || "",
          numero: row.numero || "",
          complemento: row.complemento || "",
          bairro: row.bairro || "",
          cidade: row.cidade || "",
          estado: row.estado || "",
          cep: row.cep || "",
        },
        criadoPor: row.criado_por || "",
        // Mapeamento dos campos adicionais que estavam faltando
        sexo: row.sexo || undefined,
        estadoCivil: row.estado_civil || undefined,
        nomeConjuge: row.nome_conjuge || "",
        conjugeId: row.conjuge_id || undefined,
        temFuncaoIgreja: row.tem_funcao_igreja || false,
        funcoes: row.funcoes || [],
        funcaoDescricao: row.funcao_descricao || "",
        departamentos: row.departamentos || [],
        departamento_descricao: row.departamento_descricao || "",
        ehLider: row.eh_lider || false,
        liderDe: row.lider_de || "",
        grupoId: row.grupo_id || undefined,
        dataConversao: row.data_conversao ? { toDate: () => new Date(row.data_conversao + "T12:00:00") } : undefined,
      }));

      setMembros(list);
    } catch (err) {
      console.error("Erro ao carregar membros:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembros();
  }, [igrejaId, unidadesParaCarregar.join(",")]);

  const filteredMembros = membros.filter((membro) => {
    // Only show active members (exclude visitantes - they have their own page now)
    if (!membro.ativo) return false;
    if (membro.tipo === "visitante") return false;

    // Unidade filter
    if (filterUnidade !== "todos" && membro.unidadeId !== filterUnidade) return false;

    // Search filter
    const matchesSearch =
      membro.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      membro.telefone.includes(searchTerm) ||
      membro.endereco?.bairro?.toLowerCase().includes(searchTerm.toLowerCase());

    // Type filter
    const matchesTipo = filterTipo === "todos" || membro.tipo === filterTipo;

    // Cargo filter
    const matchesCargo =
      filterCargo === "todos" ||
      (membro.cargo && membro.cargo === filterCargo);

    return matchesSearch && matchesTipo && matchesCargo;
  });

  const handleDeactivate = async () => {
    if (!memberToDeactivate || !igrejaId) return;

    try {
      const { error } = await supabase
        .from("membros")
        .update({ situacao: "inativo" })
        .eq("id", memberToDeactivate.id);

      if (error) throw error;
      toast.success("Membro desativado com sucesso");
      setMemberToDeactivate(null);
      loadMembros();
    } catch (error) {
      console.error("Erro ao desativar membro:", error);
      toast.error("Erro ao desativar membro");
    }
  };

  const getUnidadeNome = (unidadeId: string) => {
    const unidade = todasUnidades.find((u) => u.id === unidadeId);
    return unidade?.nome || "Não definida";
  };

  // Unidades acessíveis para o filtro
  const unidadesParaFiltro = todasUnidades.filter((u) => 
    unidadesAcessiveis.includes(u.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Membros</h1>
          <p className="text-muted-foreground">
            {filteredMembros.length} membro{filteredMembros.length !== 1 && "s"}{" "}
            {visualizandoTodas 
              ? "em todas as unidades" 
              : unidadeSelecionada 
                ? `em ${unidadeSelecionada.nome}` 
                : `em ${unidadesParaCarregar.length} unidade(s)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && igrejaId && (
            <QRCodeModal
              url={`${typeof window !== "undefined" ? window.location.origin : ""}/cadastro/membro?igreja=${igrejaId}${unidadeSelecionada ? `&unidade=${unidadeSelecionada.id}` : ""}`}
              title="Cadastro de Membro"
              description={unidadeSelecionada ? `Cadastro para congregação: ${unidadeSelecionada.nome}` : "Cadastro para a Igreja (Membro poderá selecionar sua congregação)"}
              triggerLabel="QR Code Membro"
            />
          )}
          {canEdit && (
            <Button onClick={() => setShowNovoMembro(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Membro
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou bairro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Filtro de Unidade */}
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

          <Select
            value={filterTipo}
            onValueChange={(v) => setFilterTipo(v as TipoMembro | "todos")}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {(Object.keys(TIPOS_MEMBRO) as TipoMembro[]).map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {TIPOS_MEMBRO[tipo]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterCargo}
            onValueChange={(v) => setFilterCargo(v as CargoMembro | "todos")}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os cargos</SelectItem>
              {(Object.keys(CARGOS_MEMBRO) as CargoMembro[]).map((cargo) => (
                <SelectItem key={cargo} value={cargo}>
                  {CARGOS_MEMBRO[cargo]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredMembros.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <Empty>
              <EmptyMedia variant="icon">
                <Users className="h-10 w-10" />
              </EmptyMedia>
              <EmptyTitle>
                {membros.length === 0
                  ? "Nenhum membro cadastrado"
                  : "Nenhum membro encontrado"}
              </EmptyTitle>
              <EmptyDescription>
                {membros.length === 0
                  ? "Comece cadastrando o primeiro membro da igreja."
                  : "Tente ajustar os filtros de busca."}
              </EmptyDescription>
              {membros.length === 0 && canEdit && (
                <Button onClick={() => setShowNovoMembro(true)} className="mt-4">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Cadastrar Membro
                </Button>
              )}
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Telefone</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden lg:table-cell">Cargo</TableHead>
                  {unidadesParaFiltro.length > 1 && (
                    <TableHead className="hidden xl:table-cell">Unidade</TableHead>
                  )}
                  <TableHead className="hidden sm:table-cell">Bairro</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembros.map((membro) => (
                  <TableRow key={`${membro.unidadeId}-${membro.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={membro.fotoUrl || undefined} alt={membro.nome} />
                          <AvatarFallback className="text-xs">
                            {membro.nome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{membro.nome}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground md:hidden">
                            <Phone className="h-3 w-3" />
                            {formatPhone(membro.telefone)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatPhone(membro.telefone)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        style={{
                          backgroundColor: `var(--type-${membro.tipo})`,
                          color: "white",
                        }}
                      >
                        {TIPOS_MEMBRO[membro.tipo]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {membro.cargo ? (
                        <span className="text-sm">
                          {membro.cargo === "outro"
                            ? membro.cargoDescricao
                            : CARGOS_MEMBRO[membro.cargo]}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    {unidadesParaFiltro.length > 1 && (
                      <TableCell className="hidden xl:table-cell">
                        <div className="flex items-center gap-1 text-sm">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {getUnidadeNome(membro.unidadeId)}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {membro.endereco?.bairro || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setMembroParaVisualizar(membro)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setMembroParaCartao(membro)}
                            >
                              <CreditCard className="mr-2 h-4 w-4" />
                              Gerar Cartão
                            </DropdownMenuItem>
                            {canEdit && (
                            <>
                              <DropdownMenuItem
                                onClick={() => setMembroParaEditar(membro)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                                  const link = `${origin}/cadastro/membro?igreja=${igrejaId}&unidade=${membro.unidadeId}&membro=${membro.id}`;
                                  navigator.clipboard.writeText(link);
                                  toast.success("Link de atualização copiado para a área de transferência!");
                                }}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copiar Link de Atualização
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setMemberToDeactivate(membro)}
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Desativar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog
        open={!!memberToDeactivate}
        onOpenChange={() => setMemberToDeactivate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar{" "}
              <strong>{memberToDeactivate?.nome}</strong>? O membro não será
              excluído, apenas ficará inativo no sistema.
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
      {/* Sheet para Visualizar Detalhes do Membro */}
      <Sheet open={!!membroParaVisualizar} onOpenChange={(open) => !open && setMembroParaVisualizar(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-6">
          {membroParaVisualizar && (
            <div className="space-y-6 pt-4">
              <SheetHeader className="p-0">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={membroParaVisualizar.fotoUrl || undefined} alt={membroParaVisualizar.nome} />
                    <AvatarFallback className="text-xl">
                      {membroParaVisualizar.nome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-2xl font-bold">{membroParaVisualizar.nome}</SheetTitle>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        style={{
                          backgroundColor: `var(--type-${membroParaVisualizar.tipo})`,
                          color: "white",
                        }}
                      >
                        {TIPOS_MEMBRO[membroParaVisualizar.tipo]}
                      </Badge>
                      {membroParaVisualizar.cargo && (
                        <Badge variant="outline">
                          {membroParaVisualizar.cargo === "outro"
                            ? membroParaVisualizar.cargoDescricao
                            : CARGOS_MEMBRO[membroParaVisualizar.cargo]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <Separator />

              {/* Informações de Contato */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Informações de Contato
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <a href={`tel:+55${membroParaVisualizar.telefone}`} className="text-sm font-medium hover:underline">
                        {formatPhone(membroParaVisualizar.telefone)}
                      </a>
                    </div>
                  </div>
                  {membroParaVisualizar.email && (
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">E-mail</p>
                        <a href={`mailto:${membroParaVisualizar.email}`} className="text-sm font-medium hover:underline truncate block">
                          {membroParaVisualizar.email}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço
                </h3>
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="text-sm font-medium">
                    {membroParaVisualizar.endereco?.logradouro}, {membroParaVisualizar.endereco?.numero}
                    {membroParaVisualizar.endereco?.complemento && ` - ${membroParaVisualizar.endereco?.complemento}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {membroParaVisualizar.endereco?.bairro} - {membroParaVisualizar.endereco?.cidade}/{membroParaVisualizar.endereco?.estado}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CEP: {formatCep(membroParaVisualizar.endereco?.cep || "")}
                  </p>
                    <div className="pt-2 flex flex-col gap-2 sm:flex-row">
                      {membroParaVisualizar.coordenadas && (
                        <Button variant="outline" size="sm" asChild className="w-full">
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${membroParaVisualizar.coordenadas.lat},${membroParaVisualizar.coordenadas.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MapPin className="mr-1.5 h-3.5 w-3.5" />
                            Traçar Rota
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" asChild className="w-full">
                        <a
                          href={`https://wa.me/55${membroParaVisualizar.telefone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Phone className="mr-1.5 h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setMembroParaCartao(membroParaVisualizar)}
                        className="w-full"
                      >
                        <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                        Gerar Cartão
                      </Button>
                    </div>
                </div>
              </div>

              {/* Datas Importantes */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Datas Importantes
                </h3>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                  {membroParaVisualizar.dataNascimento && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Aniversário</p>
                      <p className="text-sm font-medium">
                        {format(membroParaVisualizar.dataNascimento.toDate(), "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Data de Cadastro</p>
                    <p className="text-sm font-medium">{formatDate(membroParaVisualizar.dataCadastro)}</p>
                  </div>
                  {membroParaVisualizar.dataBatismo && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Data de Batismo</p>
                      <p className="text-sm font-medium">{formatDate(membroParaVisualizar.dataBatismo)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Histórico de Acompanhamento */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <HeartHandshake className="h-4 w-4" />
                  Histórico de Acompanhamento
                </h3>
                {loadingAcomp ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : acompanhamentos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                    Nenhum acompanhamento registrado para este membro.
                  </p>
                ) : (
                  <div className="relative border rounded-lg divide-y bg-muted/20">
                    {acompanhamentos.map((acomp) => {
                      const AcompIcon = ICONES_ACOMPANHAMENTO[acomp.tipo];
                      return (
                        <div key={acomp.id} className="p-3 space-y-1.5 hover:bg-muted/40 transition-colors">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5 px-1.5"
                              style={{
                                borderColor: CORES_ACOMPANHAMENTO[acomp.tipo],
                                color: CORES_ACOMPANHAMENTO[acomp.tipo],
                              }}
                            >
                              {TIPOS_ACOMPANHAMENTO[acomp.tipo]}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(acomp.data.toDate(), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {acomp.descricao}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Por: {acomp.responsavelNome}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Observações */}
              {membroParaVisualizar.observacoes && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Observações</h3>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted/40 p-3 rounded-lg border">
                    {membroParaVisualizar.observacoes}
                  </p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet para Editar Membro */}
      <Sheet 
        open={!!membroParaEditar} 
        onOpenChange={async (open) => {
          if (!open) {
            if (editFormRef.current?.isDirty()) {
              toast.loading("Salvando alterações...");
              const success = await editFormRef.current.submitForm();
              toast.dismiss();
              if (success) {
                toast.success("Alterações salvas automaticamente!");
              } else {
                toast.error("Erro ao salvar alterações automáticas. Verifique os campos obrigatórios.");
                return;
              }
            }
            setMembroParaEditar(null);
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-6">
          {membroParaEditar && (
            <div className="space-y-6 pt-4">
              <SheetHeader className="p-0">
                <SheetTitle className="text-2xl font-bold">Editar Membro</SheetTitle>
                <SheetDescription>
                  Atualize as informações cadastrais de {membroParaEditar.nome}
                </SheetDescription>
              </SheetHeader>
              <MembroForm
                ref={editFormRef}
                membro={membroParaEditar}
                unidadeIdParam={membroParaEditar.unidadeId}
                onSuccess={() => {
                  setMembroParaEditar(null);
                  toast.success("Membro atualizado com sucesso!");
                  loadMembros();
                }}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet para Cadastrar Novo Membro */}
      <Sheet open={showNovoMembro} onOpenChange={setShowNovoMembro}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-6">
          <SheetHeader className="p-0">
            <SheetTitle className="text-2xl font-bold">Novo Membro</SheetTitle>
            <SheetDescription>
              Cadastre um novo membro no sistema.
            </SheetDescription>
          </SheetHeader>
          <div className="pt-4">
            <MembroForm
              onSuccess={() => {
                setShowNovoMembro(false);
                toast.success("Membro cadastrado com sucesso!");
                loadMembros();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {membroParaCartao && (
        <CartaoMembroModal
          membro={membroParaCartao}
          open={!!membroParaCartao}
          onOpenChange={(open) => !open && setMembroParaCartao(null)}
        />
      )}
    </div>
  );
}
