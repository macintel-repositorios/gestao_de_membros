"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, updateDoc, Timestamp, query, onSnapshot, orderBy } from "firebase/firestore";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { ArrowLeft, Building2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
} from "@/lib/types";

export default function EditarUnidadePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { igrejaId, nivelAcesso } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unidadesExistentes, setUnidadesExistentes] = useState<Unidade[]>([]);
  
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "" as TipoUnidade | "",
    unidadePaiId: "",
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

  const canEdit = nivelAcesso === "full" || nivelAcesso === "admin";

  // Carrega a unidade atual
  useEffect(() => {
    if (!igrejaId || !id) return;

    const loadUnidade = async () => {
      try {
        const unidadeRef = doc(db, "igrejas", igrejaId, "unidades", id);
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
        } else {
          toast.error("Unidade não encontrada");
          router.push("/unidades");
        }
      } catch (error) {
        console.error("Erro ao carregar unidade:", error);
        toast.error("Erro ao carregar unidade");
      } finally {
        setLoading(false);
      }
    };

    loadUnidade();
  }, [igrejaId, id, router]);

  // Carrega todas as unidades para seleção de unidade pai
  useEffect(() => {
    if (!igrejaId) return;

    const unidadesRef = getUnidadesCollection(igrejaId);
    const q = query(unidadesRef, orderBy("nome", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Unidade[] = [];
      snapshot.forEach((docSnap) => {
        // Não inclui a própria unidade na lista de possíveis pais
        if (docSnap.id !== id) {
          data.push({ id: docSnap.id, ...docSnap.data() } as Unidade);
        }
      });
      setUnidadesExistentes(data);
    });

    return () => unsubscribe();
  }, [igrejaId, id]);

  // Filtra unidades pai baseado no tipo selecionado
  const unidadesPai = (): Unidade[] => {
    if (!formData.tipo) return [];
    
    if (formData.tipo === "sede") {
      return []; // Sede não tem pai
    }
    
    if (formData.tipo === "congregacao") {
      // Congregação só pode ser filha de sede
      return unidadesExistentes.filter(u => u.tipo === "sede");
    }
    
    if (formData.tipo === "subcongregacao") {
      // Subcongregação pode ser filha de congregação ou sede
      return unidadesExistentes.filter(u => u.tipo === "sede" || u.tipo === "congregacao");
    }
    
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!igrejaId || !canEdit) {
      toast.error("Sem permissão para editar unidade");
      return;
    }

    if (!formData.nome || !formData.tipo) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    // Validação: tipos que precisam de unidade pai
    if ((formData.tipo === "congregacao" || formData.tipo === "subcongregacao") && !formData.unidadePaiId) {
      toast.error("Selecione a unidade pai");
      return;
    }

    setSaving(true);

    try {
      const unidadeRef = doc(db, "igrejas", igrejaId, "unidades", id);
      await updateDoc(unidadeRef, {
        nome: formData.nome,
        tipo: formData.tipo,
        unidadePaiId: formData.unidadePaiId || null,
        dirigente: formData.dirigente || null,
        telefone: formData.telefone || null,
        endereco: formData.endereco.logradouro ? formData.endereco : null,
        dataAtualizacao: Timestamp.now(),
      });

      toast.success("Unidade atualizada com sucesso!");
      router.push("/unidades");
    } catch (error) {
      console.error("Erro ao atualizar unidade:", error);
      toast.error("Erro ao atualizar unidade");
    } finally {
      setSaving(false);
    }
  };

  const handleDesativar = async () => {
    if (!igrejaId || !canEdit) return;

    try {
      const unidadeRef = doc(db, "igrejas", igrejaId, "unidades", id);
      await updateDoc(unidadeRef, {
        ativa: false,
        dataDesativacao: Timestamp.now(),
      });

      toast.success("Unidade desativada com sucesso!");
      router.push("/unidades");
    } catch (error) {
      console.error("Erro ao desativar unidade:", error);
      toast.error("Erro ao desativar unidade");
    }
  };

  if (!canEdit) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <p className="text-muted-foreground">Voce nao tem permissao para editar unidades.</p>
        <Button asChild className="mt-4">
          <Link href="/unidades">Voltar</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/unidades">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Editar Unidade</h1>
            <p className="text-muted-foreground">
              Atualize os dados da unidade
            </p>
          </div>
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Desativar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desativar unidade?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acao ira desativar a unidade. Os membros vinculados a esta unidade
                precisarao ser transferidos para outra unidade.
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Basicos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dados da Unidade
            </CardTitle>
            <CardDescription>
              Informacoes basicas da unidade
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
                    {(Object.keys(TIPOS_UNIDADE) as TipoUnidade[]).map((tipo) => (
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
                  placeholder="Nome do pastor/lider responsavel"
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

        {/* Endereco */}
        <Card>
          <CardHeader>
            <CardTitle>Endereco</CardTitle>
            <CardDescription>
              Localizacao da unidade (opcional)
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
                <Label htmlFor="numero">Numero</Label>
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
                  placeholder="Sao Paulo"
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
          <Button type="button" variant="outline" asChild>
            <Link href="/unidades">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alteracoes
          </Button>
        </div>
      </form>
    </div>
  );
}
