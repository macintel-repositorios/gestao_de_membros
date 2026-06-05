"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, deleteDoc, updateDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Usuario, NIVEIS_ACESSO, Unidade } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { toast } from "sonner";
import { 
  Users, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  UserCheck,
  UserX,
  Shield,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";

export default function UsuariosPage() {
  const { igrejaId, usuario: currentUser, todasUnidades } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    async function carregarUsuarios() {
      if (!igrejaId) {
        setLoading(false);
        return;
      }

      try {
        const usuariosRef = collection(db, "usuarios");
        const q = query(usuariosRef, where("igrejaId", "==", igrejaId));
        const snapshot = await getDocs(q);
        
        const usuariosData: Usuario[] = [];
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          usuariosData.push({
            uid: docSnap.id,
            ...data,
          } as Usuario);
        });
        
        setUsuarios(usuariosData);
      } catch (error) {
        console.error("Erro ao carregar usuários:", error);
        toast.error("Erro ao carregar usuários");
      } finally {
        setLoading(false);
      }
    }

    carregarUsuarios();
  }, [igrejaId]);

  const getUnidadeNome = (unidadeId: string): string => {
    const unidade = todasUnidades.find(u => u.id === unidadeId);
    return unidade?.nome || "Não definida";
  };

  const handleToggleAtivo = async (usr: Usuario) => {
    try {
      const userRef = doc(db, "usuarios", usr.uid);
      await updateDoc(userRef, { ativo: !usr.ativo });
      
      setUsuarios(prev => prev.map(u => 
        u.uid === usr.uid ? { ...u, ativo: !u.ativo } : u
      ));
      
      toast.success(usr.ativo ? "Usuário desativado" : "Usuário ativado");
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      toast.error("Erro ao atualizar usuário");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteDoc(doc(db, "usuarios", deleteId));
      setUsuarios(prev => prev.filter(u => u.uid !== deleteId));
      toast.success("Usuário removido com sucesso");
    } catch (error) {
      console.error("Erro ao remover usuário:", error);
      toast.error("Erro ao remover usuário");
    } finally {
      setDeleteId(null);
    }
  };

  const filteredUsuarios = usuarios.filter(usr => {
    const nome = usr.nome || "";
    const telefone = usr.telefone || "";
    const termo = searchTerm.toLowerCase();
    return nome.toLowerCase().includes(termo) || telefone.includes(searchTerm);
  });

  const isAdmin = currentUser?.nivelAcesso === "admin" || currentUser?.nivelAcesso === "full";

  const getNivelIcon = (nivel: string) => {
    switch (nivel) {
      case "full": return <ShieldAlert className="h-4 w-4" />;
      case "admin": return <ShieldCheck className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie os usuários que têm acesso ao sistema
          </p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href="/usuarios/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Usuários</CardDescription>
            <CardTitle className="text-3xl">{usuarios.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ativos</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {usuarios.filter(u => u.ativo).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inativos</CardDescription>
            <CardTitle className="text-3xl text-muted-foreground">
              {usuarios.filter(u => !u.ativo).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsuarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum usuário encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "Tente buscar por outro termo" : "Cadastre o primeiro usuário"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Nível de Acesso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.map(usr => (
                  <TableRow key={usr.uid}>
                    <TableCell className="font-medium">{usr.nome || "Sem nome"}</TableCell>
                    <TableCell>{usr.telefone || "-"}</TableCell>
                    <TableCell>{usr.unidadeId ? getUnidadeNome(usr.unidadeId) : "Não definida"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {getNivelIcon(usr.nivelAcesso || "usuario")}
                        {NIVEIS_ACESSO[usr.nivelAcesso || "usuario"] || "Usuário"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={usr.ativo !== false ? "default" : "secondary"}>
                        {usr.ativo !== false ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isAdmin && usr.uid !== currentUser?.uid && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/usuarios/${usr.uid}/editar`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleAtivo(usr)}>
                              {usr.ativo ? (
                                <>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Desativar
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Ativar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setDeleteId(usr.uid)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário perderá todo o acesso ao sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
