"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/auth-context";
import { Igreja, TipoIgreja, TIPOS_IGREJA, Endereco } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Save, Loader2, Search, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { FotoUpload } from "@/components/membros/foto-upload";

interface IgrejaFormProps {
  igrejaId?: string;
  unidadeId?: string;
  parentIgrejaId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function IgrejaForm({ igrejaId, unidadeId, parentIgrejaId, onSuccess, onCancel }: IgrejaFormProps) {
  const { usuario } = useAuth();
  const [loading, setLoading] = useState(!!igrejaId || !!unidadeId);
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
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);

  // Collapsible section states
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [adminNome, setAdminNome] = useState("");
  const [adminTelefone, setAdminTelefone] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminSenha, setAdminSenha] = useState("");
  const [adminConfirmaSenha, setAdminConfirmaSenha] = useState("");
  const [originalAdmin, setOriginalAdmin] = useState<{ id: string; nome: string; telefone: string, igrejaId?: string, unidadeId?: string, ativo?: boolean, dataCriacao?: any, criadoPor?: string | null } | null>(null);

  useEffect(() => {
    loadIgrejasExistentes();
    if (igrejaId || (unidadeId && parentIgrejaId)) {
      loadIgreja();
    }
  }, [igrejaId, unidadeId, parentIgrejaId]);

  const loadIgreja = async () => {
    try {
      setLoading(true);
      let data;
      if (unidadeId && parentIgrejaId) {
        const { data: uData, error } = await supabase
          .from("unidades")
          .select("*")
          .eq("id", unidadeId)
          .single();
        if (error) throw error;
        data = uData;
      } else if (igrejaId) {
        const { data: iData, error } = await supabase
          .from("igrejas")
          .select("*")
          .eq("id", igrejaId)
          .single();
        if (error) throw error;
        data = iData;
      } else {
        setLoading(false);
        return;
      }
      
      if (data) {
        setNome(data.nome || "");
        setTipo(data.tipo || "sede");
        setCodIgreja(data.cod_igreja || "");
        setConvencao(data.convencao || "");
        setMinisterio(data.ministerio || "");
        setIgrejaPaiId(data.igreja_pai_id || "");
        setDirigente(data.dirigente || "");
        setTelefone(formatTelefone(data.telefone || ""));
        setEmail(data.email || "");
        setCnpj(formatCnpj(data.cnpj || ""));

        // Endereço
        setCep(formatCep(data.cep || ""));
        setLogradouro(data.logradouro || "");
        setNumero(data.numero || "");
        setComplemento(data.complemento || "");
        setBairro(data.bairro || "");
        setCidade(data.cidade || "");
        setEstado(data.estado || "");
        setFotoBase64(data.foto_url || null);

        // Carregar o administrador
        try {
          const { data: adminData, error: adminError } = await supabase
            .from("usuarios")
            .select("*")
            .eq(unidadeId ? "unidade_id" : "igreja_id", unidadeId || igrejaId)
            .eq("nivel_acesso", "admin")
            .limit(1)
            .maybeSingle();
          
          if (adminError) throw adminError;

          if (adminData) {
            setOriginalAdmin({
              id: adminData.id,
              nome: adminData.nome || "",
              telefone: adminData.telefone || "",
              igrejaId: adminData.igreja_id,
              unidadeId: adminData.unidade_id,
              ativo: adminData.ativo,
              dataCriacao: adminData.data_criacao,
            });
            setAdminNome(adminData.nome || "");
            setAdminTelefone(formatTelefone(adminData.telefone || ""));
          }
        } catch (err) {
          console.error("Erro ao carregar administrador:", err);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar igreja:", error);
      toast.error("Erro ao carregar igreja");
    } finally {
      setLoading(false);
    }
  };

  const loadIgrejasExistentes = async () => {
    try {
      const { data, error } = await supabase
        .from("igrejas")
        .select("*")
        .eq("ativa", true);
      
      if (error) throw error;
      setIgrejasExistentes((data || []).filter(i => i.id !== igrejaId));
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
      toast.error("O nome da igreja é obrigatório.");
      return;
    }

    if (!(igrejaId || unidadeId)) {
      if (!adminNome.trim() || !adminTelefone.trim()) {
        toast.error("O nome e telefone do administrador são obrigatórios.");
        return;
      }
      const adminPhoneDigits = adminTelefone.replace(/\D/g, "");
      if (adminPhoneDigits.length < 10) {
        toast.error("Telefone do administrador inválido.");
        return;
      }
      if (!adminEmail.trim()) {
        toast.error("O e-mail do administrador é obrigatório.");
        return;
      }
      if (!adminSenha.trim()) {
        toast.error("A senha do administrador é obrigatória.");
        return;
      }
      if (adminSenha.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres.");
        return;
      }
      if (adminSenha !== adminConfirmaSenha) {
        toast.error("As senhas não coincidem.");
        return;
      }
    } else {
      if (adminNome.trim() || adminTelefone.trim()) {
        if (!adminNome.trim() || !adminTelefone.trim()) {
          toast.error("Preencha ambos os campos (nome e telefone) do administrador.");
          return;
        }
        const adminPhoneDigits = adminTelefone.replace(/\D/g, "");
        if (adminPhoneDigits.length < 10) {
          toast.error("Telefone do administrador inválido.");
          return;
        }
      }
    }

    setSaving(true);
    try {
      const cleanNewPhone = adminTelefone.replace(/\D/g, "");

      const dataToSave = {
        nome: nome.trim(),
        convencao: convencao.trim() || null,
        ministerio: ministerio.trim() || null,
        dirigente: dirigente.trim() || null,
        telefone: telefone.replace(/\D/g, "") || null,
        email: email.trim().toLowerCase() || null,
        cnpj: cnpj.replace(/\D/g, "") || null,
        foto_url: fotoBase64 || null,
        cep: cep.replace(/\D/g, "") || null,
        logradouro: logradouro.trim() || null,
        numero: numero.trim() || null,
        complemento: complemento.trim() || null,
        bairro: bairro.trim() || null,
        cidade: cidade.trim() || null,
        estado: estado.trim() || null,
        ativa: true,
      };

      let targetId = igrejaId;

      if (unidadeId && parentIgrejaId) {
        const { error } = await supabase
          .from("unidades")
          .update({
            nome: nome.trim(),
            dirigente: dirigente.trim() || null,
            telefone: telefone.replace(/\D/g, "") || null,
            cep: cep.replace(/\D/g, "") || null,
            logradouro: logradouro.trim() || null,
            numero: numero.trim() || null,
            complemento: complemento.trim() || null,
            bairro: bairro.trim() || null,
            cidade: cidade.trim() || null,
            estado: estado.trim() || null,
            foto_url: fotoBase64 || null,
          })
          .eq("id", unidadeId);
        
        if (error) throw error;
      } else {
        if (igrejaId) {
          const { error } = await supabase
            .from("igrejas")
            .update(dataToSave)
            .eq("id", igrejaId);
          if (error) throw error;

          // Sincroniza o nome e detalhes com a unidade do tipo 'sede' correspondente
          await supabase
            .from("unidades")
            .update({
              nome: nome.trim(),
              dirigente: dirigente.trim() || null,
              telefone: telefone.replace(/\D/g, "") || null,
              cep: cep.replace(/\D/g, "") || null,
              logradouro: logradouro.trim() || null,
              numero: numero.trim() || null,
              complemento: complemento.trim() || null,
              bairro: bairro.trim() || null,
              cidade: cidade.trim() || null,
              estado: estado.trim() || null,
              foto_url: fotoBase64 || null,
            })
            .eq("igreja_id", igrejaId)
            .eq("tipo", "sede");
        } else {
          const { data: newIgreja, error } = await supabase
            .from("igrejas")
            .insert(dataToSave)
            .select()
            .single();
          if (error) throw error;
          targetId = newIgreja.id;

          // 1. Cria a unidade Sede para esta nova igreja
          const { data: newUnidade, error: uError } = await supabase
            .from("unidades")
            .insert({
              igreja_id: targetId,
              nome: "Sede - " + nome.trim(),
              tipo: "sede",
              dirigente: dirigente.trim() || null,
              telefone: telefone.replace(/\D/g, "") || null,
              cep: cep.replace(/\D/g, "") || null,
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
          if (uError) throw uError;

          // 2. Cria a Regional 1 correspondente
          const { data: newReg, error: regError } = await supabase
            .from("regionais_setores")
            .insert({
              igreja_id: targetId,
              tipo: "regional",
              numero: 1,
              nome: "Regional 1",
              hospedeira_id: newUnidade.id,
              dirigente: dirigente.trim() || null,
            })
            .select()
            .single();
          if (regError) throw regError;

          // Vincula a regional/setor de volta à Sede
          const { error: updError } = await supabase
            .from("unidades")
            .update({
              eh_hospedeira: true,
              regional_setor_id: newReg.id,
            })
            .eq("id", newUnidade.id);
          if (updError) throw updError;

          // 3. Cria o usuário administrador no Supabase Auth usando cliente temporário
          const tempSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
              auth: { persistSession: false }
            }
          );

          const { data: authData, error: authError } = await tempSupabase.auth.signUp({
            email: adminEmail.trim().toLowerCase(),
            password: adminSenha,
            options: {
              data: {
                nome: adminNome.trim()
              }
            }
          });

          if (authError) throw authError;
          const newAuthUser = authData.user;
          if (!newAuthUser) throw new Error("Erro ao criar credenciais de acesso");

          const { error: userError } = await supabase
            .from("usuarios")
            .insert({
              id: newAuthUser.id,
              nome: adminNome.trim(),
              telefone: adminTelefone.replace(/\D/g, ""),
              email: adminEmail.trim().toLowerCase(),
              nivel_acesso: "admin",
              igreja_id: targetId,
              unidade_id: newUnidade.id,
              ativo: true,
            });
          if (userError) throw userError;
        }
      }

      // Se for edição, atualiza os dados do administrador existente
      if (originalAdmin) {
        const { error: updateAdminError } = await supabase
          .from("usuarios")
          .update({
            nome: adminNome.trim(),
            telefone: adminTelefone.replace(/\D/g, ""),
          })
          .eq("id", originalAdmin.id);
        
        if (updateAdminError) throw updateAdminError;
      }

      toast.success(igrejaId || unidadeId ? "Igreja atualizada com sucesso!" : "Igreja criada com sucesso!");
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Erro ao salvar igreja:", error);
      toast.error("Erro ao salvar os dados da igreja.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pt-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-2">
      {/* Logo da Igreja */}
      <Collapsible open={activeSection === "logo"} onOpenChange={(open) => setActiveSection(open ? "logo" : null)} className="w-full">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">Logo da Igreja</CardTitle>
                  <CardDescription>Envie o logotipo ou foto identificativa da igreja</CardDescription>
                  {activeSection !== "logo" && fotoBase64 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Imagem de logo cadastrada
                    </p>
                  )}
                </div>
                {activeSection === "logo" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="flex justify-center pt-2">
              <FotoUpload
                fotoUrl={fotoBase64 || undefined}
                nome={nome}
                onFotoChange={setFotoBase64}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Dados Principais */}
      <Collapsible open={activeSection === "dados"} onOpenChange={(open) => setActiveSection(open ? "dados" : null)} className="w-full">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">Dados Principais</CardTitle>
                  <CardDescription>Informações básicas da igreja</CardDescription>
                  {activeSection !== "dados" && nome && (
                    <p className="text-xs text-muted-foreground">
                      Nome: <span className="font-semibold text-primary">{nome}</span>
                    </p>
                  )}
                </div>
                {activeSection === "dados" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
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
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Contato */}
      <Collapsible open={activeSection === "contato"} onOpenChange={(open) => setActiveSection(open ? "contato" : null)} className="w-full">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">Contato</CardTitle>
                  <CardDescription>Informações de contato da igreja</CardDescription>
                  {activeSection !== "contato" && (telefone || email) && (
                    <p className="text-xs text-muted-foreground">
                      {telefone && <span>Telefone: <span className="font-semibold text-primary">{telefone}</span></span>}
                      {telefone && email && <span className="mx-2">|</span>}
                      {email && <span>Email: <span className="font-semibold text-primary">{email}</span></span>}
                    </p>
                  )}
                </div>
                {activeSection === "contato" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
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
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Endereço */}
      <Collapsible open={activeSection === "endereco"} onOpenChange={(open) => setActiveSection(open ? "endereco" : null)} className="w-full">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">Endereço</CardTitle>
                  <CardDescription>Localização da igreja</CardDescription>
                  {activeSection !== "endereco" && logradouro && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-primary">{logradouro}</span>, {numero || "s/n"} - {bairro || "N/A"}, {cidade || "N/A"}/{estado || "N/A"}
                    </p>
                  )}
                </div>
                {activeSection === "endereco" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
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
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Administrador do Sistema */}
      <Collapsible open={activeSection === "admin"} onOpenChange={(open) => setActiveSection(open ? "admin" : null)} className="w-full">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">Administrador do Sistema</CardTitle>
                  <CardDescription>Dados do usuário administrativo da igreja</CardDescription>
                  {activeSection !== "admin" && adminNome && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Admin: <span className="font-semibold text-primary">{adminNome}</span> ({adminTelefone})
                    </p>
                  )}
                </div>
                {activeSection === "admin" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adminNome">Nome do Administrador *</Label>
                  <Input
                    id="adminNome"
                    value={adminNome}
                    onChange={(e) => setAdminNome(e.target.value)}
                    placeholder="Nome do administrador"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminTelefone">Telefone (WhatsApp) *</Label>
                  <Input
                    id="adminTelefone"
                    value={adminTelefone}
                    onChange={(e) => setAdminTelefone(formatTelefone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
              </div>

              {!(igrejaId || unidadeId) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">E-mail de Acesso *</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@igreja.com"
                      required
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="adminSenha">Senha *</Label>
                      <Input
                        id="adminSenha"
                        type="password"
                        value={adminSenha}
                        onChange={(e) => setAdminSenha(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminConfirmaSenha">Confirmar Senha *</Label>
                      <Input
                        id="adminConfirmaSenha"
                        type="password"
                        value={adminConfirmaSenha}
                        onChange={(e) => setAdminConfirmaSenha(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Ações */}
      <div className="flex gap-4 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
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
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
