"use client";

import { useEffect, useState } from "react";
import { query, onSnapshot, orderBy, collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { getUnidadesCollection } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import {
  ShieldAlert,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Building2,
  Users,
  User,
  Phone,
} from "lucide-react";
import {
  RegionalSetor,
  Unidade,
  TIPOS_UNIDADE,
} from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { RegionalForm } from "@/components/regionais/regional-form";
import { toast } from "sonner";

interface RegionalComContagem extends RegionalSetor {
  hospedeiraNome: string;
  totalMembros: number;
  igrejasMembrosNomes: string[];
}

export default function RegionaisPage() {
  const { igrejaId, nivelAcesso } = useAuth();
  const [regionais, setRegionais] = useState<RegionalComContagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [regionalParaVisualizar, setRegionalParaVisualizar] = useState<RegionalComContagem | null>(null);
  const [regionalParaEditar, setRegionalParaEditar] = useState<RegionalComContagem | null>(null);
  const [isNovaOpen, setIsNovaOpen] = useState(false);

  const canManage = nivelAcesso === "full" || nivelAcesso === "admin";

  useEffect(() => {
    if (!igrejaId || !db) {
      setLoading(false);
      return;
    }

    // Listener para todas as unidades/igrejas (necessário para mapear nomes e membros)
    const unidadesRef = getUnidadesCollection(igrejaId);
    const qUnidades = query(unidadesRef, orderBy("nome", "asc"));

    // Listener para regionais_setores
    const regionaisRef = collection(db, "igrejas", igrejaId, "regionais_setores");
    const qRegionais = query(regionaisRef, orderBy("numero", "asc"));

    let todasUnidades: Unidade[] = [];
    const unsubUnidades = onSnapshot(qUnidades, (snapshot) => {
      todasUnidades = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }) as Unidade);
    });

    const unsubRegionais = onSnapshot(qRegionais, async (snapshot) => {
      const regionaisList: RegionalComContagem[] = [];

      for (const docSnap of snapshot.docs) {
        const regData = { id: docSnap.id, ...docSnap.data() } as RegionalSetor;
        
        // Encontra o nome da igreja hospedeira
        const hospedeira = todasUnidades.find((u) => u.id === regData.hospedeiraId);
        const hospedeiraNome = hospedeira?.nome || "Não definida";

        // Filtra congregações pertencentes a esta regional
        const igrejasPertencentes = todasUnidades.filter(
          (u) => u.regionalSetorId === regData.id && u.id !== regData.hospedeiraId
        );
        const igrejasMembrosNomes = igrejasPertencentes.map((u) => u.nome);

        // Soma membros de todas as igrejas desta regional (incluindo hospedeira)
        let totalMembros = 0;
        const todasIgrejasDaRegional = [regData.hospedeiraId, ...igrejasPertencentes.map((u) => u.id)];

        for (const unitId of todasIgrejasDaRegional) {
          try {
            const membrosRef = collection(db!, "igrejas", igrejaId, "unidades", unitId, "membros");
            const snapshotMembros = await getDocs(membrosRef);
            totalMembros += snapshotMembros.docs.filter((m) => m.data().ativo !== false).length;
          } catch {
            // Unidade vazia ou sem acesso
          }
        }

        regionaisList.push({
          ...regData,
          hospedeiraNome,
          totalMembros,
          igrejasMembrosNomes,
        });
      }

      setRegionais(regionaisList);
      setLoading(false);
    });

    return () => {
      unsubUnidades();
      unsubRegionais();
    };
  }, [igrejaId]);

  const handleDelete = async () => {
    if (!deleteId || !igrejaId) return;

    try {
      setDeleting(true);
      const docRef = doc(db!, "igrejas", igrejaId, "regionais_setores", deleteId);
      await deleteDoc(docRef);
      toast.success("Regional/Setor removida com sucesso!");
      setDeleteId(null);
    } catch (error) {
      console.error("Erro ao remover:", error);
      toast.error("Erro ao remover regional/setor.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredRegionais = regionais.filter((reg) => {
    const term = searchTerm.toLowerCase();
    return (
      reg.nome.toLowerCase().includes(term) ||
      reg.hospedeiraNome.toLowerCase().includes(term) ||
      (reg.dirigente && reg.dirigente.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Regionais e Setores</h1>
          <p className="text-muted-foreground">
            Gerencie as divisões administrativas e aglomerações de congregações
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setIsNovaOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Regional/Setor
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, dirigente ou igreja hospedeira..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid List */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRegionais.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <Empty>
              <EmptyMedia variant="icon">
                <ShieldAlert className="h-10 w-10" />
              </EmptyMedia>
              <EmptyTitle>Nenhuma Regional ou Setor cadastrado</EmptyTitle>
              <EmptyDescription>
                Regionais e Setores organizam a árvore e aglomeram congregações.
              </EmptyDescription>
              {canManage && (
                <Button onClick={() => setIsNovaOpen(true)} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Regional/Setor
                </Button>
              )}
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRegionais.map((reg) => (
            <Card key={reg.id} className="hover:shadow-md transition-shadow relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold">{reg.nome}</CardTitle>
                    <Badge variant="secondary" className="mt-1 font-semibold uppercase">
                      {reg.tipo}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRegionalParaVisualizar(reg)}>
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">Visualizar</span>
                    </Button>
                    {canManage && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRegionalParaEditar(reg)}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        {reg.nome !== "Regional 1" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(reg.id)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remover</span>
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm pt-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">Hospedeira: <strong>{reg.hospedeiraNome}</strong></span>
                </div>
                
                {reg.dirigente && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4 shrink-0" />
                    <span className="truncate">Dirigente: {reg.dirigente}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-muted-foreground border-t pt-2 mt-2">
                  <Users className="h-4 w-4 shrink-0" />
                  <span>{reg.totalMembros} membros na regional</span>
                </div>

                <div className="text-xs text-muted-foreground">
                  {reg.igrejasMembrosNomes.length > 0 ? (
                    <p className="truncate">
                      Congregações: {reg.igrejasMembrosNomes.join(", ")}
                    </p>
                  ) : (
                    <p className="italic">Nenhuma congregação vinculada</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Drawer: Novo Regional/Setor */}
      <Sheet open={isNovaOpen} onOpenChange={setIsNovaOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-6 overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Nova Regional ou Setor</SheetTitle>
            <SheetDescription>
              Cadastre e defina a igreja hospedeira do novo agrupamento
            </SheetDescription>
          </SheetHeader>
          <RegionalForm
            onSuccess={() => {
              setIsNovaOpen(false);
            }}
            onCancel={() => setIsNovaOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Drawer: Editar Regional/Setor */}
      <Sheet open={!!regionalParaEditar} onOpenChange={(open) => !open && setRegionalParaEditar(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-6 overflow-y-auto">
          {regionalParaEditar && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle>Editar {regionalParaEditar.nome}</SheetTitle>
                <SheetDescription>
                  Atualize os dados e a hospedeira da regional/setor
                </SheetDescription>
              </SheetHeader>
              <RegionalForm
                regionalId={regionalParaEditar.id}
                onSuccess={() => setRegionalParaEditar(null)}
                onCancel={() => setRegionalParaEditar(null)}
              />
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Drawer: Visualizar Detalhes */}
      <Sheet open={!!regionalParaVisualizar} onOpenChange={(open) => !open && setRegionalParaVisualizar(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-6 overflow-y-auto">
          {regionalParaVisualizar && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <SheetTitle>{regionalParaVisualizar.nome}</SheetTitle>
                  <Badge variant="secondary" className="uppercase">{regionalParaVisualizar.tipo}</Badge>
                </div>
                <SheetDescription>
                  Detalhes administrativos da Regional/Setor
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-semibold">Informações Administrativas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sede Hospedeira</span>
                      <span className="font-semibold">{regionalParaVisualizar.hospedeiraNome}</span>
                    </div>
                    {regionalParaVisualizar.dirigente && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dirigente</span>
                        <span className="font-semibold">{regionalParaVisualizar.dirigente}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total de Membros</span>
                      <span className="font-bold text-primary">{regionalParaVisualizar.totalMembros} membros</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-semibold">Congregações Pertencentes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {regionalParaVisualizar.igrejasMembrosNomes.length === 0 ? (
                      <p className="text-muted-foreground italic text-center py-4">
                        Nenhuma congregação vinculada.
                      </p>
                    ) : (
                      <ul className="list-disc list-inside space-y-1">
                        {regionalParaVisualizar.igrejasMembrosNomes.map((nome, index) => (
                          <li key={index} className="font-medium">{nome}</li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                {canManage && (
                  <Button
                    onClick={() => {
                      const reg = regionalParaVisualizar;
                      setRegionalParaVisualizar(null);
                      setRegionalParaEditar(reg);
                    }}
                  >
                    Editar
                  </Button>
                )}
                <Button variant="outline" onClick={() => setRegionalParaVisualizar(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Regional ou Setor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não removerá as congregações do sistema. Elas serão desvinculadas e
              ficarão sem regional/setor associado até serem remapeadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Confirmar Exclusão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
