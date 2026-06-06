"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, addDoc, Timestamp, query, onSnapshot, orderBy, collection, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getUnidadesCollection } from "@/lib/firestore";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { Building2, Loader2, Trash2 } from "lucide-react";
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
  const { igrejaId, nivelAcesso } = useAuth();
  const [loading, setLoading] = useState(false);
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

    const regionaisRef = collection(db!, "igrejas", igrejaId, "regionais_setores");
    const unsubscribe = onSnapshot(regionaisRef, (snapshot) => {
      const data: RegionalSetor[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as RegionalSetor);
      });
      setRegionaisSetores(data);
    });

    return () => unsubscribe();
  }, [igrejaId]);

  // Carrega a unidade atual se for edição
  useEffect(() => {
    if (!igrejaId || !unidadeId) {
      setLoadingUnidade(false);
      return;
    }

    const loadUnidade = async () => {
      try {
        const unidadeRef = doc(db!, "igrejas", igrejaId, "unidades", unidadeId);
        const unidadeDoc = await getDoc(unidadeRef);
        
        if (unidadeDoc.exists()) {
          const data = unidadeDoc.data();
          setFormData({
            nome: data.nome || "",
            tipo: data.tipo || "",
            unidadePaiId: data.unidadePaiId || "",
            dirigente: data.dirigente || "",
            telefone: data.telefone || "",
            endereco: data.endereco || {
              logradouro: "",
              numero: "",
              complemento: "",
              bairro: "",
              cidade: "",
              estado: "",
              cep: "",
            },
          });
          setFotoBase64(data.fotoUrl || null);
          const isHosp = data.ehHospedeira || false;
          setEhHospedeira(isHosp);
          setHospedaRegionalId(data.hospedaRegionalId || null);
          setRegionalSetorId(data.regionalSetorId || null);

          if (isHosp && data.hospedaRegionalId) {
            const regRef = doc(db!, "igrejas", igrejaId, "regionais_setores", data.hospedaRegionalId);
            const regDoc = await getDoc(regRef);
            if (regDoc.exists()) {
              const regData = regDoc.data();
              setRegTipo(regData.tipo || "regional");
              setRegNumero(regData.numero || 1);
            }
          }
        } else {
          toast.error("Unidade não encontrada");
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

    const unidadesRef = getUnidadesCollection(igrejaId);
    const q = query(unidadesRef, orderBy("nome", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Unidade[] = [];
      snapshot.forEach((docSnap) => {
        if (docSnap.id !== unidadeId) {
          data.push({ id: docSnap.id, ...docSnap.data() } as Unidade);
        }
      });
      setUnidadesExistentes(data);
    });

    return () => unsubscribe();
  }, [igrejaId, unidadeId]);

  // Determina quais tipos podem ser criados baseado nas unidades existentes
  const tiposDisponiveis = (): TipoUnidade[] => {
    const hasSede = unidadesExistentes.some(u => u.tipo === "sede");
    
    // Se for edição, permite manter o tipo atual ou mudar para os tipos normais
    if (unidadeId) {
      return ["sede", "congregacao", "subcongregacao"];
    }

    if (!hasSede) {
      return ["sede"];
    }
    
    return ["congregacao", "subcongregacao"];
  };

  // Filtra unidades pai baseado no tipo selecionado
  const unidadesPai = (): Unidade[] => {
    if (!formData.tipo) return [];
    
    if (formData.tipo === "sede") {
      return [];
    }
    
    if (formData.tipo === "congregacao") {
      return unidadesExistentes.filter(u => u.tipo === "sede");
    }
    
    if (formData.tipo === "subcongregacao") {
      return unidadesExistentes.filter(u => u.tipo === "sede" || u.tipo === "congregacao");
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

    if ((formData.tipo === "congregacao" || formData.tipo === "subcongregacao") && !formData.unidadePaiId) {
      toast.error("Selecione a unidade pai");
      return;
    }

    setSaving(true);

    try {
      let finalUnidadeId = unidadeId;

      if (unidadeId) {
        const unidadeRef = doc(db!, "igrejas", igrejaId, "unidades", unidadeId);
        await updateDoc(unidadeRef, {
          nome: formData.nome,
          tipo: formData.tipo,
          unidadePaiId: formData.unidadePaiId || null,
          dirigente: formData.dirigente || null,
          telefone: formData.telefone || null,
          endereco: formData.endereco.logradouro ? formData.endereco : null,
          fotoUrl: fotoBase64 || null,
          dataAtualizacao: Timestamp.now(),
        });
      } else {
        const docRef = await addDoc(getUnidadesCollection(igrejaId), {
          nome: formData.nome,
          tipo: formData.tipo,
          unidadePaiId: formData.unidadePaiId || null,
          dirigente: formData.dirigente || null,
          telefone: formData.telefone || null,
          endereco: formData.endereco.logradouro ? formData.endereco : null,
          fotoUrl: fotoBase64 || null,
          ativa: true,
          dataCriacao: Timestamp.now(),
        });
        finalUnidadeId = docRef.id;
      }

      const labelTipo = regTipo === "regional" ? "Regional" : "Setor";
      const regNome = `${labelTipo} ${regNumero}`;

      if (ehHospedeira) {
        let currentRegId = hospedaRegionalId;
        
        if (currentRegId) {
          const regRef = doc(db!, "igrejas", igrejaId, "regionais_setores", currentRegId);
          await updateDoc(regRef, {
            tipo: regTipo,
            numero: regNumero,
            nome: regNome,
            hospedeiraId: finalUnidadeId,
            dirigente: formData.dirigente || null,
          });
        } else {
          const regCollectionRef = collection(db!, "igrejas", igrejaId, "regionais_setores");
          const regDocRef = await addDoc(regCollectionRef, {
            tipo: regTipo,
            numero: regNumero,
            nome: regNome,
            hospedeiraId: finalUnidadeId,
            dirigente: formData.dirigente || null,
            igrejasMembrosIds: [],
            dataCriacao: Timestamp.now(),
          });
          currentRegId = regDocRef.id;
        }

        const unidadeRef = doc(db!, "igrejas", igrejaId, "unidades", finalUnidadeId);
        await updateDoc(unidadeRef, {
          ehHospedeira: true,
          hospedaRegionalId: currentRegId,
          regionalSetorId: currentRegId,
        });

      } else {
        if (hospedaRegionalId) {
          const oldRegRef = doc(db!, "igrejas", igrejaId, "regionais_setores", hospedaRegionalId);
          await deleteDoc(oldRegRef);
        }

        const unidadeRef = doc(db!, "igrejas", igrejaId, "unidades", finalUnidadeId);
        await updateDoc(unidadeRef, {
          ehHospedeira: false,
          hospedaRegionalId: null,
          regionalSetorId: regionalSetorId || null,
        });
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
      const unidadeRef = doc(db!, "igrejas", igrejaId, "unidades", unidadeId);
      await updateDoc(unidadeRef, {
        ativa: false,
        dataDesativacao: Timestamp.now(),
      });

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
      {/* Logo da Unidade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logo / Imagem da Unidade</CardTitle>
          <CardDescription>Envie o logotipo ou foto identificativa desta unidade</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <FotoUpload
            fotoUrl={fotoBase64 || undefined}
            nome={formData.nome}
            onFotoChange={setFotoBase64}
          />
        </CardContent>
      </Card>

      {unidadeId && canManage && (
        <div className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" type="button">
                <Trash2 className="mr-2 h-4 w-4" />
                Desativar Unidade
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desativar unidade?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá desativar a unidade. Os membros vinculados a esta unidade
                  precisarão ser transferidos para outra unidade.
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

      {/* Dados Basicos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-primary" />
            Dados da Unidade
          </CardTitle>
          <CardDescription>
            Informações básicas da unidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Unidade *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Igreja Sede Central"
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
                Unidade Superior *
              </Label>
              <Select
                value={formData.unidadePaiId}
                onValueChange={(v) => setFormData({ ...formData, unidadePaiId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade superior" />
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
      </Card>

      {/* Configuração de Regional / Setor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Vínculo Regional / Setor
          </CardTitle>
          <CardDescription>
            Defina se esta unidade hospeda ou pertence a uma Regional ou Setor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
      </Card>

      {/* Endereco */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endereço</CardTitle>
          <CardDescription>
            Localização da unidade (opcional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={formData.endereco.cidade}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    endereco: { ...formData.endereco, cidade: e.target.value },
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
                    endereco: { ...formData.endereco, estado: e.target.value },
                  })
                }
                placeholder="SP"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                value={formData.endereco.cep}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    endereco: { ...formData.endereco, cep: e.target.value },
                  })
                }
                placeholder="00000-000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {unidadeId ? "Salvar Alterações" : "Criar Unidade"}
        </Button>
      </div>
    </form>
  );
}
