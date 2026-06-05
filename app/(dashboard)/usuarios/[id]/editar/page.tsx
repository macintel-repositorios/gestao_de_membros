"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { NivelAcesso, NIVEIS_ACESSO, TIPOS_UNIDADE, Usuario } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, UserCog } from "lucide-react";
import Link from "next/link";

export default function EditarUsuarioPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { igrejaId, todasUnidades, usuario: currentUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  
  const [nome, setNome] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [nivelAcesso, setNivelAcesso] = useState<NivelAcesso>("user");

  useEffect(() => {
    async function carregarUsuario() {
      if (!userId) return;

      try {
        const userRef = doc(db, "usuarios", userId);
        const snapshot = await getDoc(userRef);
        
        if (snapshot.exists()) {
          const data = snapshot.data() as Usuario;
          if (data.igrejaId !== igrejaId) {
            toast.error("Acesso não autorizado");
            router.push("/usuarios");
            return;
          }
          setUsuario({ ...data, uid: snapshot.id });
          setNome(data.nome || "");
          setUnidadeId(data.unidadeId || "");
          setNivelAcesso(data.nivelAcesso || "user");
        } else {
          toast.error("Usuário não encontrado");
          router.push("/usuarios");
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
        toast.error("Erro ao carregar usuário");
      } finally {
        setLoading(false);
      }
    }

    carregarUsuario();
  }, [userId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!unidadeId) {
      toast.error("Selecione uma unidade");
      return;
    }

    setSaving(true);
    try {
      const userRef = doc(db, "usuarios", userId);
      await updateDoc(userRef, {
        nome: nome.trim(),
        unidadeId,
        nivelAcesso,
      });

      toast.success("Usuário atualizado com sucesso!");
      router.push("/usuarios");
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      toast.error("Erro ao atualizar usuário");
    } finally {
      setSaving(false);
    }
  };

  const isFull = currentUser?.nivelAcesso === "full";

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 max-w-2xl" />
      </div>
    );
  }

  if (!usuario) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/usuarios">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar Usuário</h1>
          <p className="text-muted-foreground">
            Atualize os dados do usuário
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Dados do Usuário
          </CardTitle>
          <CardDescription>
            Telefone: {usuario.telefone}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do usuário"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade *</Label>
              <Select value={unidadeId} onValueChange={setUnidadeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {todasUnidades.map(unidade => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      {unidade.nome} ({TIPOS_UNIDADE[unidade.tipo]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nivel">Nível de Acesso *</Label>
              <Select value={nivelAcesso} onValueChange={(v) => setNivelAcesso(v as NivelAcesso)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    {NIVEIS_ACESSO.user} - Acesso apenas à sua unidade
                  </SelectItem>
                  <SelectItem value="admin">
                    {NIVEIS_ACESSO.admin} - Acesso à unidade + filhas
                  </SelectItem>
                  {isFull && (
                    <SelectItem value="full">
                      {NIVEIS_ACESSO.full} - Acesso total
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/usuarios">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
