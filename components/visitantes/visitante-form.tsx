"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addDoc, updateDoc, Timestamp } from "firebase/firestore";
import { getVisitantesCollection, getVisitanteDoc } from "@/lib/firestore";
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
import { Plus, Trash2, Users } from "lucide-react";
import type { Acompanhante, Visitante } from "@/lib/types";

interface VisitanteFormProps {
  visitante?: Visitante;
  unidadeIdParam?: string;
  onSuccess?: () => void;
}

export function VisitanteForm({ visitante, unidadeIdParam, onSuccess }: VisitanteFormProps) {
  const router = useRouter();
  const { user, igrejaId, unidadesAcessiveis, todasUnidades, unidadeId: defaultUnidadeId } = useAuth();
  const [loading, setLoading] = useState(false);

  // Dados do visitante
  const [nome, setNome] = useState(visitante?.nome || "");
  const [telefone, setTelefone] = useState(visitante?.telefone || "");
  const [dataNascimento, setDataNascimento] = useState(
    visitante?.dataNascimento?.toDate
      ? visitante.dataNascimento.toDate().toISOString().split("T")[0]
      : ""
  );
  const [dataVisita, setDataVisita] = useState(
    visitante?.dataVisita?.toDate
      ? visitante.dataVisita.toDate().toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [unidadeId, setUnidadeId] = useState(unidadeIdParam || visitante?.unidadeId || defaultUnidadeId || "");

  // Acompanhantes
  const [acompanhantes, setAcompanhantes] = useState<Acompanhante[]>(visitante?.acompanhantes || []);

  // Perguntas do cartão
  const [jaRecebeuJesus, setJaRecebeuJesus] = useState<boolean | undefined>(visitante?.jaRecebeuJesus);
  const [pertenceIgreja, setPertenceIgreja] = useState<boolean | undefined>(visitante?.pertenceIgreja);
  const [qualIgreja, setQualIgreja] = useState(visitante?.qualIgreja || "");
  const [primeiraVisita, setPrimeiraVisita] = useState(visitante?.primeiraVisita ?? true);
  const [convidadoPor, setConvidadoPor] = useState(visitante?.convidadoPor || "");
  const [pedidoOracao, setPedidoOracao] = useState(visitante?.pedidoOracao || "");
  const [observacoes, setObservacoes] = useState(visitante?.observacoes || "");

  const unidadesParaSelecao = todasUnidades.filter(u => unidadesAcessiveis.includes(u.id));

  // Sincronizar estados ao receber novas props do visitante
  useEffect(() => {
    if (visitante) {
      setNome(visitante.nome || "");
      setTelefone(visitante.telefone || "");
      setDataNascimento(
        visitante.dataNascimento?.toDate
          ? visitante.dataNascimento.toDate().toISOString().split("T")[0]
          : ""
      );
      setDataVisita(
        visitante.dataVisita?.toDate
          ? visitante.dataVisita.toDate().toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setAcompanhantes(visitante.acompanhantes || []);
      setJaRecebeuJesus(visitante.jaRecebeuJesus);
      setPertenceIgreja(visitante.pertenceIgreja);
      setQualIgreja(visitante.qualIgreja || "");
      setPrimeiraVisita(visitante.primeiraVisita ?? true);
      setConvidadoPor(visitante.convidadoPor || "");
      setPedidoOracao(visitante.pedidoOracao || "");
      setObservacoes(visitante.observacoes || "");
    }
  }, [visitante]);

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
      const visitanteData: Record<string, unknown> = {
        nome: nome.trim(),
        telefone: telefone.replace(/\D/g, ""),
        dataVisita: Timestamp.fromDate(new Date(dataVisita)),
        primeiraVisita,
        ativo: visitante ? (visitante.ativo ?? true) : true,
        unidadeId,
      };

      if (dataNascimento) {
        visitanteData.dataNascimento = Timestamp.fromDate(new Date(dataNascimento));
      } else {
        visitanteData.dataNascimento = null;
      }
      
      visitanteData.jaRecebeuJesus = jaRecebeuJesus ?? null;
      visitanteData.pertenceIgreja = pertenceIgreja ?? null;
      visitanteData.qualIgreja = qualIgreja.trim() || null;
      visitanteData.convidadoPor = convidadoPor.trim() || null;
      visitanteData.pedidoOracao = pedidoOracao.trim() || null;
      visitanteData.observacoes = observacoes.trim() || null;
      visitanteData.acompanhantes = acompanhantes.filter(a => a.nome.trim()) || [];

      if (visitante) {
        // Atualizar
        const visitanteRef = getVisitanteDoc(igrejaId, unidadeIdParam || visitante.unidadeId || unidadeId, visitante.id);
        await updateDoc(visitanteRef, {
          ...visitanteData,
          dataAtualizacao: Timestamp.now(),
        });
        toast.success("Visitante atualizado com sucesso!");
      } else {
        // Criar
        const visitantesRef = getVisitantesCollection(igrejaId, unidadeId);
        await addDoc(visitantesRef, {
          ...visitanteData,
          dataCriacao: Timestamp.now(),
          criadoPor: user?.uid || null,
        });
        toast.success("Visitante cadastrado com sucesso!");
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/visitantes");
      }
    } catch (error) {
      console.error("Erro ao salvar visitante:", error);
      toast.error("Erro ao salvar visitante");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-2">
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

          {unidadesParaSelecao.length > 1 && !visitante && (
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
                    value={acomp.dataNascimento?.toDate ? acomp.dataNascimento.toDate().toISOString().split("T")[0] : ""}
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
        {onSuccess ? (
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancelar
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : visitante ? "Atualizar Visitante" : "Cadastrar Visitante"}
        </Button>
      </div>
    </form>
  );
}
