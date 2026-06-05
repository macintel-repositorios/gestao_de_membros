"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  query,
  getDocs,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { getMembrosCollection, getGruposCollection } from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { GoogleMap } from "@/components/mapa/google-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { toast } from "sonner";
import {
  Users,
  MapPin,
  MessageCircle,
  Copy,
  Check,
  ArrowLeft,
  Phone,
} from "lucide-react";
import Link from "next/link";
import {
  Membro,
  TipoMembro,
  TipoGrupo,
  TIPOS_MEMBRO,
  TIPOS_GRUPO,
} from "@/lib/types";

export default function NovoGrupoPage() {
  const router = useRouter();
  const { user, igrejaId, unidadeId, unidadesAcessiveis } = useAuth();

  const [membros, setMembros] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [nomeGrupo, setNomeGrupo] = useState("");
  const [tipoGrupo, setTipoGrupo] = useState<TipoGrupo>("estudo");
  const [liderSelecionado, setLiderSelecionado] = useState<string>("");
  const [raio, setRaio] = useState(2); // km
  const [membrosNoRaio, setMembrosNoRaio] = useState<Membro[]>([]);
  const [membrosSelecionados, setMembrosSelecionados] = useState<Set<string>>(
    new Set()
  );
  const [linkWhatsApp, setLinkWhatsApp] = useState("");
  const [copied, setCopied] = useState(false);

  // Load members from all accessible units
  useEffect(() => {
    if (!igrejaId || unidadesAcessiveis.length === 0) {
      setLoading(false);
      return;
    }

    const loadMembros = async () => {
      try {
        const membrosData: Membro[] = [];
        
        for (const uId of unidadesAcessiveis) {
          const membrosRef = getMembrosCollection(igrejaId, uId);
          const snapshot = await getDocs(query(membrosRef));
          snapshot.forEach((docSnap) => {
            membrosData.push({ id: docSnap.id, unidadeId: uId, ...docSnap.data() } as Membro);
          });
        }
        
        setMembros(membrosData);
      } catch (error) {
        console.error("Erro ao carregar membros:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMembros();
  }, [igrejaId, unidadesAcessiveis]);

  // Filter leaders/obreiros
  const lideres = membros.filter((m) =>
    ["obreiro", "lider"].includes(m.tipo)
  );

  // Handle members in radius callback
  const handleMembrosNoRaio = useCallback((membrosInRadius: Membro[]) => {
    setMembrosNoRaio(membrosInRadius);
    // Auto-select all members in radius
    setMembrosSelecionados(new Set(membrosInRadius.map((m) => m.id)));
  }, []);

  // Toggle member selection
  const toggleMembro = (id: string) => {
    const newSet = new Set(membrosSelecionados);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setMembrosSelecionados(newSet);
  };

  // Select/deselect all
  const toggleAll = () => {
    if (membrosSelecionados.size === membrosNoRaio.length) {
      setMembrosSelecionados(new Set());
    } else {
      setMembrosSelecionados(new Set(membrosNoRaio.map((m) => m.id)));
    }
  };

  // Generate WhatsApp group link
  const gerarLinkWhatsApp = () => {
    const selectedMembers = membrosNoRaio.filter((m) =>
      membrosSelecionados.has(m.id)
    );
    const lider = membros.find((m) => m.id === liderSelecionado);

    // Generate phone list for WhatsApp
    const phones = selectedMembers.map((m) => `55${m.telefone}`);
    if (lider) {
      phones.unshift(`55${lider.telefone}`);
    }

    // WhatsApp doesn't have a direct API to create groups
    // We generate a message with the info to help the user
    const message = encodeURIComponent(
      `Grupo: ${nomeGrupo}\nTipo: ${TIPOS_GRUPO[tipoGrupo]}\nLíder: ${lider?.nome || "N/A"}\n\nMembros (${selectedMembers.length}):\n${selectedMembers.map((m) => `- ${m.nome}: ${formatPhone(m.telefone)}`).join("\n")}`
    );

    setLinkWhatsApp(
      `https://wa.me/?text=${message}`
    );
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    const selectedMembers = membrosNoRaio.filter((m) =>
      membrosSelecionados.has(m.id)
    );
    const lider = membros.find((m) => m.id === liderSelecionado);

    const text = `Grupo: ${nomeGrupo}
Tipo: ${TIPOS_GRUPO[tipoGrupo]}
Líder: ${lider?.nome || "N/A"}

Membros (${selectedMembers.length}):
${selectedMembers.map((m) => `- ${m.nome}: ${formatPhone(m.telefone)}`).join("\n")}`;

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Lista copiada para a área de transferência!");
  };

  // Save group
  const salvarGrupo = async () => {
    if (!nomeGrupo.trim()) {
      toast.error("Digite o nome do grupo");
      return;
    }

    if (!liderSelecionado) {
      toast.error("Selecione um líder");
      return;
    }

    if (membrosSelecionados.size === 0) {
      toast.error("Selecione pelo menos um membro");
      return;
    }

    if (!igrejaId || !unidadeId) {
      toast.error("Erro: igreja ou unidade não identificada");
      return;
    }

    setSaving(true);
    try {
      await addDoc(getGruposCollection(igrejaId, unidadeId), {
        nome: nomeGrupo,
        tipo: tipoGrupo,
        liderUid: user?.uid,
        liderMembroId: liderSelecionado,
        membrosIds: Array.from(membrosSelecionados),
        raioKm: raio,
        linkWhatsApp: linkWhatsApp || null,
        dataCriacao: Timestamp.now(),
        ativo: true,
      });

      toast.success("Grupo criado com sucesso!");
      router.push("/grupos");
    } catch (error) {
      console.error("Erro ao salvar grupo:", error);
      toast.error("Erro ao criar grupo");
    } finally {
      setSaving(false);
    }
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/grupos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Criar Grupo</h1>
          <p className="text-muted-foreground">
            Selecione um líder e encontre membros próximos
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration */}
        <div className="space-y-6">
          {/* Group Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Grupo</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel>Nome do Grupo *</FieldLabel>
                  <Input
                    placeholder="Ex: Célula Centro, Grupo de Visitas Norte"
                    value={nomeGrupo}
                    onChange={(e) => setNomeGrupo(e.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel>Tipo de Grupo *</FieldLabel>
                  <Select
                    value={tipoGrupo}
                    onValueChange={(v) => setTipoGrupo(v as TipoGrupo)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TIPOS_GRUPO) as TipoGrupo[]).map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {TIPOS_GRUPO[tipo]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          {/* Leader Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Líder</CardTitle>
            </CardHeader>
            <CardContent>
              <Field>
                <FieldLabel>Líder/Obreiro *</FieldLabel>
                <FieldDescription>
                  O líder será o centro do raio de busca
                </FieldDescription>
                <Select
                  value={liderSelecionado}
                  onValueChange={setLiderSelecionado}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um líder ou obreiro" />
                  </SelectTrigger>
                  <SelectContent>
                    {lideres.map((lider) => (
                      <SelectItem key={lider.id} value={lider.id}>
                        <div className="flex items-center gap-2">
                          <span>{lider.nome}</span>
                          <Badge variant="outline" className="text-xs">
                            {TIPOS_MEMBRO[lider.tipo]}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </CardContent>
          </Card>

          {/* Radius */}
          {liderSelecionado && (
            <Card>
              <CardHeader>
                <CardTitle>Raio de Proximidade</CardTitle>
              </CardHeader>
              <CardContent>
                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel>Distância máxima</FieldLabel>
                    <span className="text-lg font-semibold text-primary">
                      {raio} km
                    </span>
                  </div>
                  <Slider
                    value={[raio]}
                    onValueChange={(v) => setRaio(v[0])}
                    min={0.5}
                    max={10}
                    step={0.5}
                    className="mt-4"
                  />
                  <FieldDescription>
                    Membros dentro de {raio} km do líder selecionado
                  </FieldDescription>
                </Field>
              </CardContent>
            </Card>
          )}

          {/* Members in Radius */}
          {liderSelecionado && membrosNoRaio.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Membros Encontrados ({membrosNoRaio.length})
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={toggleAll}>
                    {membrosSelecionados.size === membrosNoRaio.length
                      ? "Desmarcar Todos"
                      : "Selecionar Todos"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {membrosNoRaio.map((membro) => (
                      <div
                        key={membro.id}
                        className="flex items-center gap-3 rounded-lg border p-3"
                      >
                        <Checkbox
                          checked={membrosSelecionados.has(membro.id)}
                          onCheckedChange={() => toggleMembro(membro.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{membro.nome}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {formatPhone(membro.telefone)}
                            <span className="mx-1">|</span>
                            <MapPin className="h-3 w-3" />
                            {membro.endereco?.bairro}
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: `var(--type-${membro.tipo})`,
                            color: "white",
                          }}
                        >
                          {TIPOS_MEMBRO[membro.tipo]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {membrosSelecionados.size > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Criar Grupo WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {membrosSelecionados.size} membro
                  {membrosSelecionados.size !== 1 && "s"} selecionado
                  {membrosSelecionados.size !== 1 && "s"}
                </p>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    Copiar Lista
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={gerarLinkWhatsApp}
                    asChild={!!linkWhatsApp}
                  >
                    {linkWhatsApp ? (
                      <a
                        href={linkWhatsApp}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Abrir WhatsApp
                      </a>
                    ) : (
                      <>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Gerar Link
                      </>
                    )}
                  </Button>
                </div>

                <Separator />

                <Button
                  className="w-full"
                  onClick={salvarGrupo}
                  disabled={saving}
                >
                  {saving && <Spinner className="mr-2 h-4 w-4" />}
                  Salvar Grupo
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Map */}
        <Card className="h-[600px] lg:h-auto">
          <CardContent className="h-full p-0">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Spinner className="h-8 w-8 text-primary" />
              </div>
            ) : (
              <GoogleMap
                membros={membros}
                centerMemberId={liderSelecionado || undefined}
                radius={liderSelecionado ? raio : undefined}
                onMembersInRadius={handleMembrosNoRaio}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
