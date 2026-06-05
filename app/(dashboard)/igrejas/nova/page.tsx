"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addDoc, Timestamp, getDocs } from "firebase/firestore";
import { getIgrejasCollection } from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { Igreja, TipoIgreja, TIPOS_IGREJA, Endereco } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function NovaIgrejaPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [igrejasExistentes, setIgrejasExistentes] = useState<Igreja[]>([]);

  // Form state
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoIgreja>("sede");
  const [codIgreja, setCodIgreja] = useState("");
  const [convencao, setConvencao] = useState("");
  const [ministerio, setMinisterio] = useState("");
  const [igrejaPaiId, setIgrejaPaiId] = useState("");
  const [dirigente, setDirigente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cnpj, setCnpj] = useState("");

  // Endereço
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  const isFull = usuario?.nivelAcesso === "full";

  useEffect(() => {
    if (!isFull) {
      router.push("/");
      return;
    }

    // Carrega igrejas existentes para selecionar igreja pai
    loadIgrejasExistentes();
  }, [isFull, router]);

  const loadIgrejasExistentes = async () => {
    try {
      const igrejasRef = getIgrejasCollection();
      const snapshot = await getDocs(igrejasRef);
      const igrejasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Igreja[];
      setIgrejasExistentes(igrejasData);
    } catch (error) {
      console.error("Erro ao carregar igrejas:", error);
    }
  };

  const buscarCep = async () => {
    if (cep.length < 8) return;

    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setLogradouro(data.logradouro || "");
        setBairro(data.bairro || "");
        setCidade(data.localidade || "");
        setEstado(data.uf || "");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setBuscandoCep(false);
    }
  };

  const formatCep = (value: string) => {
    const numeros = value.replace(/\D/g, "");
    if (numeros.length <= 5) return numeros;
    return `${numeros.slice(0, 5)}-${numeros.slice(5, 8)}`;
  };

  const formatTelefone = (value: string) => {
    const numeros = value.replace(/\D/g, "");
    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 6) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    if (numeros.length <= 10) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
  };

  const formatCnpj = (value: string) => {
    const numeros = value.replace(/\D/g, "");
    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 5) return `${numeros.slice(0, 2)}.${numeros.slice(2)}`;
    if (numeros.length <= 8) return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5)}`;
    if (numeros.length <= 12) return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8)}`;
    return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8, 12)}-${numeros.slice(12, 14)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome da igreja é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const endereco: Endereco = {
        cep: cep.replace(/\D/g, ""),
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
      };

      const igrejaData: Omit<Igreja, "id"> = {
        nome: nome.trim(),
        tipo,
        codIgreja: codIgreja.trim() || undefined,
        convencao: convencao.trim() || undefined,
        ministerio: ministerio.trim() || undefined,
        igrejaPaiId: igrejaPaiId || undefined,
        dirigente: dirigente.trim() || undefined,
        telefone: telefone.replace(/\D/g, "") || undefined,
        email: email.trim().toLowerCase() || undefined,
        cnpj: cnpj.replace(/\D/g, "") || undefined,
        endereco,
        ativa: true,
        dataCadastro: Timestamp.now(),
        atualizadoPor: usuario?.uid,
        dataAtualizacao: Timestamp.now(),
      };

      const igrejasRef = getIgrejasCollection();
      await addDoc(igrejasRef, igrejaData);

      toast({
        title: "Igreja cadastrada",
        description: "A igreja foi cadastrada com sucesso.",
      });

      router.push("/igrejas");
    } catch (error) {
      console.error("Erro ao salvar igreja:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a igreja. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isFull) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/igrejas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nova Igreja</h1>
          <p className="text-muted-foreground">
            Cadastre uma nova igreja no sistema
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Principais */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Principais</CardTitle>
            <CardDescription>Informações básicas da igreja</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Igreja *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Igreja Missão Restaurar"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoIgreja)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPOS_IGREJA).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {tipo !== "sede" && igrejasExistentes.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="igrejaPai">Igreja Matriz</Label>
                <Select value={igrejaPaiId} onValueChange={setIgrejaPaiId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a igreja matriz" />
                  </SelectTrigger>
                  <SelectContent>
                    {igrejasExistentes
                      .filter(i => i.tipo === "sede" || i.tipo === "congregacao")
                      .map((igreja) => (
                        <SelectItem key={igreja.id} value={igreja.id}>
                          {igreja.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="codIgreja">Código da Igreja</Label>
                <Input
                  id="codIgreja"
                  value={codIgreja}
                  onChange={(e) => setCodIgreja(e.target.value)}
                  placeholder="Ex: IMR-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="convencao">Convenção</Label>
                <Input
                  id="convencao"
                  value={convencao}
                  onChange={(e) => setConvencao(e.target.value)}
                  placeholder="Ex: CGADB"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ministerio">Ministério</Label>
                <Input
                  id="ministerio"
                  value={ministerio}
                  onChange={(e) => setMinisterio(e.target.value)}
                  placeholder="Ex: Ministério Madureira"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dirigente">Dirigente/Pastor</Label>
              <Input
                id="dirigente"
                value={dirigente}
                onChange={(e) => setDirigente(e.target.value)}
                placeholder="Nome do pastor ou dirigente"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader>
            <CardTitle>Contato</CardTitle>
            <CardDescription>Informações de contato da igreja</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@igreja.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
            <CardDescription>Localização da igreja</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={cep}
                  onChange={(e) => setCep(formatCep(e.target.value))}
                  placeholder="00000-000"
                  maxLength={9}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-8"
                onClick={buscarCep}
                disabled={buscandoCep || cep.length < 9}
              >
                {buscandoCep ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2">Buscar</span>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input
                  id="logradouro"
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  placeholder="Rua, Avenida, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="123"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  placeholder="Apto, Bloco, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Bairro"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Cidade"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value.toUpperCase())}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/igrejas">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Cadastrar Igreja
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
