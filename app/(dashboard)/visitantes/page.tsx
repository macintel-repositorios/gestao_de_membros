"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { getVisitantesCollection, getVisitanteDoc } from "@/lib/firestore";
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
  DropdownMenuSeparator,
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
  Calendar,
  Building2,
  UserCheck,
  Link as LinkIcon,
  Copy,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import type { Visitante } from "@/lib/types";
import { QRCodeModal } from "@/components/qr-code-modal";

interface VisitanteComUnidade extends Visitante {
  unidadeId: string;
}

export default function VisitantesPage() {
  const { igrejaId, unidadeAtual, unidadesAcessiveis, todasUnidades, nivelAcesso, temAcessoTotal } = useAuth();
  const [visitantes, setVisitantes] = useState<VisitanteComUnidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUnidade, setFilterUnidade] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("ativos");
  const [visitanteToDeactivate, setVisitanteToDeactivate] = useState<VisitanteComUnidade | null>(null);

  const canEdit = nivelAcesso === "admin" || nivelAcesso === "full";

  useEffect(() => {
    if (!igrejaId || unidadesAcessiveis.length === 0) {
      setLoading(false);
      return;
    }

    const unsubscribes: (() => void)[] = [];

    unidadesAcessiveis.forEach((unidadeId) => {
      const visitantesRef = getVisitantesCollection(igrejaId, unidadeId);
      const q = query(visitantesRef, orderBy("dataVisita", "desc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const visitantesData: VisitanteComUnidade[] = [];
        snapshot.forEach((docSnap) => {
          visitantesData.push({ 
            id: docSnap.id, 
            ...docSnap.data(),
            unidadeId 
          } as VisitanteComUnidade);
        });
        
        setVisitantes((prev) => {
          const outrosUnidades = prev.filter((v) => v.unidadeId !== unidadeId);
          return [...outrosUnidades, ...visitantesData].sort((a, b) => {
            const dataA = a.dataVisita?.toDate?.() || new Date(0);
            const dataB = b.dataVisita?.toDate?.() || new Date(0);
            return dataB.getTime() - dataA.getTime();
          });
        });
        setLoading(false);
      });

      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [igrejaId, unidadesAcessiveis]);

  const filteredVisitantes = visitantes.filter((visitante) => {
    // Status filter
    if (filterStatus === "ativos" && !visitante.ativo) return false;
    if (filterStatus === "convertidos" && !visitante.convertidoParaMembro) return false;
    if (filterStatus === "inativos" && visitante.ativo) return false;

    // Unidade filter
    if (filterUnidade !== "todos" && visitante.unidadeId !== filterUnidade) return false;

    // Search filter
    const nome = visitante.nome || "";
    const telefone = visitante.telefone || "";
    const matchesSearch =
      nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      telefone.includes(searchTerm);

    return matchesSearch;
  });

  const handleDeactivate = async () => {
    if (!visitanteToDeactivate || !igrejaId) return;

    try {
      const visitanteRef = getVisitanteDoc(igrejaId, visitanteToDeactivate.unidadeId, visitanteToDeactivate.id);
      await updateDoc(visitanteRef, { ativo: false });
      toast.success("Visitante desativado com sucesso");
      setVisitanteToDeactivate(null);
    } catch (error) {
      console.error("Erro ao desativar visitante:", error);
      toast.error("Erro ao desativar visitante");
    }
  };

  const formatPhone = (phone: string) => {
    if (!phone) return "-";
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    return phone;
  };

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp?.toDate) return "-";
    return timestamp.toDate().toLocaleDateString("pt-BR");
  };

  const getUnidadeNome = (unidadeId: string) => {
    const unidade = todasUnidades.find((u) => u.id === unidadeId);
    return unidade?.nome || "Não definida";
  };

  const unidadesParaFiltro = todasUnidades.filter((u) => 
    unidadesAcessiveis.includes(u.id)
  );

  const copyPublicLink = () => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/cadastro/visitante?igreja=${igrejaId}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado para a área de transferência!");
  };

  const sharePublicLink = () => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/cadastro/visitante?igreja=${igrejaId}`;
    const text = "Preencha seu cadastro de visitante:";
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + " " + link)}`;
    window.open(whatsappUrl, "_blank");
  };

  // Estatísticas
  const totalAtivos = visitantes.filter(v => v.ativo).length;
  const totalConvertidos = visitantes.filter(v => v.convertidoParaMembro).length;
  const totalMes = visitantes.filter(v => {
    if (!v.dataVisita?.toDate) return false;
    const data = v.dataVisita.toDate();
    const agora = new Date();
    return data.getMonth() === agora.getMonth() && data.getFullYear() === agora.getFullYear();
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visitantes</h1>
          <p className="text-muted-foreground">
            Gerencie os visitantes da igreja
          </p>
        </div>
        <div className="flex gap-2">
          {igrejaId && unidadeAtual && (
            <QRCodeModal
              url={`${typeof window !== "undefined" ? window.location.origin : ""}/cadastro/visitante?igreja=${igrejaId}&unidade=${unidadeAtual.id}`}
              title="Cadastro de Visitante"
              description={`Cadastro para: ${unidadeAtual.nome}`}
              triggerLabel="QR Code Visitante"
            />
          )}
          {canEdit && (
            <Button asChild>
              <Link href="/visitantes/novo">
                <UserPlus className="mr-2 h-4 w-4" />
                Novo Visitante
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Visitantes Ativos</p>
                <p className="text-2xl font-bold">{totalAtivos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-500/10 p-3">
                <UserCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Convertidos a Membros</p>
                <p className="text-2xl font-bold">{totalConvertidos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-500/10 p-3">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Visitantes este Mês</p>
                <p className="text-2xl font-bold">{totalMes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {unidadesParaFiltro.length > 1 && (
            <Select value={filterUnidade} onValueChange={setFilterUnidade}>
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

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativos">Ativos</SelectItem>
              <SelectItem value="convertidos">Convertidos</SelectItem>
              <SelectItem value="inativos">Inativos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
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
      ) : filteredVisitantes.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <Empty>
              <EmptyMedia variant="icon">
                <Users className="h-10 w-10" />
              </EmptyMedia>
              <EmptyTitle>
                {visitantes.length === 0
                  ? "Nenhum visitante cadastrado"
                  : "Nenhum visitante encontrado"}
              </EmptyTitle>
              <EmptyDescription>
                {visitantes.length === 0
                  ? "Compartilhe o link de cadastro ou adicione visitantes manualmente."
                  : "Tente ajustar os filtros de busca."}
              </EmptyDescription>
              {visitantes.length === 0 && canEdit && (
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" onClick={sharePublicLink}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Compartilhar Link
                  </Button>
                  <Button asChild>
                    <Link href="/visitantes/novo">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Cadastrar Visitante
                    </Link>
                  </Button>
                </div>
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
                  <TableHead>Data da Visita</TableHead>
                  <TableHead className="hidden lg:table-cell">Primeira Visita</TableHead>
                  {unidadesParaFiltro.length > 1 && (
                    <TableHead className="hidden xl:table-cell">Unidade</TableHead>
                  )}
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisitantes.map((visitante) => (
                  <TableRow key={`${visitante.unidadeId}-${visitante.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{visitante.nome || "Sem nome"}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground md:hidden">
                          <Phone className="h-3 w-3" />
                          {formatPhone(visitante.telefone)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatPhone(visitante.telefone)}
                    </TableCell>
                    <TableCell>
                      {formatDate(visitante.dataVisita)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {visitante.primeiraVisita ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">Sim</Badge>
                      ) : (
                        <Badge variant="outline">Não</Badge>
                      )}
                    </TableCell>
                    {unidadesParaFiltro.length > 1 && (
                      <TableCell className="hidden xl:table-cell">
                        <div className="flex items-center gap-1 text-sm">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {getUnidadeNome(visitante.unidadeId)}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      {visitante.convertidoParaMembro ? (
                        <Badge className="bg-green-500">Convertido</Badge>
                      ) : visitante.ativo ? (
                        <Badge variant="secondary">Ativo</Badge>
                      ) : (
                        <Badge variant="outline">Inativo</Badge>
                      )}
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
                            <Link href={`/visitantes/${visitante.id}?unidade=${visitante.unidadeId}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </Link>
                          </DropdownMenuItem>
                          {canEdit && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/visitantes/${visitante.id}/editar?unidade=${visitante.unidadeId}`}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </Link>
                              </DropdownMenuItem>
                              {!visitante.convertidoParaMembro && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem asChild>
                                    <Link href={`/visitantes/${visitante.id}/converter?unidade=${visitante.unidadeId}`}>
                                      <UserCheck className="mr-2 h-4 w-4" />
                                      Converter para Membro
                                    </Link>
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setVisitanteToDeactivate(visitante)}
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
        open={!!visitanteToDeactivate}
        onOpenChange={() => setVisitanteToDeactivate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Visitante</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar{" "}
              <strong>{visitanteToDeactivate?.nome}</strong>? O visitante não será
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
