"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  query,
  orderBy,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { getFamiliasCollection, getFamiliaDoc } from "@/lib/firestore";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
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
} from "lucide-react";
import { toast } from "sonner";
import { Familia, PARENTESCOS } from "@/lib/types";

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

  const canEdit = nivelAcesso === "admin" || nivelAcesso === "full";

  useEffect(() => {
    if (!igrejaId || unidadesAcessiveis.length === 0) {
      setLoading(false);
      return;
    }

    const unsubscribes: (() => void)[] = [];

    unidadesAcessiveis.forEach((unidadeId) => {
      const familiasRef = getFamiliasCollection(igrejaId, unidadeId);
      const q = query(familiasRef, orderBy("nome", "asc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const familiasData: FamiliaComUnidade[] = [];
        snapshot.forEach((docSnap) => {
          familiasData.push({ 
            id: docSnap.id, 
            ...docSnap.data(),
            unidadeId 
          } as FamiliaComUnidade);
        });
        
        setFamilias((prev) => {
          const outrosUnidades = prev.filter((f) => f.unidadeId !== unidadeId);
          return [...outrosUnidades, ...familiasData].sort((a, b) => 
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
  }, [igrejaId, unidadesAcessiveis]);

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
      const familiaRef = getFamiliaDoc(igrejaId, familiaToDeactivate.unidadeId, familiaToDeactivate.id);
      await updateDoc(familiaRef, { ativo: false });
      toast.success("Família desativada com sucesso");
      setFamiliaToDeactivate(null);
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
          <Button asChild>
            <Link href="/familias/nova">
              <Plus className="mr-2 h-4 w-4" />
              Nova Família
            </Link>
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
                <Button asChild className="mt-4">
                  <Link href="/familias/nova">
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar Família
                  </Link>
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
                      <DropdownMenuItem asChild>
                        <Link href={`/familias/${familia.id}?unidade=${familia.unidadeId}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Visualizar
                        </Link>
                      </DropdownMenuItem>
                      {canEdit && (
                        <>
                          <DropdownMenuItem asChild>
                            <Link href={`/familias/${familia.id}/editar?unidade=${familia.unidadeId}`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </Link>
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
    </div>
  );
}
