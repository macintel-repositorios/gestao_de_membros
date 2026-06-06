"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, addDoc, Timestamp, collection, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getUnidadesCollection } from "@/lib/firestore";
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

interface RegionalFormProps {
  regionalId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RegionalForm({ regionalId, onSuccess, onCancel }: RegionalFormProps) {
  const { igrejaId, nivelAcesso } = useAuth();
  const [loading, setLoading] = useState(false);
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

  // Carrega todas as igrejas/unidades
  useEffect(() => {
    if (!igrejaId) return;

    const loadIgrejas = async () => {
      try {
        const unidadesRef = getUnidadesCollection(igrejaId);
        const snapshot = await getDocs(unidadesRef);
        const list: Unidade[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Unidade);
        });
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
        const docRef = doc(db!, "igrejas", igrejaId, "regionais_setores", regionalId);
        const snapshot = await getDoc(docRef);
        
        if (snapshot.exists()) {
          const data = snapshot.data() as RegionalSetor;
          setTipo(data.tipo || "regional");
          setNumero(data.numero || 1);
          setDirigente(data.dirigente || "");
          setHospedeiraId(data.hospedeiraId || "");
          setOriginalHospedeiraId(data.hospedeiraId || null);
          
          const membros = data.igrejasMembrosIds || [];
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
    const batch = writeBatch(db!);
    const labelTipo = tipo === "regional" ? "Regional" : "Setor";
    const nome = `${labelTipo} ${numero}`;

    try {
      let targetId = regionalId;

      if (!regionalId) {
        // Criar Novo
        const regionaisRef = collection(db!, "igrejas", igrejaId, "regionais_setores");
        const docRef = await addDoc(regionaisRef, {
          tipo,
          numero,
          nome,
          hospedeiraId,
          dirigente: dirigente.trim() || null,
          igrejasMembrosIds,
          dataCriacao: Timestamp.now(),
        });
        targetId = docRef.id;
      } else {
        // Editar Existente
        const docRef = doc(db!, "igrejas", igrejaId, "regionais_setores", regionalId);
        await updateDoc(docRef, {
          tipo,
          numero,
          nome,
          hospedeiraId,
          dirigente: dirigente.trim() || null,
          igrejasMembrosIds,
        });
      }

      // Atualizar a igreja hospedeira
      const newHospRef = doc(db!, "igrejas", igrejaId, "unidades", hospedeiraId);
      batch.update(newHospRef, {
        ehHospedeira: true,
        hospedaRegionalId: targetId,
        regionalSetorId: targetId,
      });

      // Se a hospedeira mudou, remove o vínculo da anterior
      if (originalHospedeiraId && originalHospedeiraId !== hospedeiraId) {
        const oldHospRef = doc(db!, "igrejas", igrejaId, "unidades", originalHospedeiraId);
        batch.update(oldHospRef, {
          ehHospedeira: false,
          hospedaRegionalId: null,
          regionalSetorId: null,
        });
      }

      // Atualizar congregações pertencentes
      // Remove o vínculo das que saíram
      const removidas = originalMembrosIds.filter(id => !igrejasMembrosIds.includes(id) && id !== hospedeiraId);
      removidas.forEach((id) => {
        const uRef = doc(db!, "igrejas", igrejaId, "unidades", id);
        batch.update(uRef, {
          regionalSetorId: null,
        });
      });

      // Adiciona o vínculo nas novas congregações
      const adicionadas = igrejasMembrosIds.filter(id => !originalMembrosIds.includes(id) && id !== hospedeiraId);
      adicionadas.forEach((id) => {
        const uRef = doc(db!, "igrejas", igrejaId, "unidades", id);
        batch.update(uRef, {
          ehHospedeira: false, // garante que não é tratada como hospedeira de outra
          hospedaRegionalId: null,
          regionalSetorId: targetId,
        });
      });

      // Commit do batch
      await batch.commit();

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
  const isSedeRegional1 = regionalId && tipo === "regional" && numero === 1;

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
              onValueChange={setHospedeiraId}
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
