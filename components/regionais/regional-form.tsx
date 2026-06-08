"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { RegionalSetor, Unidade, TIPOS_UNIDADE } from "@/lib/types";
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
import { ShieldAlert, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { carregarTodasUnidades } from "@/lib/supabase-db";

interface RegionalFormProps {
  regionalId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RegionalForm({ regionalId, onSuccess, onCancel }: RegionalFormProps) {
  const { igrejaId, nivelAcesso } = useAuth();
  const [loadingData, setLoadingData] = useState(!!regionalId);
  const [saving, setSaving] = useState(false);
  
  const [tipo, setTipo] = useState<"regional" | "setor">("regional");
  const [numero, setNumero] = useState<number>(1);
  const [dirigente, setDirigente] = useState("");
  const [hospedeiraId, setHospedeiraId] = useState("");
  const [igrejasMembrosIds, setIgrejasMembrosIds] = useState<string[]>([]);
  
  const [todasIgrejas, setTodasIgrejas] = useState<Unidade[]>([]);
  const [originalHospedeiraId, setOriginalHospedeiraId] = useState<string | null>(null);
  const [originalMembrosIds, setOriginalMembrosIds] = useState<string[]>([]);

  const canManage = nivelAcesso === "full" || nivelAcesso === "admin";

  const handleHospedeiraChange = (id: string) => {
    setHospedeiraId(id);
    const church = todasIgrejas.find(ig => ig.id === id);
    if (church && church.dirigente) {
      setDirigente(church.dirigente);
    }
  };

  // Carrega todas as igrejas/unidades
  useEffect(() => {
    if (!igrejaId) return;

    const loadIgrejas = async () => {
      try {
        const list = await carregarTodasUnidades(igrejaId);
        setTodasIgrejas(list);
      } catch (error) {
        console.error("Erro ao carregar igrejas:", error);
      }
    };

    loadIgrejas();
  }, [igrejaId]);

  // Carrega os dados da Regional/Setor se for edição
  useEffect(() => {
    if (!igrejaId || !regionalId) {
      setLoadingData(false);
      return;
    }

    const loadRegional = async () => {
      try {
        const { data, error } = await supabase
          .from("regionais_setores")
          .select("*")
          .eq("id", regionalId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setTipo(data.tipo || "regional");
          setNumero(data.numero || 1);
          setDirigente(data.dirigente || "");
          setHospedeiraId(data.hospedeira_id || "");
          setOriginalHospedeiraId(data.hospedeira_id || null);
          
          // Buscar unidades associadas a esta regional/setor
          const { data: membrosData, error: membErr } = await supabase
            .from("unidades")
            .select("id")
            .eq("regional_setor_id", regionalId)
            .eq("eh_hospedeira", false);
          
          const membros = (!membErr && membrosData) ? membrosData.map(m => m.id) : [];
          setIgrejasMembrosIds(membros);
          setOriginalMembrosIds(membros);
        } else {
          toast.error("Registro não encontrado");
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar dados");
      } finally {
        setLoadingData(false);
      }
    };

    loadRegional();
  }, [igrejaId, regionalId]);

  const handleToggleMembro = (id: string) => {
    setIgrejasMembrosIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!igrejaId || !canManage) {
      toast.error("Sem permissão para salvar.");
      return;
    }

    if (!hospedeiraId) {
      toast.error("Selecione a igreja hospedeira.");
      return;
    }

    setSaving(true);
    const labelTipo = tipo === "regional" ? "Regional" : "Setor";
    const nome = `${labelTipo} ${numero}`;

    try {
      let targetId = regionalId || "";

      if (!regionalId) {
        // Criar Novo
        const { data: newReg, error } = await supabase
          .from("regionais_setores")
          .insert({
            igreja_id: igrejaId,
            tipo,
            numero,
            nome,
            hospedeira_id: hospedeiraId,
            dirigente: dirigente.trim() || null,
          })
          .select()
          .single();
        if (error) throw error;
        targetId = newReg.id;
      } else {
        // Editar Existente
        const { error } = await supabase
          .from("regionais_setores")
          .update({
            tipo,
            numero,
            nome,
            hospedeira_id: hospedeiraId,
            dirigente: dirigente.trim() || null,
          })
          .eq("id", regionalId);
        if (error) throw error;
      }

      // Atualizar a igreja hospedeira
      const { error: newHospErr } = await supabase
        .from("unidades")
        .update({
          eh_hospedeira: true,
          regional_setor_id: targetId,
        })
        .eq("id", hospedeiraId);
      if (newHospErr) throw newHospErr;

      // Se a hospedeira mudou, remove o vínculo da anterior
      if (originalHospedeiraId && originalHospedeiraId !== hospedeiraId) {
        const { error: oldHospErr } = await supabase
          .from("unidades")
          .update({
            eh_hospedeira: false,
            regional_setor_id: null,
          })
          .eq("id", originalHospedeiraId);
        if (oldHospErr) throw oldHospErr;
      }

      // Atualizar congregações pertencentes
      // Remove o vínculo das que saíram
      const removidas = originalMembrosIds.filter(id => !igrejasMembrosIds.includes(id) && id !== hospedeiraId);
      for (const id of removidas) {
        await supabase
          .from("unidades")
          .update({
            regional_setor_id: null,
          })
          .eq("id", id);
      }

      // Adiciona o vínculo nas novas congregações
      const adicionadas = igrejasMembrosIds.filter(id => !originalMembrosIds.includes(id) && id !== hospedeiraId);
      for (const id of adicionadas) {
        await supabase
          .from("unidades")
          .update({
            eh_hospedeira: false,
            regional_setor_id: targetId,
          })
          .eq("id", id);
      }

      toast.success(`${labelTipo} salva com sucesso!`);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar dados.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div className="space-y-6 pt-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Sede é sempre Regional 1
  const isSedeRegional1 = !!(regionalId && tipo === "regional" && numero === 1);

  // Filtra as igrejas que podem ser selecionadas como membros (não podem ser hospedeiras de outra regional)
  const igrejasDisponiveisComoMembros = todasIgrejas.filter(
    (ig) => ig.id !== hospedeiraId
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Dados da Regional ou Setor
          </CardTitle>
          <CardDescription>Configure as definições e a sede hospedeira</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select
                value={tipo}
                onValueChange={(v) => setTipo(v as "regional" | "setor")}
                disabled={isSedeRegional1}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regional">Regional</SelectItem>
                  <SelectItem value="setor">Setor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero">Número *</Label>
              <Input
                id="numero"
                type="number"
                min={1}
                value={numero}
                onChange={(e) => setNumero(parseInt(e.target.value) || 1)}
                disabled={isSedeRegional1}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dirigente">Dirigente Responsável</Label>
            <Input
              id="dirigente"
              value={dirigente}
              onChange={(e) => setDirigente(e.target.value)}
              placeholder="Nome do pastor regional/setorial"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hospedeira">Igreja Hospedeira (Sede) *</Label>
            <Select
              value={hospedeiraId}
              onValueChange={handleHospedeiraChange}
              disabled={isSedeRegional1}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a igreja hospedeira" />
              </SelectTrigger>
              <SelectContent>
                {todasIgrejas.map((igreja) => (
                  <SelectItem key={igreja.id} value={igreja.id}>
                    {igreja.nome} ({TIPOS_UNIDADE[igreja.tipo]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              A igreja onde a sede física da regional/setor está localizada.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Igrejas Pertencentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Congregações Pertencentes</CardTitle>
          <CardDescription>Selecione quais igrejas fazem parte deste grupo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 max-h-64 overflow-y-auto">
          {igrejasDisponiveisComoMembros.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhuma outra congregação cadastrada além da hospedeira.
            </p>
          ) : (
            igrejasDisponiveisComoMembros.map((ig) => {
              const isChecked = igrejasMembrosIds.includes(ig.id);
              return (
                <div key={ig.id} className="flex items-center space-x-2 p-2 hover:bg-muted/40 rounded-lg">
                  <Checkbox
                    id={`igreja-${ig.id}`}
                    checked={isChecked}
                    onCheckedChange={() => handleToggleMembro(ig.id)}
                  />
                  <Label htmlFor={`igreja-${ig.id}`} className="text-sm font-medium leading-none cursor-pointer flex-1">
                    {ig.nome} <span className="text-xs text-muted-foreground">({TIPOS_UNIDADE[ig.tipo]})</span>
                  </Label>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-2">
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
              {regionalId ? "Salvar Alterações" : "Criar Regional/Setor"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
