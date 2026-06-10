"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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
  ShieldCheck,
  ChevronDown,
  Phone,
  Mail
} from "lucide-react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { UsuarioForm } from "@/components/usuarios/usuario-form";

export default function UsuariosPage() {
  const { igrejaId, usuario: currentUser, todasUnidades, unidadesAcessiveis } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [usuarioParaEditar, setUsuarioParaEditar] = useState<Usuario | null>(null);
  const [isNovoOpen, setIsNovoOpen] = useState(false);
  const [expandedUsuarios, setExpandedUsuarios] = useState<Record<string, boolean>>({});
  const toggleExpandUsuario = (uid: string) => {
    setExpandedUsuarios(prev => ({ ...prev, [uid]: !prev[uid] }));
  };

  const carregarUsuarios = async () => {
    if (!igrejaId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("igreja_id", igrejaId);
      
      if (error) throw error;
      
      const usuariosData: Usuario[] = (data || []).map(usr => ({
        uid: usr.id,
        nome: usr.nome,
        telefone: usr.telefone || "",
        email: usr.email,
        nivelAcesso: usr.nivel_acesso as any,
        igrejaId: usr.igreja_id,
        unidadeId: usr.unidade_id,
        ativo: usr.ativo,
        dataCriacao: usr.data_criacao,
      }));
      
      setUsuarios(usuariosData);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, [igrejaId]);

  const getUnidadeNome = (unidadeId: string): string => {
    const unidade = todasUnidades.find(u => u.id === unidadeId);
    return unidade?.nome || "Não definida";
  };

  const handleToggleAtivo = async (usr: Usuario) => {
    try {
      const { error } = await supabase
        .from("usuarios")
        .update({ ativo: !usr.ativo })
        .eq("id", usr.uid);
      
      if (error) throw error;
      
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
      const { error } = await supabase
        .from("usuarios")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

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
    // Apenas administradores "full" podem ver usuários de todas as unidades da igreja
    if (currentUser?.nivelAcesso !== "full" && usr.unidadeId && !unidadesAcessiveis.includes(usr.unidadeId)) {
      return false;
    }
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
          <Button onClick={() => setIsNovoOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Usuário
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
          <>
            <div className="hidden md:block">
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
                              <DropdownMenuItem onClick={() => setUsuarioParaEditar(usr)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
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
            </div>

            {/* Layout Mobile (Cards Expansíveis) */}
            <div className="block md:hidden space-y-3">
              {filteredUsuarios.map((usr) => {
                const isExpanded = !!expandedUsuarios[usr.uid];
                return (
                  <Card key={usr.uid} className="overflow-hidden border border-muted">
                    <div
                      onClick={() => toggleExpandUsuario(usr.uid)}
                      className="p-4 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{usr.nome || "Sem nome"}</h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="gap-1 text-[10px] h-4 py-0 px-1.5">
                            {getNivelIcon(usr.nivelAcesso || "usuario")}
                            {NIVEIS_ACESSO[usr.nivelAcesso || "usuario"] || "Usuário"}
                          </Badge>
                          <Badge variant={usr.ativo !== false ? "default" : "secondary"} className="text-[10px] h-4 py-0 px-1.5">
                            {usr.ativo !== false ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </div>

                    {isExpanded && (
                      <CardContent className="border-t bg-muted/20 p-4 space-y-3 text-sm animate-in fade-in duration-200">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {usr.telefone && (
                            <div className="flex flex-col">
                              <span className="text-muted-foreground font-medium">Telefone</span>
                              <a href={`tel:${usr.telefone}`} className="mt-0.5 text-primary hover:underline flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {usr.telefone}
                              </a>
                            </div>
                          )}
                          {usr.email && (
                            <div className="flex flex-col col-span-2">
                              <span className="text-muted-foreground font-medium">E-mail</span>
                              <a href={`mailto:${usr.email}`} className="mt-0.5 text-primary hover:underline flex items-center gap-1 truncate">
                                <Mail className="h-3 w-3" />
                                {usr.email}
                              </a>
                            </div>
                          )}
                          <div className="flex flex-col col-span-2">
                            <span className="text-muted-foreground font-medium">Unidade</span>
                            <span className="mt-0.5 truncate">{usr.unidadeId ? getUnidadeNome(usr.unidadeId) : "Não definida"}</span>
                          </div>
                        </div>

                        {isAdmin && usr.uid !== currentUser?.uid && (
                          <div className="flex gap-2 justify-end pt-2 border-t flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => setUsuarioParaEditar(usr)}>
                              <Edit className="mr-1.5 h-3.5 w-3.5" /> Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleAtivo(usr)}
                            >
                              {usr.ativo ? (
                                <>
                                  <UserX className="mr-1.5 h-3.5 w-3.5" /> Desativar
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Ativar
                                </>
                              )}
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(usr.uid)}>
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remover
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
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

      {/* Drawer: Novo Usuário */}
      <Sheet open={isNovoOpen} onOpenChange={setIsNovoOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-6 overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Novo Usuário</SheetTitle>
            <SheetDescription>
              Cadastre um novo usuário para acessar o sistema
            </SheetDescription>
          </SheetHeader>
          <UsuarioForm
            onSuccess={() => {
              setIsNovoOpen(false);
              carregarUsuarios();
            }}
            onCancel={() => setIsNovoOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Drawer: Editar Usuário */}
      <Sheet open={!!usuarioParaEditar} onOpenChange={(open) => !open && setUsuarioParaEditar(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-6 overflow-y-auto">
          {usuarioParaEditar && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle>Editar Usuário</SheetTitle>
                <SheetDescription>
                  Atualize os dados do usuário
                </SheetDescription>
              </SheetHeader>
              <UsuarioForm
                userId={usuarioParaEditar.uid}
                onSuccess={() => {
                  setUsuarioParaEditar(null);
                  carregarUsuarios();
                }}
                onCancel={() => setUsuarioParaEditar(null)}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
