"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
  const { user, loading: authLoading, igrejaId } = useAuth();

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
  
  // Administrador do sistema
  const [adminNome, setAdminNome] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminSenha, setAdminSenha] = useState("");
  const [adminConfirmarSenha, setAdminConfirmarSenha] = useState("");
  const [adminTelefone, setAdminTelefone] = useState("");
  
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

  // Redireciona se já tem igreja configurada
  useEffect(() => {
    if (!authLoading && user && igrejaId) {
      router.push("/");
    }
  }, [authLoading, user, igrejaId, router]);

  // Carrega igrejas existentes (sedes)
  useEffect(() => {
    async function carregarIgrejas() {
      try {
        const { data, error } = await supabase
          .from("igrejas")
          .select("id, nome, convencao")
          .eq("ativa", true);

        if (error) throw error;
        
        const igrejas: IgrejaExistente[] = (data || []).map(row => ({
          id: row.id,
          nome: row.nome || "Sem nome",
          convencao: row.convencao,
        }));
        
        setIgrejasExistentes(igrejas);
      } catch (err) {
        console.error("Erro ao carregar igrejas:", err);
      } finally {
        setLoadingDados(false);
      }
    }
    
    carregarIgrejas();
  }, []);

  // Carrega unidades da igreja selecionada
  useEffect(() => {
    async function carregarUnidades() {
      if (!igrejaIdSelecionada) {
        setUnidadesExistentes([]);
        return;
      }
      
      if (sedeCriada && sedeCriada.id === igrejaIdSelecionada) {
        setConvencaoSede(sedeCriada.convencao || "");
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from("unidades")
          .select("id, igreja_id, nome, tipo, unidade_pai_id")
          .eq("igreja_id", igrejaIdSelecionada)
          .eq("ativa", true);

        if (error) throw error;
        
        const unidades: UnidadeExistente[] = (data || []).map(row => ({
          id: row.id,
          igrejaId: row.igreja_id,
          nome: row.nome || "Sem nome",
          tipo: row.tipo as TipoUnidade,
          unidadePaiId: row.unidade_pai_id,
        }));
        
        setUnidadesExistentes(unidades);
        
        const igreja = igrejasExistentes.find(i => i.id === igrejaIdSelecionada);
        setConvencaoSede(igreja?.convencao || "");
      } catch (err) {
        console.error("Erro ao carregar unidades:", err);
      }
    }
    
    carregarUnidades();
  }, [igrejaIdSelecionada, igrejasExistentes, sedeCriada]);

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
      const { data: novaIgreja, error: igrejaError } = await supabase
        .from("igrejas")
        .insert({
          nome: novaSedeNome.trim(),
          convencao: novaSedeConvencao.trim(),
          dirigente: novaSedeDirigente.trim() || null,
          ativa: true,
        })
        .select()
        .single();

      if (igrejaError) throw igrejaError;

      const { data: novaUnidade, error: unidadeError } = await supabase
        .from("unidades")
        .insert({
          igreja_id: novaIgreja.id,
          nome: novaSedeNome.trim(),
          tipo: "sede",
          ativa: true,
          dirigente: novaSedeDirigente.trim() || null,
        })
        .select()
        .single();

      if (unidadeError) throw unidadeError;
      
      const novaSedeId = novaIgreja.id;
      const nomeSedeNovo = novaSedeNome.trim();
      const convencaoNova = novaSedeConvencao.trim();
      
      setMostrarFormSede(false);
      setIgrejasExistentes(prev => [...prev, {
        id: novaSedeId,
        nome: nomeSedeNovo,
        convencao: convencaoNova,
      }]);
      
      setUnidadesExistentes([{
        id: novaUnidade.id,
        igrejaId: novaSedeId,
        nome: nomeSedeNovo,
        tipo: "sede",
      }]);
      
      setSedeCriada({
        id: novaSedeId,
        nome: nomeSedeNovo,
        convencao: convencaoNova,
      });
      setIgrejaIdSelecionada(novaSedeId);
      setConvencaoSede(convencaoNova);
      
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
    
    const unidadeSede = unidadesExistentes.find(u => u.tipo === "sede");
    
    setLoading(true);
    try {
      const { data: novaCong, error: errorCong } = await supabase
        .from("unidades")
        .insert({
          igreja_id: igrejaIdParaCriar,
          nome: novaCongregacaoNome.trim(),
          tipo: "congregacao",
          unidade_pai_id: unidadeSede?.id || null,
          ativa: true,
          dirigente: novaCongregacaoDirigente.trim() || null,
        })
        .select()
        .single();

      if (errorCong) throw errorCong;
      
      const novaCongId = novaCong.id;
      const nomeCongNovo = novaCongregacaoNome.trim();
      
      setMostrarFormCongregacao(false);
      setUnidadesExistentes(prev => [...prev, {
        id: novaCongId,
        igrejaId: igrejaIdParaCriar,
        nome: nomeCongNovo,
        tipo: "congregacao",
        unidadePaiId: unidadeSede?.id,
      }]);
      
      setCongregacaoCriada({
        id: novaCongId,
        nome: nomeCongNovo,
      });
      setCongregacaoIdSelecionada(novaCongId);
      
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

    if (!adminNome.trim() || !adminEmail.trim() || !adminSenha.trim()) {
      setError("Nome, e-mail e senha do administrador são obrigatórios");
      return;
    }

    if (adminSenha.trim().length < 6) {
      setError("A senha do administrador deve ter pelo menos 6 caracteres");
      return;
    }

    if (adminSenha.trim() !== adminConfirmarSenha.trim()) {
      setError("As senhas digitadas não coincidem");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let finalIgrejaId: string;
      let finalUnidadeId: string;

      // ========== TIPO SEDE ==========
      if (tipo === "sede") {
        const { data: novaIgreja, error: errorIgreja } = await supabase
          .from("igrejas")
          .insert({
            nome: nome.trim(),
            convencao: ministerio.trim() || nome.trim(),
            dirigente: dirigente.trim() || null,
            ministerio: ministerio.trim() || null,
            telefone: telefone.trim() || null,
            email: email.trim() || null,
            cnpj: cnpj.trim() || null,
            cep: cep || null,
            logradouro: logradouro.trim() || null,
            numero: numero.trim() || null,
            complemento: complemento.trim() || null,
            bairro: bairro.trim() || null,
            cidade: cidade.trim() || null,
            estado: estado.trim() || null,
            ativa: true,
          })
          .select()
          .single();

        if (errorIgreja) throw errorIgreja;
        finalIgrejaId = novaIgreja.id;
        
        const { data: novaUnidade, error: errorUnidade } = await supabase
          .from("unidades")
          .insert({
            igreja_id: finalIgrejaId,
            nome: nome.trim(),
            tipo: "sede",
            dirigente: dirigente.trim() || null,
            telefone: telefone.trim() || null,
            cep: cep || null,
            logradouro: logradouro.trim() || null,
            numero: numero.trim() || null,
            complemento: complemento.trim() || null,
            bairro: bairro.trim() || null,
            cidade: cidade.trim() || null,
            estado: estado.trim() || null,
            ativa: true,
          })
          .select()
          .single();

        if (errorUnidade) throw errorUnidade;
        finalUnidadeId = novaUnidade.id;

        // Cria a Regional 1 automaticamente hospedada na Sede
        const { data: novaRegional, error: errorRegional } = await supabase
          .from("regionais_setores")
          .insert({
            igreja_id: finalIgrejaId,
            tipo: "regional",
            numero: 1,
            nome: "Regional 1",
            hospedeira_id: finalUnidadeId,
            dirigente: dirigente.trim() || null,
          })
          .select()
          .single();

        if (errorRegional) throw errorRegional;

        // Vincula a regional na unidade Sede
        await supabase
          .from("unidades")
          .update({
            eh_hospedeira: true,
            regional_setor_id: novaRegional.id,
          })
          .eq("id", finalUnidadeId);
      }
      
      // ========== TIPO CONGREGAÇÃO ==========
      else if (tipo === "congregacao") {
        finalIgrejaId = sedeCriada?.id || igrejaIdSelecionada;
        
        if (!finalIgrejaId) {
          setError("Selecione ou crie uma sede primeiro");
          setLoading(false);
          return;
        }
        
        const unidadeSede = unidadesExistentes.find(u => u.tipo === "sede");
        
        const { data: novaUnidade, error: errorUnidade } = await supabase
          .from("unidades")
          .insert({
            igreja_id: finalIgrejaId,
            nome: nome.trim(),
            tipo: "congregacao",
            unidade_pai_id: unidadeSede?.id || null,
            dirigente: dirigente.trim() || null,
            telefone: telefone.trim() || null,
            cep: cep || null,
            logradouro: logradouro.trim() || null,
            numero: numero.trim() || null,
            complemento: complemento.trim() || null,
            bairro: bairro.trim() || null,
            cidade: cidade.trim() || null,
            estado: estado.trim() || null,
            ativa: true,
          })
          .select()
          .single();

        if (errorUnidade) throw errorUnidade;
        finalUnidadeId = novaUnidade.id;
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
        
        const { data: novaUnidade, error: errorUnidade } = await supabase
          .from("unidades")
          .insert({
            igreja_id: finalIgrejaId,
            nome: nome.trim(),
            tipo: "subcongregacao",
            unidade_pai_id: congregacaoVinculoId,
            dirigente: dirigente.trim() || null,
            telefone: telefone.trim() || null,
            cep: cep || null,
            logradouro: logradouro.trim() || null,
            numero: numero.trim() || null,
            complemento: complemento.trim() || null,
            bairro: bairro.trim() || null,
            cidade: cidade.trim() || null,
            estado: estado.trim() || null,
            ativa: true,
          })
          .select()
          .single();

        if (errorUnidade) throw errorUnidade;
        finalUnidadeId = novaUnidade.id;
      }

      // ========== CRIAR USUÁRIO ADMINISTRADOR NO SUPABASE AUTH ==========
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail.trim(),
        password: adminSenha.trim(),
        options: {
          data: {
            nome: adminNome.trim(),
          }
        }
      });

      if (authError) throw authError;

      const authUser = authData.user;
      if (!authUser) throw new Error("Erro ao criar credenciais do usuário.");

      // Insere o registro na tabela de usuarios
      const { error: userTableError } = await supabase
        .from("usuarios")
        .insert({
          id: authUser.id,
          nome: adminNome.trim(),
          telefone: adminTelefone.trim() || null,
          email: adminEmail.trim(),
          nivel_acesso: "full",
          igreja_id: finalIgrejaId,
          unidade_id: finalUnidadeId,
          ativo: true,
        });

      if (userTableError) throw userTableError;

      if (authData.session) {
        toast.success("Cadastro e login realizados com sucesso!");
        window.location.href = "/";
      } else {
        toast.success("Cadastro realizado! Por favor, verifique o e-mail de confirmação enviado para " + adminEmail.trim() + " para ativar sua conta.");
        window.location.href = "/login";
      }
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

  if (loadingDados) {
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
                          {igrejasExistentes.length === 0 && (
                            <SelectItem value="" disabled>
                              Nenhuma sede cadastrada no momento
                            </SelectItem>
                          )}
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

          {/* ========== ADMINISTRADOR DO SISTEMA ========== */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Administrador do Sistema</h3>
            <p className="text-sm text-muted-foreground">
              Cadastre o administrador do sistema com seu e-mail e senha correspondentes.
            </p>
            <FieldGroup className="space-y-4">
              <Field>
                <FieldLabel>Nome do Administrador *</FieldLabel>
                <Input
                  placeholder="Nome do administrador"
                  value={adminNome}
                  onChange={(e) => setAdminNome(e.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>E-mail (Login) *</FieldLabel>
                  <Input
                    type="email"
                    placeholder="admin@igreja.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Telefone do Administrador</FieldLabel>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={adminTelefone}
                    onChange={(e) => setAdminTelefone(e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Senha de Acesso *</FieldLabel>
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={adminSenha}
                    onChange={(e) => setAdminSenha(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Confirmar Senha *</FieldLabel>
                  <Input
                    type="password"
                    placeholder="Digite a senha novamente"
                    value={adminConfirmarSenha}
                    onChange={(e) => setAdminConfirmarSenha(e.target.value)}
                  />
                </Field>
              </div>
            </FieldGroup>
          </div>

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
