"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, collection, addDoc, Timestamp, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Church, MapPin, Building2, ArrowRight, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { TipoUnidade } from "@/lib/types";

type TipoSelecionado = "sede" | "congregacao" | "subcongregacao";

interface IgrejaExistente {
  id: string;
  nome: string;
  convencao?: string;
}

interface UnidadeExistente {
  id: string;
  igrejaId: string;
  nome: string;
  tipo: TipoUnidade;
  unidadePaiId?: string;
}

export default function SetupIgrejaPage() {
  const router = useRouter();
  const { user, loading: authLoading, igrejaId, signOut } = useAuth();

  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);
  const [error, setError] = useState("");
  
  // Tipo da unidade que o usuário quer cadastrar
  const [tipo, setTipo] = useState<TipoSelecionado>("sede");
  
  // Dados da unidade do usuário
  const [nome, setNome] = useState("");
  const [dirigente, setDirigente] = useState("");
  const [ministerio, setMinisterio] = useState("");
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
  
  // Hierarquia - Igrejas (Sedes) existentes
  const [igrejasExistentes, setIgrejasExistentes] = useState<IgrejaExistente[]>([]);
  const [igrejaIdSelecionada, setIgrejaIdSelecionada] = useState("");
  
  // Unidades existentes (congregações da igreja selecionada)
  const [unidadesExistentes, setUnidadesExistentes] = useState<UnidadeExistente[]>([]);
  const [congregacaoIdSelecionada, setCongregacaoIdSelecionada] = useState("");
  
  // Estados para criação de nova sede
  const [mostrarFormSede, setMostrarFormSede] = useState(false);
  const [novaSedeNome, setNovaSedeNome] = useState("");
  const [novaSedeConvencao, setNovaSedeConvencao] = useState("");
  const [novaSedeDirigente, setNovaSedeDirigente] = useState("");
  const [sedeCriada, setSedeCriada] = useState<{id: string, nome: string, convencao: string} | null>(null);
  
  // Estados para criação de nova congregação
  const [mostrarFormCongregacao, setMostrarFormCongregacao] = useState(false);
  const [novaCongregacaoNome, setNovaCongregacaoNome] = useState("");
  const [novaCongregacaoDirigente, setNovaCongregacaoDirigente] = useState("");
  const [congregacaoCriada, setCongregacaoCriada] = useState<{id: string, nome: string} | null>(null);
  
  // Convenção da sede (para exibição)
  const [convencaoSede, setConvencaoSede] = useState("");

  // Redireciona se já tem igreja
  useEffect(() => {
    if (!authLoading && igrejaId) {
      router.push("/");
    }
  }, [authLoading, igrejaId, router]);

  // Redireciona se não está logado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Carrega igrejas existentes (sedes)
  useEffect(() => {
    async function carregarIgrejas() {
      try {
        const igrejasRef = collection(db, "igrejas");
        const snapshot = await getDocs(igrejasRef);
        
        const igrejas: IgrejaExistente[] = [];
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          igrejas.push({
            id: docSnap.id,
            nome: data.nome || "Sem nome",
            convencao: data.convencao,
          });
        });
        
        setIgrejasExistentes(igrejas);
      } catch (err) {
        console.error("Erro ao carregar igrejas:", err);
      } finally {
        setLoadingDados(false);
      }
    }
    
    if (user) {
      carregarIgrejas();
    }
  }, [user]);

  // Carrega unidades da igreja selecionada
  // Não carrega se a sede foi criada inline (já temos os dados)
  useEffect(() => {
    async function carregarUnidades() {
      if (!igrejaIdSelecionada) {
        setUnidadesExistentes([]);
        return;
      }
      
      // Se a sede foi criada inline, não precisamos buscar do Firestore
      // Os dados já foram adicionados ao estado em handleCriarSede
      if (sedeCriada && sedeCriada.id === igrejaIdSelecionada) {
        // Busca convenção da igreja (já está no sedeCriada)
        setConvencaoSede(sedeCriada.convencao || "");
        return;
      }
      
      try {
        const unidadesRef = collection(db, "igrejas", igrejaIdSelecionada, "unidades");
        const snapshot = await getDocs(unidadesRef);
        
        const unidades: UnidadeExistente[] = [];
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          unidades.push({
            id: docSnap.id,
            igrejaId: igrejaIdSelecionada,
            nome: data.nome || "Sem nome",
            tipo: data.tipo || "sede",
            unidadePaiId: data.unidadePaiId,
          });
        });
        
        setUnidadesExistentes(unidades);
        
        // Busca convenção da igreja
        const igreja = igrejasExistentes.find(i => i.id === igrejaIdSelecionada);
        setConvencaoSede(igreja?.convencao || "");
      } catch (err) {
        console.error("Erro ao carregar unidades:", err);
      }
    }
    
    carregarUnidades();
  }, [igrejaIdSelecionada, igrejasExistentes, sedeCriada]);

  // Filtra congregações da igreja selecionada
  const congregacoesDaIgreja = unidadesExistentes.filter(u => u.tipo === "congregacao");

  const buscarCep = async () => {
    if (cep.length !== 8) return;
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setLogradouro(data.logradouro || "");
        setBairro(data.bairro || "");
        setCidade(data.localidade || "");
        setEstado(data.uf || "");
      }
    } catch (err) {
      console.error("Erro ao buscar CEP:", err);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    setCep(digits);
  };

  const formatCep = (value: string) => {
    if (value.length <= 5) return value;
    return `${value.slice(0, 5)}-${value.slice(5)}`;
  };

  // ========== CRIAR SEDE ==========
  const handleCriarSede = async () => {
    if (!novaSedeNome.trim()) {
      toast.error("Nome da sede é obrigatório");
      return;
    }
    if (!novaSedeConvencao.trim()) {
      toast.error("Convenção é obrigatória");
      return;
    }
    
    setLoading(true);
    try {
      // Cria documento da igreja (sede) na coleção igrejas
      const igrejaData: Record<string, unknown> = {
        nome: novaSedeNome.trim(),
        convencao: novaSedeConvencao.trim(),
        dataCadastro: Timestamp.now(),
        ativa: true,
      };
      
      if (novaSedeDirigente.trim()) {
        igrejaData.dirigente = novaSedeDirigente.trim();
      }
      
      const igrejasRef = collection(db, "igrejas");
      const novaIgrejaRef = await addDoc(igrejasRef, igrejaData);
      
      // Cria a unidade sede dentro da subcoleção unidades
      const unidadesRef = collection(db, "igrejas", novaIgrejaRef.id, "unidades");
      const novaUnidadeSedeRef = await addDoc(unidadesRef, {
        nome: novaSedeNome.trim(),
        tipo: "sede",
        dataCriacao: Timestamp.now(),
        ativa: true,
        dirigente: novaSedeDirigente.trim() || null,
      });
      
      const novaSedeId = novaIgrejaRef.id;
      const nomeSedeNovo = novaSedeNome.trim();
      const convencaoNova = novaSedeConvencao.trim();
      
      // Atualiza estados de forma síncrona para evitar race conditions
      // Primeiro fecha o form
      setMostrarFormSede(false);
      
      // Atualiza lista de igrejas existentes
      setIgrejasExistentes(prev => [...prev, {
        id: novaSedeId,
        nome: nomeSedeNovo,
        convencao: convencaoNova,
      }]);
      
      // Atualiza lista de unidades com a sede recém-criada
      setUnidadesExistentes([{
        id: novaUnidadeSedeRef.id,
        igrejaId: novaSedeId,
        nome: nomeSedeNovo,
        tipo: "sede",
      }]);
      
      // Atualiza a sede criada e seleção
      setSedeCriada({
        id: novaSedeId,
        nome: nomeSedeNovo,
        convencao: convencaoNova,
      });
      setIgrejaIdSelecionada(novaSedeId);
      setConvencaoSede(convencaoNova);
      
      // Limpa os campos do form
      setNovaSedeNome("");
      setNovaSedeConvencao("");
      setNovaSedeDirigente("");
      
      toast.success("Sede criada com sucesso!");
    } catch (err) {
      console.error("Erro ao criar sede:", err);
      toast.error("Erro ao criar sede");
    } finally {
      setLoading(false);
    }
  };

  // ========== CRIAR CONGREGAÇÃO ==========
  const handleCriarCongregacao = async () => {
    if (!novaCongregacaoNome.trim()) {
      toast.error("Nome da congregação é obrigatório");
      return;
    }
    
    const igrejaIdParaCriar = sedeCriada?.id || igrejaIdSelecionada;
    if (!igrejaIdParaCriar) {
      toast.error("Selecione ou crie uma sede primeiro");
      return;
    }
    
    // Encontra a unidade sede para vincular
    const unidadeSede = unidadesExistentes.find(u => u.tipo === "sede");
    
    setLoading(true);
    try {
      const unidadesRef = collection(db, "igrejas", igrejaIdParaCriar, "unidades");
      const novaCongregacaoRef = await addDoc(unidadesRef, {
        nome: novaCongregacaoNome.trim(),
        tipo: "congregacao",
        unidadePaiId: unidadeSede?.id || null,
        dataCriacao: Timestamp.now(),
        ativa: true,
        dirigente: novaCongregacaoDirigente.trim() || null,
      });
      
      const novaCongId = novaCongregacaoRef.id;
      const nomeCongNovo = novaCongregacaoNome.trim();
      
      // Fecha o form primeiro
      setMostrarFormCongregacao(false);
      
      // Adiciona à lista de unidades existentes
      setUnidadesExistentes(prev => [...prev, {
        id: novaCongId,
        igrejaId: igrejaIdParaCriar,
        nome: nomeCongNovo,
        tipo: "congregacao",
        unidadePaiId: unidadeSede?.id,
      }]);
      
      // Atualiza estado da congregação criada
      setCongregacaoCriada({
        id: novaCongId,
        nome: nomeCongNovo,
      });
      setCongregacaoIdSelecionada(novaCongId);
      
      // Limpa os campos do form
      setNovaCongregacaoNome("");
      setNovaCongregacaoDirigente("");
      
      toast.success("Congregação criada com sucesso!");
    } catch (err) {
      console.error("Erro ao criar congregação:", err);
      toast.error("Erro ao criar congregação");
    } finally {
      setLoading(false);
    }
  };

  // ========== SUBMIT FINAL ==========
  const handleSubmit = async () => {
    if (!nome.trim()) {
      setError("Digite o nome da unidade");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("Usuário não autenticado");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let finalIgrejaId: string;
      let finalUnidadeId: string;

      // ========== TIPO SEDE ==========
      if (tipo === "sede") {
        // Cria documento da igreja (sede)
        const igrejaData: Record<string, unknown> = {
          nome: nome.trim(),
          convencao: ministerio.trim() || nome.trim(), // Usa ministério como convenção ou nome
          dataCadastro: Timestamp.now(),
          ativa: true,
        };
        
        if (dirigente.trim()) igrejaData.dirigente = dirigente.trim();
        if (ministerio.trim()) igrejaData.ministerio = ministerio.trim();
        if (telefone.trim()) igrejaData.telefone = telefone.trim();
        if (email.trim()) igrejaData.email = email.trim();
        if (cnpj.trim()) igrejaData.cnpj = cnpj.trim();
        
        // Endereço
        const enderecoData: Record<string, string> = {};
        if (cep) enderecoData.cep = cep;
        if (logradouro.trim()) enderecoData.logradouro = logradouro.trim();
        if (numero.trim()) enderecoData.numero = numero.trim();
        if (complemento.trim()) enderecoData.complemento = complemento.trim();
        if (bairro.trim()) enderecoData.bairro = bairro.trim();
        if (cidade.trim()) enderecoData.cidade = cidade.trim();
        if (estado.trim()) enderecoData.estado = estado.trim();
        
        if (Object.keys(enderecoData).length > 0) {
          igrejaData.endereco = enderecoData;
        }
        
        const igrejasRef = collection(db, "igrejas");
        const novaIgrejaRef = await addDoc(igrejasRef, igrejaData);
        finalIgrejaId = novaIgrejaRef.id;
        
        // Cria a unidade sede
        const unidadesRef = collection(db, "igrejas", finalIgrejaId, "unidades");
        const unidadeData: Record<string, unknown> = {
          nome: nome.trim(),
          tipo: "sede",
          dataCriacao: Timestamp.now(),
          ativa: true,
        };
        if (dirigente.trim()) unidadeData.dirigente = dirigente.trim();
        if (Object.keys(enderecoData).length > 0) unidadeData.endereco = enderecoData;
        
        const novaUnidadeRef = await addDoc(unidadesRef, unidadeData);
        finalUnidadeId = novaUnidadeRef.id;

        // Cria a Regional 1 automaticamente hospedada na Sede
        const regionaisRef = collection(db, "igrejas", finalIgrejaId, "regionais_setores");
        const regionalDocRef = await addDoc(regionaisRef, {
          tipo: "regional",
          numero: 1,
          nome: "Regional 1",
          hospedeiraId: finalUnidadeId,
          dirigente: dirigente.trim() || null,
          igrejasMembrosIds: [finalUnidadeId],
          dataCriacao: Timestamp.now()
        });

        // Atualiza a unidade Sede com as referências da regional
        await updateDoc(doc(db, "igrejas", finalIgrejaId, "unidades", finalUnidadeId), {
          ehHospedeira: true,
          hospedaRegionalId: regionalDocRef.id,
          regionalSetorId: regionalDocRef.id
        });
      }
      
      // ========== TIPO CONGREGAÇÃO ==========
      else if (tipo === "congregacao") {
        finalIgrejaId = sedeCriada?.id || igrejaIdSelecionada;
        
        if (!finalIgrejaId) {
          setError("Selecione ou crie uma sede primeiro");
          setLoading(false);
          return;
        }
        
        // Encontra a unidade sede para vincular
        const unidadeSede = unidadesExistentes.find(u => u.tipo === "sede");
        
        // Cria a unidade congregação
        const unidadesRef = collection(db, "igrejas", finalIgrejaId, "unidades");
        const unidadeData: Record<string, unknown> = {
          nome: nome.trim(),
          tipo: "congregacao",
          unidadePaiId: unidadeSede?.id || null,
          dataCriacao: Timestamp.now(),
          ativa: true,
        };
        if (dirigente.trim()) unidadeData.dirigente = dirigente.trim();
        if (telefone.trim()) unidadeData.telefone = telefone.trim();
        
        // Endereço
        const enderecoData: Record<string, string> = {};
        if (cep) enderecoData.cep = cep;
        if (logradouro.trim()) enderecoData.logradouro = logradouro.trim();
        if (numero.trim()) enderecoData.numero = numero.trim();
        if (complemento.trim()) enderecoData.complemento = complemento.trim();
        if (bairro.trim()) enderecoData.bairro = bairro.trim();
        if (cidade.trim()) enderecoData.cidade = cidade.trim();
        if (estado.trim()) enderecoData.estado = estado.trim();
        
        if (Object.keys(enderecoData).length > 0) {
          unidadeData.endereco = enderecoData;
        }
        
        const novaUnidadeRef = await addDoc(unidadesRef, unidadeData);
        finalUnidadeId = novaUnidadeRef.id;
      }
      
      // ========== TIPO SUBCONGREGAÇÃO ==========
      else {
        finalIgrejaId = sedeCriada?.id || igrejaIdSelecionada;
        
        if (!finalIgrejaId) {
          setError("Selecione ou crie uma sede primeiro");
          setLoading(false);
          return;
        }
        
        const congregacaoVinculoId = congregacaoCriada?.id || congregacaoIdSelecionada;
        if (!congregacaoVinculoId) {
          setError("Selecione ou crie uma congregação primeiro");
          setLoading(false);
          return;
        }
        
        // Cria a unidade subcongregação
        const unidadesRef = collection(db, "igrejas", finalIgrejaId, "unidades");
        const unidadeData: Record<string, unknown> = {
          nome: nome.trim(),
          tipo: "subcongregacao",
          unidadePaiId: congregacaoVinculoId,
          dataCriacao: Timestamp.now(),
          ativa: true,
        };
        if (dirigente.trim()) unidadeData.dirigente = dirigente.trim();
        if (telefone.trim()) unidadeData.telefone = telefone.trim();
        
        // Endereço
        const enderecoData: Record<string, string> = {};
        if (cep) enderecoData.cep = cep;
        if (logradouro.trim()) enderecoData.logradouro = logradouro.trim();
        if (numero.trim()) enderecoData.numero = numero.trim();
        if (complemento.trim()) enderecoData.complemento = complemento.trim();
        if (bairro.trim()) enderecoData.bairro = bairro.trim();
        if (cidade.trim()) enderecoData.cidade = cidade.trim();
        if (estado.trim()) enderecoData.estado = estado.trim();
        
        if (Object.keys(enderecoData).length > 0) {
          unidadeData.endereco = enderecoData;
        }
        
        const novaUnidadeRef = await addDoc(unidadesRef, unidadeData);
        finalUnidadeId = novaUnidadeRef.id;
      }

      // Atualiza o usuário com a igreja e unidade
      const userRef = doc(db, "usuarios", currentUser.uid);
      await setDoc(userRef, {
        igrejaId: finalIgrejaId,
        unidadeId: finalUnidadeId,
        nivelAcesso: tipo === "sede" ? "full" : "admin",
        dataAtualizacao: Timestamp.now(),
      }, { merge: true });

      toast.success("Cadastro realizado com sucesso!");
      window.location.href = "/";
    } catch (err: unknown) {
      console.error("Erro ao cadastrar:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Erro ao cadastrar. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset quando muda o tipo
  useEffect(() => {
    setIgrejaIdSelecionada("");
    setCongregacaoIdSelecionada("");
    setSedeCriada(null);
    setCongregacaoCriada(null);
    setMostrarFormSede(false);
    setMostrarFormCongregacao(false);
    setConvencaoSede("");
  }, [tipo]);

  if (authLoading || loadingDados) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-start bg-gradient-to-b from-background to-muted/30 p-4 py-8">
      <div className="absolute top-4 right-4">
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          Sair / Voltar ao Login
        </Button>
      </div>
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Church className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Cadastrar Igreja</h1>
        <p className="text-muted-foreground">Configure os dados da sua igreja</p>
      </div>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Dados da Igreja
          </CardTitle>
          <CardDescription>
            Preencha as informações abaixo para cadastrar sua igreja no sistema.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Tipo da Unidade */}
          <FieldGroup>
            <Field>
              <FieldLabel>O que você deseja cadastrar? *</FieldLabel>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoSelecionado)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sede">Igreja Sede</SelectItem>
                  <SelectItem value="congregacao">Congregação</SelectItem>
                  <SelectItem value="subcongregacao">Subcongregação</SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                {tipo === "sede" && "Igreja principal/matriz. Você definirá a convenção/denominação."}
                {tipo === "congregacao" && "Igreja vinculada a uma sede. A convenção será herdada."}
                {tipo === "subcongregacao" && "Ponto de pregação vinculado a uma congregação."}
              </FieldDescription>
            </Field>
          </FieldGroup>

          {/* ========== SELEÇÃO/CRIAÇÃO DE SEDE (para congregação e subcongregação) ========== */}
          {(tipo === "congregacao" || tipo === "subcongregacao") && (
            <FieldGroup>
              <Field>
                <FieldLabel>Igreja Sede *</FieldLabel>
                
                {/* Se já criou uma sede */}
                {sedeCriada ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                    <Check className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">{sedeCriada.nome}</p>
                      <p className="text-sm text-green-600">{sedeCriada.convencao}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Select para escolher sede existente */}
                    {!mostrarFormSede && (
                      <Select 
                        value={igrejaIdSelecionada} 
                        onValueChange={(v) => {
                          setIgrejaIdSelecionada(v);
                          setCongregacaoIdSelecionada("");
                          setCongregacaoCriada(null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma sede existente" />
                        </SelectTrigger>
                        <SelectContent>
                          {igrejasExistentes.map(igreja => (
                            <SelectItem key={igreja.id} value={igreja.id}>
                              {igreja.nome} {igreja.convencao && `(${igreja.convencao})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {/* Botão para mostrar form de nova sede */}
                    {!mostrarFormSede && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="mt-2 w-full border-dashed"
                        onClick={() => setMostrarFormSede(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {igrejasExistentes.length === 0 ? "Criar Primeira Sede" : "Adicionar Nova Sede"}
                      </Button>
                    )}
                    
                    {/* Form para criar nova sede */}
                    {mostrarFormSede && (
                      <div className="mt-3 rounded-lg border border-dashed border-primary/50 bg-primary/5 p-4 space-y-4">
                        <p className="text-sm font-medium text-primary">Nova Sede</p>
                        <Field>
                          <FieldLabel>Nome da Sede *</FieldLabel>
                          <Input
                            placeholder="Ex: AD Ministério Madureira"
                            value={novaSedeNome}
                            onChange={(e) => setNovaSedeNome(e.target.value)}
                          />
                        </Field>
                        <Field>
                          <FieldLabel>Convenção/Denominação *</FieldLabel>
                          <Input
                            placeholder="Ex: Assembleia de Deus"
                            value={novaSedeConvencao}
                            onChange={(e) => setNovaSedeConvencao(e.target.value)}
                          />
                        </Field>
                        <Field>
                          <FieldLabel>Dirigente da Sede</FieldLabel>
                          <Input
                            placeholder="Nome do pastor da sede"
                            value={novaSedeDirigente}
                            onChange={(e) => setNovaSedeDirigente(e.target.value)}
                          />
                        </Field>
                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setMostrarFormSede(false)}
                            className="flex-1"
                          >
                            Cancelar
                          </Button>
                          <Button 
                            type="button" 
                            onClick={handleCriarSede}
                            disabled={loading || !novaSedeNome.trim() || !novaSedeConvencao.trim()}
                            className="flex-1"
                          >
                            {loading ? <Spinner className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
                            Criar Sede
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                {/* Mostra convenção da sede selecionada */}
                {igrejaIdSelecionada && !sedeCriada && convencaoSede && (
                  <FieldDescription>
                    Convenção: {convencaoSede}
                  </FieldDescription>
                )}
              </Field>
            </FieldGroup>
          )}

          {/* ========== SELEÇÃO/CRIAÇÃO DE CONGREGAÇÃO (apenas para subcongregação) ========== */}
          {tipo === "subcongregacao" && (sedeCriada || igrejaIdSelecionada) && (
            <FieldGroup>
              <Field>
                <FieldLabel>Congregação *</FieldLabel>
                
                {/* Se já criou uma congregação */}
                {congregacaoCriada ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <Check className="h-5 w-5 text-amber-600" />
                    <p className="font-medium text-amber-800">{congregacaoCriada.nome}</p>
                  </div>
                ) : (
                  <>
                    {/* Select para escolher congregação existente */}
                    {!mostrarFormCongregacao && (
                      <Select 
                        value={congregacaoIdSelecionada} 
                        onValueChange={setCongregacaoIdSelecionada}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma congregação" />
                        </SelectTrigger>
                        <SelectContent>
                          {congregacoesDaIgreja.length === 0 && (
                            <SelectItem value="" disabled>
                              Nenhuma congregação cadastrada
                            </SelectItem>
                          )}
                          {congregacoesDaIgreja.map(cong => (
                            <SelectItem key={cong.id} value={cong.id}>
                              {cong.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {/* Botão para mostrar form de nova congregação */}
                    {!mostrarFormCongregacao && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="mt-2 w-full border-dashed"
                        onClick={() => setMostrarFormCongregacao(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {congregacoesDaIgreja.length === 0 ? "Criar Primeira Congregação" : "Adicionar Nova Congregação"}
                      </Button>
                    )}
                    
                    {/* Form para criar nova congregação */}
                    {mostrarFormCongregacao && (
                      <div className="mt-3 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-4 space-y-4">
                        <p className="text-sm font-medium text-amber-700">Nova Congregação</p>
                        <Field>
                          <FieldLabel>Nome da Congregação *</FieldLabel>
                          <Input
                            placeholder="Ex: Congregação Vila Nova"
                            value={novaCongregacaoNome}
                            onChange={(e) => setNovaCongregacaoNome(e.target.value)}
                          />
                        </Field>
                        <Field>
                          <FieldLabel>Dirigente da Congregação</FieldLabel>
                          <Input
                            placeholder="Nome do dirigente"
                            value={novaCongregacaoDirigente}
                            onChange={(e) => setNovaCongregacaoDirigente(e.target.value)}
                          />
                        </Field>
                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setMostrarFormCongregacao(false)}
                            className="flex-1"
                          >
                            Cancelar
                          </Button>
                          <Button 
                            type="button" 
                            onClick={handleCriarCongregacao}
                            disabled={loading || !novaCongregacaoNome.trim()}
                            className="flex-1"
                          >
                            {loading ? <Spinner className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
                            Criar Congregação
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </Field>
            </FieldGroup>
          )}

          {/* ========== DADOS DA UNIDADE DO USUÁRIO ========== */}
          <FieldGroup>
            <Field>
              <FieldLabel>
                {tipo === "sede" ? "Nome da Sede *" : 
                 tipo === "congregacao" ? "Nome da Congregação *" : 
                 "Nome da Subcongregação *"}
              </FieldLabel>
              <Input
                placeholder={tipo === "sede" ? "Ex: AD Ministério Madureira - Sede" : 
                            tipo === "congregacao" ? "Ex: Congregação Vila Nova" : 
                            "Ex: Ponto de Pregação Centro"}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Dirigente/Pastor</FieldLabel>
                <Input
                  placeholder="Nome do pastor ou dirigente"
                  value={dirigente}
                  onChange={(e) => setDirigente(e.target.value)}
                />
              </Field>
              {tipo === "sede" && (
                <Field>
                  <FieldLabel>Ministério/Convenção</FieldLabel>
                  <Input
                    placeholder="Ex: Ministério Madureira"
                    value={ministerio}
                    onChange={(e) => setMinisterio(e.target.value)}
                  />
                </Field>
              )}
            </div>
          </FieldGroup>

          {/* Contato */}
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Telefone</FieldLabel>
                <Input
                  placeholder="(11) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>E-mail</FieldLabel>
                <Input
                  type="email"
                  placeholder="contato@igreja.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            </div>
            {tipo === "sede" && (
              <Field>
                <FieldLabel>CNPJ</FieldLabel>
                <Input
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                />
              </Field>
            )}
          </FieldGroup>

          {/* Endereço */}
          <FieldGroup>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Endereço</span>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel>CEP</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="00000-000"
                    value={formatCep(cep)}
                    onChange={handleCepChange}
                    onBlur={buscarCep}
                  />
                  <Button type="button" variant="outline" onClick={buscarCep} disabled={cep.length !== 8}>
                    Buscar
                  </Button>
                </div>
              </Field>
            </div>

            <Field>
              <FieldLabel>Logradouro</FieldLabel>
              <Input
                placeholder="Rua, Avenida, etc."
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel>Número</FieldLabel>
                <Input
                  placeholder="123"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel>Complemento</FieldLabel>
                <Input
                  placeholder="Apto, Bloco, etc."
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel>Bairro</FieldLabel>
                <Input
                  placeholder="Bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Cidade</FieldLabel>
                <Input
                  placeholder="Cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Estado</FieldLabel>
                <Input
                  placeholder="SP"
                  maxLength={2}
                  value={estado}
                  onChange={(e) => setEstado(e.target.value.toUpperCase())}
                />
              </Field>
            </div>
          </FieldGroup>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={loading || !nome.trim() || 
              (tipo !== "sede" && !sedeCriada && !igrejaIdSelecionada) ||
              (tipo === "subcongregacao" && !congregacaoCriada && !congregacaoIdSelecionada)}
          >
            {loading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Cadastrando...
              </>
            ) : (
              <>
                Cadastrar e Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
