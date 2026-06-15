"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
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
  
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [nivelAcesso, setNivelAcesso] = useState<NivelAcesso>("user");

  const formatPhone = (value: string) => {
    if (!value) return "";
    let digits = value.replace(/\D/g, "");
    if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
      digits = digits.slice(2);
    }
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  useEffect(() => {
    async function carregarUsuario() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", userId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          if (data.igreja_id !== igrejaId) {
            toast.error("Acesso não autorizado");
            if (onCancel) onCancel();
            return;
          }
          setNome(data.nome || "");
          setTelefone(data.telefone || "");
          setEmail(data.email || "");
          setUnidadeId(data.unidade_id || "");
          setNivelAcesso(data.nivel_acesso as NivelAcesso || "user");
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

    if (!userId && !email.trim()) {
      toast.error("Email é obrigatório");
      return;
    }

    if (!userId && !senha.trim()) {
      toast.error("Senha é obrigatória");
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
        const { error } = await supabase
          .from("usuarios")
          .update({
            nome: nome.trim(),
            telefone: telefone.replace(/\D/g, ""),
            unidade_id: unidadeId,
            nivel_acesso: nivelAcesso,
          })
          .eq("id", userId);

        if (error) throw error;

        toast.success("Usuário atualizado com sucesso!");
        if (onSuccess) onSuccess();
      } else {
        // Create flow - create a secondary non-persisting Supabase client
        const tempSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            auth: { persistSession: false }
          }
        );

        // Sign up user in Auth
        const { data: authData, error: authError } = await tempSupabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: senha,
          options: {
            data: {
              nome: nome.trim()
            }
          }
        });

        if (authError) throw authError;
        const newAuthUser = authData.user;
        if (!newAuthUser) throw new Error("Erro ao criar credenciais de acesso");

        // Insert into public.usuarios table
        const { error: dbError } = await supabase
          .from("usuarios")
          .insert({
            id: newAuthUser.id,
            nome: nome.trim(),
            telefone: telefone.replace(/\D/g, ""),
            email: email.trim().toLowerCase(),
            nivel_acesso: nivelAcesso,
            igreja_id: igrejaId,
            unidade_id: unidadeId,
            ativo: true,
          });

        if (dbError) throw dbError;

        toast.success("Usuário cadastrado com sucesso! Um e-mail de confirmação foi enviado.");
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
      console.error("Erro ao salvar usuário:", error);
      toast.error(error.message || "Erro ao salvar usuário");
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
          {userId ? `Email: ${email}` : "O usuário poderá fazer login usando as credenciais cadastradas"}
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
            <Label htmlFor="telefone">Telefone (WhatsApp)</Label>
            <Input
              id="telefone"
              value={formatPhone(telefone)}
              onChange={(e) => setTelefone(e.target.value)}
              onBlur={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                if (digits.length === 8 || digits.length === 9) {
                  setTelefone(formatPhone("11" + digits));
                } else {
                  setTelefone(formatPhone(digits));
                }
              }}
              placeholder="(00) 00000-0000"
            />
          </div>

          {!userId && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">Senha de Acesso *</Label>
                <Input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
            </>
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
