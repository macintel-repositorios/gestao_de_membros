"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
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
import { Church, Plus, Trash2, Users, CheckCircle2 } from "lucide-react";
import type { Acompanhante } from "@/lib/types";

interface UnidadeSimples {
  id: string;
  nome: string;
}

interface IgrejaInfo {
  nome: string;
  convencao?: string;
}

function CadastroVisitanteContent() {
  const searchParams = useSearchParams();
  const igrejaId = searchParams.get("igreja");
  const unidadeIdParam = searchParams.get("unidade");

  const [loading, setLoading] = useState(false);
  const [loadingIgreja, setLoadingIgreja] = useState(true);
  const [success, setSuccess] = useState(false);
  const [igrejaInfo, setIgrejaInfo] = useState<IgrejaInfo | null>(null);
  const [unidades, setUnidades] = useState<UnidadeSimples[]>([]);
  const [unidadeAtualNome, setUnidadeAtualNome] = useState<string | null>(null);

  // Dados do visitante
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [unidadeId, setUnidadeId] = useState(unidadeIdParam || "");

  // Acompanhantes
  const [acompanhantes, setAcompanhantes] = useState<Acompanhante[]>([]);

  // Perguntas
  const [jaRecebeuJesus, setJaRecebeuJesus] = useState<boolean | undefined>();
  const [pertenceIgreja, setPertenceIgreja] = useState<boolean | undefined>();
  const [qualIgreja, setQualIgreja] = useState("");
  const [primeiraVisita, setPrimeiraVisita] = useState(true);
  const [convidadoPor, setConvidadoPor] = useState("");
  const [pedidoOracao, setPedidoOracao] = useState("");

  // Carrega informações da igreja
  useEffect(() => {
    async function loadIgreja() {
      if (!igrejaId) {
        setLoadingIgreja(false);
        return;
      }

      try {
        // Busca dados da igreja
        const { data: igrejaData, error: igrejaErr } = await supabase
          .from("igrejas")
          .select("*")
          .eq("id", igrejaId)
          .single();
          
        if (igrejaErr) throw igrejaErr;
        
        if (igrejaData) {
          setIgrejaInfo({
            nome: igrejaData.nome || "Igreja",
            convencao: igrejaData.convencao,
          });
        }

        // Busca unidades
        const { data: unidadesData, error: unidadesErr } = await supabase
          .from("unidades")
          .select("id, nome, ativa")
          .eq("igreja_id", igrejaId);
          
        if (unidadesErr) throw unidadesErr;
        
        const unidadesList: UnidadeSimples[] = (unidadesData || [])
          .filter(u => u.ativa !== false)
          .map(u => ({ id: u.id, nome: u.nome }));
        
        setUnidades(unidadesList);
        
        // Se já veio uma unidade no link, usa ela e busca o nome
        if (unidadeIdParam && unidadesList.some(u => u.id === unidadeIdParam)) {
          setUnidadeId(unidadeIdParam);
          const unidadeEncontrada = unidadesList.find(u => u.id === unidadeIdParam);
          if (unidadeEncontrada) {
            setUnidadeAtualNome(unidadeEncontrada.nome);
          }
        } else if (unidadesList.length === 1) {
          setUnidadeId(unidadesList[0].id);
          setUnidadeAtualNome(unidadesList[0].nome);
        }
      } catch (error) {
        console.error("Erro ao carregar igreja:", error);
      } finally {
        setLoadingIgreja(false);
      }
    }

    loadIgreja();
  }, [igrejaId]);

  const addAcompanhante = () => {
    setAcompanhantes([...acompanhantes, { nome: "", telefone: "" }]);
  };

  const removeAcompanhante = (index: number) => {
    setAcompanhantes(acompanhantes.filter((_, i) => i !== index));
  };

  const updateAcompanhante = (index: number, field: keyof Acompanhante, value: string) => {
    const updated = [...acompanhantes];
    if (field === "dataNascimento") {
      updated[index][field] = value ? { toDate: () => new Date(value) } : undefined;
    } else {
      updated[index][field] = value;
    }
    setAcompanhantes(updated);
  };

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

  const cleanPhone = (value: string) => {
    let digits = value.replace(/\D/g, "");
    if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
      digits = digits.slice(2);
    }
    return digits.slice(0, 11);
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
      toast.error("Link inválido");
      return;
    }

    setLoading(true);
    try {
      const visitantePayload = {
        nome: nome.trim(),
        telefone: telefone.replace(/\D/g, ""),
        data_visita: format(new Date(), "yyyy-MM-dd"),
        primeira_visita: primeiraVisita,
        data_criacao: format(new Date(), "yyyy-MM-dd"),
        criado_por: null,
        unidade_id: unidadeId,
        igreja_id: igrejaId,
        data_nascimento: dataNascimento || null,
        ja_recebeu_jesus: jaRecebeuJesus !== undefined ? jaRecebeuJesus : null,
        pertence_igreja: pertenceIgreja !== undefined ? pertenceIgreja : null,
        qual_igreja: qualIgreja.trim() || null,
        convidado_por: convidadoPor.trim() || null,
        pedido_oracao: pedidoOracao.trim() || null,
        acompanhantes: acompanhantes.length > 0 
          ? acompanhantes.map(a => ({
              nome: a.nome.trim(),
              telefone: a.telefone.replace(/\D/g, ""),
              parentesco: a.parentesco || null,
              dataNascimento: a.dataNascimento?.toDate 
                ? a.dataNascimento.toDate().toISOString().split("T")[0] 
                : (typeof a.dataNascimento === "string" ? a.dataNascimento : null)
            })).filter(a => a.nome)
          : null,
      };

      const { error } = await supabase
        .from("visitantes")
        .insert(visitantePayload);
        
      if (error) throw error;
      setSuccess(true);
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      toast.error("Erro ao enviar cadastro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!igrejaId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Church className="mx-auto h-12 w-12 text-muted-foreground" />
            <h1 className="mt-4 text-xl font-semibold">Link Inválido</h1>
            <p className="mt-2 text-muted-foreground">
              Este link de cadastro não é válido. Solicite um novo link à igreja.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingIgreja) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="mx-auto w-fit rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">Cadastro Realizado!</h1>
            <p className="mt-2 text-muted-foreground">
              Obrigado por visitar nossa igreja! Seu cadastro foi recebido com sucesso.
            </p>
            <p className="mt-4 font-medium text-primary">
              {unidadeAtualNome || igrejaInfo?.nome}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-fit rounded-full bg-primary/10 p-3">
            <Church className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Cadastro de Visitante</h1>
          {unidadeAtualNome ? (
            <p className="mt-1 text-muted-foreground">{unidadeAtualNome}</p>
          ) : igrejaInfo && (
            <p className="mt-1 text-muted-foreground">{igrejaInfo.nome}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dados Básicos */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Seus Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">WhatsApp *</Label>
                <Input
                  id="telefone"
                  value={formatPhone(telefone)}
                  onChange={(e) => setTelefone(cleanPhone(e.target.value))}
                  onBlur={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    if (digits.length === 8 || digits.length === 9) {
                      setTelefone("11" + digits);
                    }
                  }}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                <Input
                  id="dataNascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
              </div>

              {/* Só mostra seleção de unidade se não veio no link E há mais de uma opção */}
              {!unidadeIdParam && unidades.length > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="unidade">Unidade que visitou *</Label>
                  <Select value={unidadeId} onValueChange={setUnidadeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map((unidade) => (
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
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Acompanhantes
                </CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addAcompanhante}>
                  <Plus className="mr-1 h-4 w-4" />
                  Adicionar
                </Button>
              </div>
              <CardDescription>Veio acompanhado? Adicione aqui.</CardDescription>
            </CardHeader>
            {acompanhantes.length > 0 && (
              <CardContent className="space-y-3">
                {acompanhantes.map((acomp, index) => (
                  <div key={index} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Acompanhante {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAcompanhante(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Nome"
                      value={acomp.nome}
                      onChange={(e) => updateAcompanhante(index, "nome", e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="WhatsApp"
                        value={formatPhone(acomp.telefone)}
                        onChange={(e) => updateAcompanhante(index, "telefone", cleanPhone(e.target.value))}
                        onBlur={(e) => {
                          const digits = e.target.value.replace(/\D/g, "");
                          if (digits.length === 8 || digits.length === 9) {
                            updateAcompanhante(index, "telefone", "11" + digits);
                          }
                        }}
                        maxLength={15}
                      />
                      <Input
                        placeholder="Parentesco"
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
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Informações Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="primeiraVisita"
                  checked={primeiraVisita}
                  onCheckedChange={(checked) => setPrimeiraVisita(!!checked)}
                />
                <Label htmlFor="primeiraVisita">Primeira visita na igreja?</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="jaRecebeuJesus"
                  checked={jaRecebeuJesus === true}
                  onCheckedChange={(checked) => setJaRecebeuJesus(!!checked)}
                />
                <Label htmlFor="jaRecebeuJesus">Já recebeu Jesus Cristo?</Label>
              </div>

              <div className="space-y-2">
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
                  placeholder="Tem algum pedido de oração?"
                  value={pedidoOracao}
                  onChange={(e) => setPedidoOracao(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Enviando..." : "Enviar Cadastro"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function CadastroVisitantePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    }>
      <CadastroVisitanteContent />
    </Suspense>
  );
}
