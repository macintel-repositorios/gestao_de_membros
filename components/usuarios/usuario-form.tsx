"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, setDoc, Timestamp, collection, query, where, getDocs } from "firebase/firestore";
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
import { Save, Loader2, UserCog, UserPlus } from "lucide-react";

interface UsuarioFormProps {
  userId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function UsuarioForm({ userId, onSuccess, onCancel }: UsuarioFormProps) {
  const { igrejaId, todasUnidades, unidadesAcessiveis, usuario: currentUser } = useAuth();
  
  const [loading, setLoading] = useState(!!userId);
  const [saving, setSaving] = useState(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [nivelAcesso, setNivelAcesso] = useState<NivelAcesso>("user");

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  useEffect(() => {
    async function carregarUsuario() {
      if (!userId || !db) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "usuarios", userId);
        const snapshot = await getDoc(userRef);
        
        if (snapshot.exists()) {
          const data = snapshot.data() as Usuario;
          if (data.igrejaId !== igrejaId) {
            toast.error("Acesso não autorizado");
            if (onCancel) onCancel();
            return;
          }
          setUsuario({ ...data, uid: snapshot.id });
          setNome(data.nome || "");
          setTelefone(data.telefone || "");
          setUnidadeId(data.unidadeId || "");
          setNivelAcesso(data.nivelAcesso || "user");
        } else {
          toast.error("Usuário não encontrado");
          if (onCancel) onCancel();
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
        toast.error("Erro ao carregar usuário");
      } finally {
        setLoading(false);
      }
    }

    carregarUsuario();
  }, [userId, igrejaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!userId && !telefone.trim()) {
      toast.error("Telefone é obrigatório");
      return;
    }

    if (!unidadeId) {
      toast.error("Selecione uma unidade");
      return;
    }

    if (!igrejaId) {
      toast.error("Erro: Igreja não encontrada");
      return;
    }

    setSaving(true);
    try {
      if (userId) {
        // Edit flow
        const userRef = doc(db!, "usuarios", userId);
        await updateDoc(userRef, {
          nome: nome.trim(),
          unidadeId,
          nivelAcesso,
        });

        toast.success("Usuário atualizado com sucesso!");
        if (onSuccess) onSuccess();
      } else {
        // Create flow
        const phoneDigits = telefone.replace(/\D/g, "");
        if (phoneDigits.length < 10) {
          toast.error("Telefone inválido");
          setSaving(false);
          return;
        }

        // Verifica se já existe usuário com este telefone
        const usuariosRef = collection(db!, "usuarios");
        const q = query(usuariosRef, where("telefone", "==", telefone));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          toast.error("Já existe um usuário com este telefone");
          setSaving(false);
          return;
        }

        const newUserId = `+55${phoneDigits}`;
        const userRef = doc(db!, "usuarios", newUserId);

        await setDoc(userRef, {
          telefone,
          nome: nome.trim(),
          nivelAcesso,
          igrejaId,
          unidadeId,
          ativo: true,
          dataCriacao: Timestamp.now(),
          criadoPor: currentUser?.uid,
        });

        toast.success("Usuário criado com sucesso!");
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
      toast.error("Erro ao salvar usuário");
    } finally {
      setSaving(false);
    }
  };

  const isFull = currentUser?.nivelAcesso === "full";

  if (loading) {
    return (
      <div className="space-y-6 pt-4">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {userId ? <UserCog className="h-5 w-5 text-primary" /> : <UserPlus className="h-5 w-5 text-primary" />}
          Dados do Usuário
        </CardTitle>
        <CardDescription>
          {userId ? `Telefone: ${telefone}` : "O usuário poderá fazer login usando o telefone cadastrado"}
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

          {!userId && (
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone (WhatsApp) *</Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                required
              />
              <p className="text-xs text-muted-foreground">
                O usuário usará este número para fazer login via SMS
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="unidade">Unidade *</Label>
            <Select value={unidadeId} onValueChange={setUnidadeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent>
                {todasUnidades
                  .filter(u => currentUser?.nivelAcesso === "full" || unidadesAcessiveis.includes(u.id))
                  .map(unidade => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      {unidade.nome} ({TIPOS_UNIDADE[unidade.tipo]})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Igreja/congregação onde o usuário está vinculado
            </p>
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
                <SelectItem value="lider">
                  {NIVEIS_ACESSO.lider} - Acesso a grupos, famílias, relatórios e acompanhamentos
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
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saving ? "Salvando..." : userId ? "Salvar Alterações" : "Cadastrar Usuário"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
