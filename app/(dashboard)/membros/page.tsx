"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { getMembrosCollection, getMembroDoc } from "@/lib/firestore";
import { db } from "@/lib/firebase";
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
  UserPlus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  UserX,
  Users,
  Phone,
  MapPin,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Membro,
  TipoMembro,
  CargoMembro,
  TIPOS_MEMBRO,
  CARGOS_MEMBRO,
  TIPOS_UNIDADE,
} from "@/lib/types";
import { QRCodeModal } from "@/components/qr-code-modal";
import { useUnidadeSelecionada } from "@/contexts/unidade-selecionada-context";

// Membro com unidadeId para rastreamento
interface MembroComUnidade extends Membro {
  unidadeId: string;
}

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

  const canEdit = nivelAcesso === "admin" || nivelAcesso === "full";

  // Determina quais unidades carregar baseado na seleção
  const unidadesParaCarregar = visualizandoTodas 
    ? unidadesAcessiveis 
    : unidadeSelecionada 
      ? [unidadeSelecionada.id] 
      : unidadesAcessiveis;

  useEffect(() => {
    if (!igrejaId || unidadesParaCarregar.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMembros([]);
    const unsubscribes: (() => void)[] = [];

    // Escuta membros das unidades selecionadas
    unidadesParaCarregar.forEach((unidadeId) => {
      const membrosRef = getMembrosCollection(igrejaId, unidadeId);
      const q = query(membrosRef, orderBy("nome", "asc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const membrosData: MembroComUnidade[] = [];
        snapshot.forEach((docSnap) => {
          membrosData.push({ 
            id: docSnap.id, 
            ...docSnap.data(),
            unidadeId 
          } as MembroComUnidade);
        });
        
        // Atualiza os membros dessa unidade
        setMembros((prev) => {
          const outrosUnidades = prev.filter((m) => m.unidadeId !== unidadeId);
          return [...outrosUnidades, ...membrosData].sort((a, b) => 
            a.nome.localeCompare(b.nome)
          );
        });
        setLoading(false);
      });

      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
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
      const membroRef = getMembroDoc(igrejaId, memberToDeactivate.unidadeId, memberToDeactivate.id);
      await updateDoc(membroRef, { ativo: false });
      toast.success("Membro desativado com sucesso");
      setMemberToDeactivate(null);
    } catch (error) {
      console.error("Erro ao desativar membro:", error);
      toast.error("Erro ao desativar membro");
    }
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    return phone;
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
          {canEdit && igrejaId && unidadeSelecionada && (
            <QRCodeModal
              url={`${typeof window !== "undefined" ? window.location.origin : ""}/cadastro/membro?igreja=${igrejaId}&unidade=${unidadeSelecionada.id}`}
              title="Cadastro de Membro"
              description={`Cadastro para: ${unidadeSelecionada.nome}`}
              triggerLabel="QR Code Membro"
            />
          )}
          {canEdit && (
            <Button asChild>
              <Link href="/membros/novo">
                <UserPlus className="mr-2 h-4 w-4" />
                Novo Membro
              </Link>
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
                <Button asChild className="mt-4">
                  <Link href="/membros/novo">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Cadastrar Membro
                  </Link>
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
                          <DropdownMenuItem asChild>
                            <Link href={`/membros/${membro.id}?unidade=${membro.unidadeId}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </Link>
                          </DropdownMenuItem>
                          {canEdit && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/membros/${membro.id}/editar?unidade=${membro.unidadeId}`}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </Link>
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
    </div>
  );
}
