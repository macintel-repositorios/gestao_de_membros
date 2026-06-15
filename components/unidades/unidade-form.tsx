"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { Building2, Loader2, Trash2, ChevronDown, ChevronUp, Search } from "lucide-react";
import { toast } from "sonner";
import { FotoUpload } from "@/components/membros/foto-upload";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Unidade,
  TipoUnidade,
  TIPOS_UNIDADE,
  RegionalSetor,
} from "@/lib/types";

interface UnidadeFormProps {
  unidadeId?: string;
  defaultTipo?: TipoUnidade;
  defaultUnidadePaiId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function UnidadeForm({ unidadeId, defaultTipo, defaultUnidadePaiId, onSuccess, onCancel }: UnidadeFormProps) {
  const { usuario, igrejaId, nivelAcesso } = useAuth();
  const [loadingUnidade, setLoadingUnidade] = useState(!!unidadeId);
  const [saving, setSaving] = useState(false);
  const [unidadesExistentes, setUnidadesExistentes] = useState<Unidade[]>([]);
  
  const [formData, setFormData] = useState({
    nome: "",
    tipo: (defaultTipo || "") as TipoUnidade | "",
    unidadePaiId: defaultUnidadePaiId || "",
    dirigente: "",
    telefone: "",
    endereco: {
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      cep: "",
    },
  });
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);

  const [ehHospedeira, setEhHospedeira] = useState(false);
  const [hospedaRegionalId, setHospedaRegionalId] = useState<string | null>(null);
  const [regionalSetorId, setRegionalSetorId] = useState<string | null>(null);
  const [regTipo, setRegTipo] = useState<"regional" | "setor">("regional");
  const [regNumero, setRegNumero] = useState<number>(1);
  const [regionaisSetores, setRegionaisSetores] = useState<RegionalSetor[]>([]);

