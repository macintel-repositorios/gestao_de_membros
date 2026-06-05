"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getUsuariosCollection, getGruposCollection } from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { toast } from "sonner";
import { Shield, Users, Settings, Phone, UserX } from "lucide-react";
import { Usuario, Grupo, NivelAcesso, NIVEIS_ACESSO } from "@/lib/types";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const { usuario, igrejaId, unidadesAcessiveis, unidadeId } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [userToDeactivate, setUserToDeactivate] = useState<Usuario | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (usuario && usuario.nivelAcesso !== "admin" && usuario.nivelAcesso !== "full") {
      router.push("/");
      toast.error("Acesso restrito a administradores");
    }
  }, [usuario, router]);

  // Load users and groups
  useEffect(() => {
    if (!igrejaId || unidadesAcessiveis.length === 0) {
      setLoading(false);
      return;
    }

    // Users are stored under the church
    const usersRef = getUsuariosCollection(igrejaId);
    const q = query(usersRef, orderBy("dataCriacao", "desc"));

    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      const usersData: Usuario[] = [];
      snapshot.forEach((docSnap) => {
        const userData = { uid: docSnap.id, ...docSnap.data() } as Usuario;
        usersData.push(userData);
      });
      setUsuarios(usersData);
      setLoading(false);
    });

    // Load grupos from accessible units
    const loadGrupos = async () => {
      try {
        const gruposData: Grupo[] = [];
        
        for (const uId of unidadesAcessiveis) {
          const gruposRef = getGruposCollection(igrejaId, uId);
          const snapshot = await getDocs(gruposRef);
          snapshot.forEach((docSnap) => {
            gruposData.push({ id: docSnap.id, unidadeId: uId, ...docSnap.data() } as unknown as Grupo);
          });
        }
        
        setGrupos(gruposData);
      } catch (error) {
        console.error("Erro ao carregar grupos:", error);
      }
    };
    
    loadGrupos();

    return () => {
      unsubscribeUsers();
    };
  }, [igrejaId, unidadesAcessiveis]);

  const handleChangeAccess = async (uid: string, novoNivel: NivelAcesso) => {
    try {
      await updateDoc(doc(db, "usuarios", uid), {
        nivelAcesso: novoNivel,
      });
      toast.success("Nível de acesso atualizado");
    } catch (error) {
      console.error("Erro ao atualizar acesso:", error);
      toast.error("Erro ao atualizar nível de acesso");
    }
  };

  const handleAssignGroup = async (uid: string, grupoId: string | null) => {
    try {
      await updateDoc(doc(db, "usuarios", uid), {
        grupoId: grupoId || null,
      });
      toast.success(grupoId ? "Grupo atribuído ao líder" : "Grupo removido do líder");
    } catch (error) {
      console.error("Erro ao atribuir grupo:", error);
      toast.error("Erro ao atribuir grupo");
    }
  };

  const handleDeactivate = async () => {
    if (!userToDeactivate) return;

    try {
      await updateDoc(doc(db, "usuarios", userToDeactivate.uid), {
        ativo: false,
      });
      toast.success("Usuário desativado com sucesso");
      setUserToDeactivate(null);
    } catch (error) {
      console.error("Erro ao desativar usuário:", error);
      toast.error("Erro ao desativar usuário");
    }
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return "-";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 13) {
      // +55 + 11 digits
      return `(${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    return phone;
  };

  const formatDate = (timestamp: { toDate: () => Date } | undefined) => {
    if (!timestamp) return "-";
    return timestamp.toDate().toLocaleDateString("pt-BR");
  };

  const getNivelBadgeVariant = (nivel: NivelAcesso) => {
    switch (nivel) {
      case "full":
        return "destructive";
      case "admin":
        return "default";
      case "user":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (usuario?.nivelAcesso !== "admin" && usuario?.nivelAcesso !== "full") {
    return null;
  }

  const activeUsers = usuarios.filter((u) => u.ativo);
  const inactiveUsers = usuarios.filter((u) => !u.ativo);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie usuários e permissões do sistema
        </p>
      </div>

      {/* Access Levels Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Níveis de Acesso
          </CardTitle>
          <CardDescription>
            Cada nível possui permissões diferentes no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-destructive/5 p-4">
              <Badge variant="destructive" className="mb-2">
                Administrador
              </Badge>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Acesso total ao sistema</li>
                <li>Gerenciar usuários</li>
                <li>Ver todos os membros e grupos</li>
                <li>Criar e editar qualquer registro</li>
              </ul>
            </div>

            <div className="rounded-lg border bg-primary/5 p-4">
              <Badge variant="default" className="mb-2">
                Líder
              </Badge>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Ver membros do seu grupo</li>
                <li>Cadastrar novos membros</li>
                <li>Gerenciar seu grupo</li>
                <li>Visualizar mapa do grupo</li>
              </ul>
            </div>

            <div className="rounded-lg border bg-muted p-4">
              <Badge variant="secondary" className="mb-2">
                Obreiro
              </Badge>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Ver membros próximos</li>
                <li>Cadastrar visitantes</li>
                <li>Visualizar sua região no mapa</li>
                <li>Participar de grupos</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários do Sistema ({activeUsers.length})
          </CardTitle>
          <CardDescription>
            Gerencie os usuários que têm acesso ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                    <TableHead>Nível de Acesso</TableHead>
                    <TableHead className="hidden lg:table-cell">Grupo (Líder)</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Data de Cadastro
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeUsers.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell>
                        <div className="font-medium">{user.nome}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {formatPhone(user.telefone)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {formatPhone(user.telefone)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.nivelAcesso}
                          onValueChange={(v) =>
                            handleChangeAccess(user.uid, v as NivelAcesso)
                          }
                          disabled={user.uid === usuario?.uid}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(NIVEIS_ACESSO) as NivelAcesso[]).map(
                              (nivel) => (
                                <SelectItem key={nivel} value={nivel}>
                                  {NIVEIS_ACESSO[nivel]}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {user.nivelAcesso === "user" ? (
                          <Select
                            value={user.grupoId || "none"}
                            onValueChange={(v) =>
                              handleAssignGroup(user.uid, v === "none" ? null : v)
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Selecionar grupo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                              {grupos.filter(g => g.ativo).map((grupo) => (
                                <SelectItem key={grupo.id} value={grupo.id}>
                                  {grupo.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatDate(user.dataCriacao)}
                      </TableCell>
                      <TableCell>
                        {user.uid !== usuario?.uid && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setUserToDeactivate(user)}
                          >
                            <UserX className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Desativar</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive Users */}
      {inactiveUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <UserX className="h-5 w-5" />
              Usuários Inativos ({inactiveUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Último Nível</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inactiveUsers.map((user) => (
                    <TableRow key={user.uid} className="opacity-60">
                      <TableCell>{user.nome}</TableCell>
                      <TableCell>{formatPhone(user.telefone)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {NIVEIS_ACESSO[user.nivelAcesso]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            await updateDoc(doc(db, "usuarios", user.uid), {
                              ativo: true,
                            });
                            toast.success("Usuário reativado");
                          }}
                        >
                          Reativar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog
        open={!!userToDeactivate}
        onOpenChange={() => setUserToDeactivate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar o usuário{" "}
              <strong>{userToDeactivate?.nome}</strong>? Ele não poderá mais
              acessar o sistema até ser reativado.
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
