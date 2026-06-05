"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, Timestamp, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { NivelAcesso, NIVEIS_ACESSO, TIPOS_UNIDADE } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";

export default function NovoUsuarioPage() {
  const router = useRouter();
  const { igrejaId, todasUnidades, usuario: currentUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!telefone.trim()) {
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

    // Formata telefone para usar como ID
    const phoneDigits = telefone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      toast.error("Telefone inválido");
      return;
    }

    setLoading(true);
    try {
      // Verifica se já existe usuário com este telefone
      const usuariosRef = collection(db, "usuarios");
      const q = query(usuariosRef, where("telefone", "==", telefone));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        toast.error("Já existe um usuário com este telefone");
        setLoading(false);
        return;
      }

      // Cria o documento do usuário
      // O ID será o número de telefone formatado (para facilitar login por SMS)
      const userId = `+55${phoneDigits}`;
      const userRef = doc(db, "usuarios", userId);

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
      router.push("/usuarios");
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      toast.error("Erro ao criar usuário");
    } finally {
      setLoading(false);
    }
  };

  const isFull = currentUser?.nivelAcesso === "full";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/usuarios">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Novo Usuário</h1>
          <p className="text-muted-foreground">
            Cadastre um novo usuário para acessar o sistema
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Dados do Usuário
          </CardTitle>
          <CardDescription>
            O usuário poderá fazer login usando o telefone cadastrado
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
                    {NIVEIS_ACESSO.user} - Acesso apenas à sua unidade (ideal para líderes)
                  </SelectItem>
                  <SelectItem value="admin">
                    {NIVEIS_ACESSO.admin} - Acesso à unidade + unidades filhas
                  </SelectItem>
                  {isFull && (
                    <SelectItem value="full">
                      {NIVEIS_ACESSO.full} - Acesso total ao sistema
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/usuarios">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {loading ? "Salvando..." : "Cadastrar Usuário"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