  const [adminNome, setAdminNome] = useState("");
  const [adminTelefone, setAdminTelefone] = useState("");
  const [originalAdmin, setOriginalAdmin] = useState<{ id: string; nome: string; telefone: string, igrejaId?: string, unidadeId?: string, ativo?: boolean, dataCriacao?: any, criadoPor?: string | null } | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const formatTelefone = (value: string) => {
    const numeros = value.replace(/\D/g, "");
    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 6) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    if (numeros.length <= 10) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
  };

  const [buscandoCep, setBuscandoCep] = useState(false);

  const formatCep = (value: string) => {
    const numeros = value.replace(/\D/g, "");
    if (numeros.length <= 5) return numeros;
    return `${numeros.slice(0, 5)}-${numeros.slice(5, 8)}`;
  };

  const buscarCep = async () => {
    const cep = formData.endereco.cep;
    if (cep.length < 8) return;

    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: {
            ...prev.endereco,
            logradouro: data.logradouro || "",
            bairro: data.bairro || "",
            cidade: data.localidade || "",
            estado: data.uf || "",
          }
        }));
        toast.success("Endereço encontrado!");
      } else {
        toast.error("CEP não encontrado");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast.error("Erro ao buscar CEP");
    } finally {
      setBuscandoCep(false);
    }
  };

  const canManage = nivelAcesso === "full" || nivelAcesso === "admin";

  // Force Sede to always default to Regional 1
  useEffect(() => {
    if (formData.tipo === "sede") {
      setEhHospedeira(true);
      setRegTipo("regional");
      setRegNumero(1);
    }
  }, [formData.tipo]);

  // Carrega todas as regionais_setores
  useEffect(() => {
    if (!igrejaId) return;

    const carregarRegionais = async () => {
      const { data, error } = await supabase
        .from("regionais_setores")
        .select("*")
        .eq("igreja_id", igrejaId);
      if (!error && data) {
        setRegionaisSetores(data.map(r => ({
          id: r.id,
          tipo: r.tipo,
          numero: r.numero,
          nome: r.nome,
          hospedeiraId: r.hospedeira_id,
        })) as any);
      }
    };

    carregarRegionais();
  }, [igrejaId]);

  // Carrega a unidade atual se for edição
  useEffect(() => {
    if (!igrejaId || !unidadeId) {
      setLoadingUnidade(false);
      return;
    }

    const loadUnidade = async () => {
      try {
        const { data, error } = await supabase
          .from("unidades")
          .select("*")
          .eq("id", unidadeId)
          .single();

        if (error) throw error;
        
        if (data) {
          setFormData({
            nome: data.nome || "",
            tipo: data.tipo || "",
            unidadePaiId: data.unidade_pai_id || "",
            dirigente: data.dirigente || "",
            telefone: data.telefone || "",
            endereco: {
              logradouro: data.logradouro || "",
              numero: data.numero || "",
              complemento: data.complemento || "",
              bairro: data.bairro || "",
              cidade: data.cidade || "",
              estado: data.estado || "",
              cep: data.cep || "",
            },
          });
          setFotoBase64(data.foto_url || null);
          const isHosp = data.eh_hospedeira || false;
          setEhHospedeira(isHosp);
          setHospedaRegionalId(data.regional_setor_id || null);
          setRegionalSetorId(data.regional_setor_id || null);

          if (isHosp && data.regional_setor_id) {
            const { data: regData, error: regErr } = await supabase
              .from("regionais_setores")
              .select("*")
              .eq("id", data.regional_setor_id)
              .single();
            if (!regErr && regData) {
              setRegTipo(regData.tipo || "regional");
              setRegNumero(regData.numero || 1);
            }
          }

          // Carregar o administrador
          try {
            const { data: adminData, error: adminErr } = await supabase
              .from("usuarios")
              .select("*")
              .eq("unidade_id", unidadeId)
              .eq("nivel_acesso", "admin")
              .limit(1)
              .maybeSingle();

            if (!adminErr && adminData) {
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
        console.error("Erro ao carregar unidade:", error);
        toast.error("Erro ao carregar unidade");
      } finally {
        setLoadingUnidade(false);
      }
    };

    loadUnidade();
  }, [igrejaId, unidadeId]);

  // Carrega todas as unidades para seleção de unidade pai
  useEffect(() => {
    if (!igrejaId) return;

    const carregarUnidades = async () => {
      const { data, error } = await supabase
        .from("unidades")
        .select("*")
        .eq("igreja_id", igrejaId)
        .order("nome", { ascending: true });
      if (!error && data) {
        setUnidadesExistentes(data.filter(u => u.id !== unidadeId).map(u => ({
          id: u.id,
          nome: u.nome,
          tipo: u.tipo,
        })) as any);
      }
    };

    carregarUnidades();
  }, [igrejaId, unidadeId]);

  const tiposDisponiveis = (): TipoUnidade[] => {
    const hasSede = unidadesExistentes.some(u => u.tipo === "sede");
    if (unidadeId) {
      return ["sede", "congregacao", "subcongregacao", "ponto_evangelistico"];
    }
    if (!hasSede) {
      return ["sede"];
    }
    return ["congregacao", "subcongregacao", "ponto_evangelistico"];
  };

  const unidadesPai = (): Unidade[] => {
    if (!formData.tipo) return [];
    if (formData.tipo === "sede") return [];
    if (formData.tipo === "congregacao") {
      return unidadesExistentes.filter(u => u.tipo === "sede");
    }
    if (formData.tipo === "subcongregacao") {
      return unidadesExistentes.filter(u => u.tipo === "sede" || u.tipo === "congregacao");
    }
    if (formData.tipo === "ponto_evangelistico") {
      return unidadesExistentes.filter(u => u.tipo === "sede" || u.tipo === "congregacao" || u.tipo === "subcongregacao");
    }
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!igrejaId || !canManage) {
      toast.error("Sem permissão para gerenciar unidades");
      return;
    }

    if (!formData.nome || !formData.tipo) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    if ((formData.tipo === "congregacao" || formData.tipo === "subcongregacao" || formData.tipo === "ponto_evangelistico") && !formData.unidadePaiId) {
      toast.error("Selecione a unidade pai");
      return;
    }

    if (unidadeId && originalAdmin && (!adminNome.trim() || !adminTelefone.trim())) {
      toast.error("O nome e telefone do administrador são obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      let finalUnidadeId = unidadeId || "";

      const payload = {
        nome: formData.nome,
        tipo: formData.tipo,
        unidade_pai_id: formData.unidadePaiId || null,
        dirigente: formData.dirigente || null,
        telefone: formData.telefone || null,
        cep: formData.endereco.cep || null,
        logradouro: formData.endereco.logradouro || null,
        numero: formData.endereco.numero || null,
        complemento: formData.endereco.complemento || null,
        bairro: formData.endereco.bairro || null,
        cidade: formData.endereco.cidade || null,
        estado: formData.endereco.estado || null,
        foto_url: fotoBase64 || null,
      };

      if (unidadeId) {
        const { error } = await supabase
          .from("unidades")
          .update(payload)
          .eq("id", unidadeId);
        if (error) throw error;

        // Se for do tipo sede, sincroniza com a tabela de igrejas (tenant)
        if (formData.tipo === "sede") {
          await supabase
            .from("igrejas")
            .update({
              nome: formData.nome,
              dirigente: formData.dirigente || null,
              telefone: formData.telefone.replace(/\D/g, "") || null,
              cep: formData.endereco.cep.replace(/\D/g, "") || null,
              logradouro: formData.endereco.logradouro || null,
              numero: formData.endereco.numero || null,
              complemento: formData.endereco.complemento || null,
              bairro: formData.endereco.bairro || null,
              cidade: formData.endereco.cidade || null,
              estado: formData.endereco.estado || null,
              foto_url: fotoBase64 || null,
            })
            .eq("id", igrejaId);
        }
      } else {
        const { data: newUnit, error } = await supabase
          .from("unidades")
          .insert({
            ...payload,
            igreja_id: igrejaId,
            ativa: true,
          })
          .select()
          .single();
        if (error) throw error;
        finalUnidadeId = newUnit.id;
      }

      const labelTipo = regTipo === "regional" ? "Regional" : "Setor";
      const regNome = `${labelTipo} ${regNumero}`;

      if (ehHospedeira) {
        let currentRegId = hospedaRegionalId;
        
        if (currentRegId) {
          await supabase
            .from("regionais_setores")
            .update({
              tipo: regTipo,
              numero: regNumero,
              nome: regNome,
              hospedeira_id: finalUnidadeId,
              dirigente: formData.dirigente || null,
            })
            .eq("id", currentRegId);
        } else {
          const { data: newReg, error: regError } = await supabase
            .from("regionais_setores")
            .insert({
              igreja_id: igrejaId,
              tipo: regTipo,
              numero: regNumero,
              nome: regNome,
              hospedeira_id: finalUnidadeId,
              dirigente: formData.dirigente || null,
            })
            .select()
            .single();
          if (!regError && newReg) {
            currentRegId = newReg.id;
          }
        }

        await supabase
          .from("unidades")
          .update({
            eh_hospedeira: true,
            regional_setor_id: currentRegId,
          })
          .eq("id", finalUnidadeId);

      } else {
        if (hospedaRegionalId) {
          await supabase
            .from("regionais_setores")
            .delete()
            .eq("id", hospedaRegionalId);
        }

        await supabase
          .from("unidades")
          .update({
            eh_hospedeira: false,
            regional_setor_id: regionalSetorId || null,
          })
          .eq("id", finalUnidadeId);
      }

      // Se for edição, atualiza os dados do administrador
      if (originalAdmin) {
        await supabase
          .from("usuarios")
          .update({
            nome: adminNome.trim(),
            telefone: adminTelefone.replace(/\D/g, ""),
          })
          .eq("id", originalAdmin.id);
      }

      toast.success(unidadeId ? "Unidade atualizada com sucesso!" : "Unidade criada com sucesso!");
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Erro ao salvar unidade:", error);
      toast.error("Erro ao salvar unidade");
    } finally {
      setSaving(false);
    }
  };

  const handleDesativar = async () => {
    if (!igrejaId || !canManage || !unidadeId) return;

    try {
      const { error } = await supabase
        .from("unidades")
        .update({
          ativa: false,
        })
        .eq("id", unidadeId);

      if (error) throw error;
      toast.success("Unidade desativada com sucesso!");
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Erro ao desativar unidade:", error);
      toast.error("Erro ao desativar unidade");
    }
  };

  if (loadingUnidade) {
    return (
      <div className="space-y-6 pt-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-2">
      {/* Logo / Imagem da Igreja */}
      <Collapsible open={activeSection === "logo"} onOpenChange={(open) => setActiveSection(open ? "logo" : null)} className="w-full">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">Imagem da Igreja</CardTitle>
                  <CardDescription>Envie o logotipo ou foto identificativa desta igreja</CardDescription>
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
                nome={formData.nome}
                onFotoChange={setFotoBase64}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {unidadeId && canManage && (
        <div className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" type="button">
                <Trash2 className="mr-2 h-4 w-4" />
                Desativar Igreja
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desativar igreja?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá desativar esta congregação/subcongregação. Os membros vinculados precisarão ser transferidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDesativar}>
                  Desativar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Dados da Igreja */}
      <Collapsible open={activeSection === "dados"} onOpenChange={(open) => setActiveSection(open ? "dados" : null)} className="w-full">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Dados da Igreja
                  </CardTitle>
                  <CardDescription>Informações básicas da igreja</CardDescription>
                  {activeSection !== "dados" && formData.nome && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Nome: <span className="font-semibold text-primary">{formData.nome}</span>
                    </p>
                  )}
                </div>
                {activeSection === "dados" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Igreja *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Igreja Central"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(v) => setFormData({ ...formData, tipo: v as TipoUnidade, unidadePaiId: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposDisponiveis().map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {TIPOS_UNIDADE[tipo]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Unidade Pai */}
              {formData.tipo && formData.tipo !== "sede" && (
                <div className="space-y-2">
                  <Label htmlFor="unidadePai">
                    Igreja Superior *
                  </Label>
                  <Select
                    value={formData.unidadePaiId}
                    onValueChange={(v) => setFormData({ ...formData, unidadePaiId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a igreja superior" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidadesPai().map((unidade) => (
                        <SelectItem key={unidade.id} value={unidade.id}>
                          {unidade.nome} ({TIPOS_UNIDADE[unidade.tipo]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dirigente">Dirigente</Label>
                  <Input
                    id="dirigente"
                    value={formData.dirigente}
                    onChange={(e) => setFormData({ ...formData, dirigente: e.target.value })}
                    placeholder="Nome do pastor/lider responsável"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Configuração de Regional / Setor */}
      <Collapsible open={activeSection === "vinculo"} onOpenChange={(open) => setActiveSection(open ? "vinculo" : null)} className="w-full">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Vínculo Regional / Setor
                  </CardTitle>
                  <CardDescription>Defina se esta igreja hospeda ou pertence a uma Regional ou Setor.</CardDescription>
                  {activeSection !== "vinculo" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {ehHospedeira ? `Hospedeira de ${regTipo === "regional" ? "Regional" : "Setor"} ${regNumero}` : "Pertence a uma Regional/Setor"}
                    </p>
                  )}
                </div>
                {activeSection === "vinculo" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-2">
              <div className="flex items-center space-x-2 p-2 hover:bg-muted/40 rounded-lg">
                <Checkbox
                  id="ehHospedeira"
                  checked={ehHospedeira}
                  onCheckedChange={(checked) => setEhHospedeira(!!checked)}
                  disabled={formData.tipo === "sede"}
                />
                <Label htmlFor="ehHospedeira" className="text-sm font-medium leading-none cursor-pointer flex-1">
                  Esta igreja é Hospedeira de uma Regional/Setor?
                  {formData.tipo === "sede" && (
                    <span className="text-xs text-muted-foreground block mt-1">
                      A sede é obrigatoriamente a Hospedeira da Regional 1.
                    </span>
                  )}
                </Label>
              </div>

              {ehHospedeira ? (
                <div className="grid gap-4 sm:grid-cols-2 p-4 bg-muted/20 rounded-lg border border-border">
                  <div className="space-y-2">
                    <Label htmlFor="regTipo">Tipo da Hospedada *</Label>
                    <Select
                      value={regTipo}
                      onValueChange={(v) => setRegTipo(v as "regional" | "setor")}
                      disabled={formData.tipo === "sede"}
                    >
                      <SelectTrigger id="regTipo">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regional">Regional</SelectItem>
                        <SelectItem value="setor">Setor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regNumero">Número *</Label>
                    <Input
                      id="regNumero"
                      type="number"
                      min={1}
                      value={regNumero}
                      onChange={(e) => setRegNumero(parseInt(e.target.value) || 1)}
                      disabled={formData.tipo === "sede"}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 p-4 bg-muted/20 rounded-lg border border-border">
                  <Label htmlFor="regionalPertence">Pertence a qual Regional / Setor?</Label>
                  <Select
                    value={regionalSetorId || "nenhum"}
                    onValueChange={(v) => setRegionalSetorId(v === "nenhum" ? null : v)}
                  >
                    <SelectTrigger id="regionalPertence">
                      <SelectValue placeholder="Selecione a regional/setor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhum">Nenhuma (Não associada)</SelectItem>
                      {regionaisSetores.map((reg) => (
                        <SelectItem key={reg.id} value={reg.id}>
                          {reg.nome} (Hospedeira: {unidadesExistentes.find(u => u.id === reg.hospedeiraId)?.nome || "Carregando..."})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                  <CardDescription>
                    Localização da igreja (opcional)
                  </CardDescription>
                  {activeSection !== "endereco" && formData.endereco.logradouro && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-primary">{formData.endereco.logradouro}</span>, {formData.endereco.numero || "s/n"} - {formData.endereco.bairro || "N/A"}, {formData.endereco.cidade || "N/A"}/{formData.endereco.estado || "N/A"}
                    </p>
                  )}
                </div>
                {activeSection === "endereco" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-2">
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={formData.endereco.cep}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        endereco: { ...formData.endereco,  cep: formatCep(e.target.value) },
                      })
                    }
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-8"
                  onClick={buscarCep}
                  disabled={buscandoCep || formData.endereco.cep.length < 9}
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
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="logradouro">Logradouro</Label>
                  <Input
                    id="logradouro"
                    value={formData.endereco.logradouro}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        endereco: { ...formData.endereco, logradouro: e.target.value },
                      })
                    }
                    placeholder="Rua, Avenida, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={formData.endereco.numero}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        endereco: { ...formData.endereco, numero: e.target.value },
                      })
                    }
                    placeholder="123"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={formData.endereco.complemento}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        endereco: { ...formData.endereco, complemento: e.target.value },
                      })
                    }
                    placeholder="Apto, Bloco, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={formData.endereco.bairro}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        endereco: { ...formData.endereco, bairro: e.target.value },
                      })
                    }
                    placeholder="Centro"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.endereco.cidade}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        endereco: { ...formData.endereco,  cidade: e.target.value },
                      })
                    }
                    placeholder="São Paulo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={formData.endereco.estado}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        endereco: { ...formData.endereco,  estado: e.target.value.toUpperCase() },
                      })
                    }
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Administrador do Sistema */}
      {unidadeId && originalAdmin && (
        <Collapsible open={activeSection === "admin"} onOpenChange={(open) => setActiveSection(open ? "admin" : null)} className="w-full">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      Administrador do Sistema
                    </CardTitle>
                    <CardDescription>Cadastre ou atualize as informações de acesso para o administrador desta igreja</CardDescription>
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
              <CardContent className="space-y-4 pt-2">
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
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {unidadeId ? "Salvar Alterações" : "Salvar Igreja"}
        </Button>
      </div>
    </form>
  );
}
