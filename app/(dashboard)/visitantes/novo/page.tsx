"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, Timestamp } from "firebase/firestore";
import { getVisitantesCollection } from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Users } from "lucide-react";
import Link from "next/link";
import type { Acompanhante } from "@/lib/types";

export default function NovoVisitantePage() {
  const router = useRouter();
  const { user, igrejaId, unidadesAcessiveis, todasUnidades, unidadeId: defaultUnidadeId } = useAuth();
  const [loading, setLoading] = useState(false);

  // Dados do visitante
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [dataVisita, setDataVisita] = useState(new Date().toISOString().split("T")[0]);
  const [unidadeId, setUnidadeId] = useState(defaultUnidadeId || "");

  // Acompanhantes
  const [acompanhantes, setAcompanhantes] = useState<Acompanhante[]>([]);

  // Perguntas do cartão
  const [jaRecebeuJesus, setJaRecebeuJesus] = useState<boolean | undefined>();
  const [pertenceIgreja, setPertenceIgreja] = useState<boolean | undefined>();
  const [qualIgreja, setQualIgreja] = useState("");
  const [primeiraVisita, setPrimeiraVisita] = useState(true);
  const [convidadoPor, setConvidadoPor] = useState("");
  const [pedidoOracao, setPedidoOracao] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const unidadesParaSelecao = todasUnidades.filter(u => unidadesAcessiveis.includes(u.id));

  const addAcompanhante = () => {
    setAcompanhantes([...acompanhantes, { nome: "", telefone: "" }]);
  };

  const removeAcompanhante = (index: number) => {
    setAcompanhantes(acompanhantes.filter((_, i) => i !== index));
  };

  const updateAcompanhante = (index: number, field: keyof Acompanhante, value: string) => {
    const updated = [...acompanhantes];
    if (field === "dataNascimento") {
      updated[index][field] = value ? Timestamp.fromDate(new Date(value)) : undefined;
    } else {
      updated[index][field] = value;
    }
    setAcompanhantes(updated);
  };

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits;
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
      toast.error("Igreja não identificada");
      return;
    }

    setLoading(true);
    try {
      const visitantesRef = getVisitantesCollection(igrejaId, unidadeId);
      
      const visitanteData: Record<string, unknown> = {
        nome: nome.trim(),
        telefone: telefone.replace(/\D/g, ""),
        dataVisita: Timestamp.fromDate(new Date(dataVisita)),
        primeiraVisita,
        ativo: true,
        dataCriacao: Timestamp.now(),
        criadoPor: user?.uid || null,
        unidadeId,
      };

      if (dataNascimento) {
        visitanteData.dataNascimento = Timestamp.fromDate(new Date(dataNascimento));
      }
      if (jaRecebeuJesus !== undefined) {
        visitanteData.jaRecebeuJesus = jaRecebeuJesus;
      }
      if (pertenceIgreja !== undefined) {
        visitanteData.pertenceIgreja = pertenceIgreja;
      }
      if (qualIgreja.trim()) {
        visitanteData.qualIgreja = qualIgreja.trim();
      }
      if (convidadoPor.trim()) {
        visitanteData.convidadoPor = convidadoPor.trim();
      }
      if (pedidoOracao.trim()) {
        visitanteData.pedidoOracao = pedidoOracao.trim();
      }
      if (observacoes.trim()) {
        visitanteData.observacoes = observacoes.trim();
      }
      if (acompanhantes.length > 0) {
        visitanteData.acompanhantes = acompanhantes.filter(a => a.nome.trim());
      }

      await addDoc(visitantesRef, visitanteData);
      toast.success("Visitante cadastrado com sucesso!");
      router.push("/visitantes");
    } catch (error) {
      console.error("Erro ao cadastrar visitante:", error);
      toast.error("Erro ao cadastrar visitante");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/visitantes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Novo Visitante</h1>
          <p className="text-muted-foreground">Cadastre um novo visitante</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Básicos */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Visitante</CardTitle>
            <CardDescription>Informações principais do visitante</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do visitante"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">WhatsApp *</Label>
                <Input
                  id="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhoneInput(e.target.value))}
                  placeholder="11999999999"
                  maxLength={11}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                <Input
                  id="dataNascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataVisita">Data da Visita *</Label>
                <Input
                  id="dataVisita"
                  type="date"
                  value={dataVisita}
                  onChange={(e) => setDataVisita(e.target.value)}
                  required
                />
              </div>
            </div>

            {unidadesParaSelecao.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade *</Label>
                <Select value={unidadeId} onValueChange={setUnidadeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidadesParaSelecao.map((unidade) => (
                      <SelectItem key={unidade.id} value={unidade.id}>
                        {unidade.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acompanhantes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Acompanhantes
                </CardTitle>
                <CardDescription>Pessoas que vieram junto com o visitante</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addAcompanhante}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </CardHeader>
          {acompanhantes.length > 0 && (
            <CardContent className="space-y-4">
              {acompanhantes.map((acomp, index) => (
                <div key={index} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Acompanhante {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAcompanhante(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      placeholder="Nome"
                      value={acomp.nome}
                      onChange={(e) => updateAcompanhante(index, "nome", e.target.value)}
                    />
                    <Input
                      placeholder="WhatsApp"
                      value={acomp.telefone}
                      onChange={(e) => updateAcompanhante(index, "telefone", formatPhoneInput(e.target.value))}
                      maxLength={11}
                    />
                    <Input
                      type="date"
                      placeholder="Nascimento"
                      onChange={(e) => updateAcompanhante(index, "dataNascimento", e.target.value)}
                    />
                    <Input
                      placeholder="Parentesco (ex: esposa, filho)"
                      value={acomp.parentesco || ""}
                      onChange={(e) => updateAcompanhante(index, "parentesco", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* Perguntas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Adicionais</CardTitle>
            <CardDescription>Perguntas do cartão de visitante</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="primeiraVisita"
                checked={primeiraVisita}
                onCheckedChange={(checked) => setPrimeiraVisita(!!checked)}
              />
              <Label htmlFor="primeiraVisita">Primeira visita em nossa igreja?</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="jaRecebeuJesus"
                checked={jaRecebeuJesus === true}
                onCheckedChange={(checked) => setJaRecebeuJesus(!!checked)}
              />
              <Label htmlFor="jaRecebeuJesus">Já recebeu Jesus Cristo?</Label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pertenceIgreja"
                  checked={pertenceIgreja === true}
                  onCheckedChange={(checked) => setPertenceIgreja(!!checked)}
                />
                <Label htmlFor="pertenceIgreja">Pertence a alguma igreja?</Label>
              </div>
              {pertenceIgreja && (
                <Input
                  placeholder="Qual igreja?"
                  value={qualIgreja}
                  onChange={(e) => setQualIgreja(e.target.value)}
                  className="ml-6"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="convidadoPor">Convidado por alguém?</Label>
              <Input
                id="convidadoPor"
                placeholder="Nome de quem convidou"
                value={convidadoPor}
                onChange={(e) => setConvidadoPor(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pedidoOracao">Pedido de Oração</Label>
              <Textarea
                id="pedidoOracao"
                placeholder="Algum pedido de oração?"
                value={pedidoOracao}
                onChange={(e) => setPedidoOracao(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Observações adicionais..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/visitantes">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Cadastrar Visitante"}
          </Button>
        </div>
      </form>
    </div>
  );
}
