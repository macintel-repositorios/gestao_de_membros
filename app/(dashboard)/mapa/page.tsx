"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { GoogleMap } from "@/components/mapa/google-map";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Filter,
  X,
  Phone,
  MapPin,
  User,
  ExternalLink,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import {
  Membro,
  Igreja,
  TipoMembro,
  CargoMembro,
  TIPOS_MEMBRO,
  CARGOS_MEMBRO,
} from "@/lib/types";

export default function MapaPage() {
  const { igrejaId, unidadesAcessiveis, todasUnidades, igrejaNome } = useAuth();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [visitantes, setVisitantes] = useState<any[]>([]);
  const [igreja, setIgreja] = useState<Igreja | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Custom unit coordinates lookup state
  const [unidadesCoords, setUnidadesCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  
  // Filters
  const [filterUnidadeId, setFilterUnidadeId] = useState<string>("");
  const [filterTipo, setFilterTipo] = useState<TipoMembro | "todos">("todos");
  const [filterCargo, setFilterCargo] = useState<CargoMembro | "todos">("todos");
  const [filterBairro, setFilterBairro] = useState<string>("todos");
  const [filterGrupo, setFilterGrupo] = useState<string>("todos");
  const [filterFamilia, setFilterFamilia] = useState<string>("todos");
  const [grupos, setGrupos] = useState<{ id: string; nome: string }[]>([]);
  const [familias, setFamilias] = useState<any[]>([]);
  const [selectedMembro, setSelectedMembro] = useState<Membro | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  // Load church data
  useEffect(() => {
    if (!igrejaId) return;

    const loadIgreja = async () => {
      try {
        const { data: igrejaData, error } = await supabase
          .from("igrejas")
          .select("*")
          .eq("id", igrejaId)
          .single();
        if (error) throw error;
        if (igrejaData) {
          setIgreja({
            id: igrejaData.id,
            nome: igrejaData.nome,
            convencao: igrejaData.convencao || "",
            ministerio: igrejaData.ministerio || "",
            dirigente: igrejaData.dirigente || "",
            telefone: igrejaData.telefone || "",
            email: igrejaData.email || "",
            cnpj: igrejaData.cnpj || "",
            fotoUrl: igrejaData.foto_url || "",
            endereco: {
              logradouro: igrejaData.logradouro || "",
              numero: igrejaData.numero || "",
              complemento: igrejaData.complemento || "",
              bairro: igrejaData.bairro || "",
              cidade: igrejaData.cidade || "",
              estado: igrejaData.estado || "",
              cep: igrejaData.cep || "",
            },
            coordenadas: (igrejaData.latitude && igrejaData.longitude) ? {
              lat: Number(igrejaData.latitude),
              lng: Number(igrejaData.longitude),
            } : undefined,
          } as any);
        }
      } catch (error) {
        console.error("Erro ao carregar dados da igreja:", error);
      }
    };

    loadIgreja();
  }, [igrejaId]);

  // Load members, visitors and geocode units
  useEffect(() => {
    if (!igrejaId || unidadesAcessiveis.length === 0) {
      setLoading(false);
      return;
    }

    const loadDados = async () => {
      try {
        setLoading(true);
        // 1. Fetch Members
        const { data: membrosData, error: membrosErr } = await supabase
          .from("membros")
          .select("*")
          .eq("igreja_id", igrejaId)
          .in("unidade_id", unidadesAcessiveis);
        
        if (membrosErr) throw membrosErr;

        const mapeados = (membrosData || []).map((m) => ({
          id: m.id,
          unidadeId: m.unidade_id,
          nome: m.nome,
          telefone: m.telefone || "",
          email: m.email || "",
          fotoUrl: m.foto_url || "",
          dataNascimento: m.data_nascimento || "",
          estadoCivil: m.estado_civil || "",
          dataBatismo: m.data_batismo || "",
          cargo: m.cargo || "",
          tipo: m.tipo as TipoMembro,
          sexo: m.sexo || "",
          grupoId: m.grupo_id,
          endereco: {
            logradouro: m.logradouro || "",
            numero: m.numero || "",
            complemento: m.complemento || "",
            bairro: m.bairro || "",
            cidade: m.cidade || "",
            estado: m.estado || "",
            cep: m.cep || "",
          },
          coordenadas: {
            lat: m.latitude ? Number(m.latitude) : -23.55052,
            lng: m.longitude ? Number(m.longitude) : -46.633308,
          },
        }));

        setMembros(mapeados as any);

        // 2. Fetch Visitors
        const { data: visitantesData, error: visitantesErr } = await supabase
          .from("visitantes")
          .select("*")
          .eq("igreja_id", igrejaId)
          .in("unidade_id", unidadesAcessiveis);

        if (!visitantesErr && visitantesData) {
          setVisitantes(visitantesData);
        }

        // 3. Resolve Unit Coordinates (Geocode or fallback to members average/main church)
        const coordsTemp: Record<string, { lat: number; lng: number }> = {};
        const unidadesAcessiveisObjs = todasUnidades.filter(u => unidadesAcessiveis.includes(u.id));

        for (const u of unidadesAcessiveisObjs) {
          // Fallback coordinate: center of members in this unit or main church
          const unitMembers = mapeados.filter(m => m.unidadeId === u.id);
          let baseLat = -23.55052;
          let baseLng = -46.633308;

          if (unitMembers.length > 0) {
            baseLat = unitMembers.reduce((sum, m) => sum + m.coordenadas.lat, 0) / unitMembers.length;
            baseLng = unitMembers.reduce((sum, m) => sum + m.coordenadas.lng, 0) / unitMembers.length;
          } else if (igreja?.coordenadas) {
            baseLat = igreja.coordenadas.lat;
            baseLng = igreja.coordenadas.lng;
          }

          // Let's check if the unit has address fields to geocode
          if (u.endereco?.logradouro && u.endereco?.cidade) {
            try {
              const fullAddress = `${u.endereco.logradouro}, ${u.endereco.numero || ""}, ${u.endereco.bairro || ""}, ${u.endereco.cidade} - ${u.endereco.estado || ""}`;
              const geoRes = await fetch("/api/geocode", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ endereco: fullAddress }),
              });
              const geoData = await geoRes.json();
              if (geoData.lat && geoData.lng) {
                baseLat = geoData.lat;
                baseLng = geoData.lng;
              }
            } catch (e) {
              console.error("Geocoding failed for unit: " + u.nome, e);
            }
          }

          coordsTemp[u.id] = { lat: baseLat, lng: baseLng };
        }
        setUnidadesCoords(coordsTemp);

        // 4. Fetch Groups
        const { data: gruposData } = await supabase
          .from("grupos")
          .select("id, nome")
          .eq("igreja_id", igrejaId)
          .in("unidade_id", unidadesAcessiveis);
        if (gruposData) {
          setGrupos(gruposData);
        }

        // 5. Fetch Families
        const { data: familiasData } = await supabase
          .from("familias")
          .select("id, nome, responsavel_1_id, responsavel_2_id, dependentes")
          .eq("igreja_id", igrejaId)
          .in("unidade_id", unidadesAcessiveis);
        if (familiasData) {
          setFamilias(familiasData);
        }

      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDados();
  }, [igrejaId, unidadesAcessiveis, todasUnidades, igreja]);

  // Combine members and filtered visitors for the map
  // To show visitors on the map, we represent them as Membro objects but with tipo: 'visitante'
  const mappedVisitors = visitantes.map((v) => {
    // Determine center coordinate for the visitor's unit
    const unitCoord = unidadesCoords[v.unidade_id] || { lat: -23.55052, lng: -46.633308 };
    // Add small random noise to prevent stacking directly on unit ground zero
    const offsetLat = (Math.random() - 0.5) * 0.0015;
    const offsetLng = (Math.random() - 0.5) * 0.0015;

    return {
      id: v.id,
      unidadeId: v.unidade_id,
      nome: v.nome + " (Visitante)",
      telefone: v.telefone || "",
      email: "",
      fotoUrl: "",
      dataNascimento: v.data_nascimento || "",
      estadoCivil: "",
      dataBatismo: "",
      cargo: "",
      tipo: "visitante" as TipoMembro,
      sexo: "",
      endereco: {
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        cep: "",
      },
      coordenadas: {
        lat: unitCoord.lat + offsetLat,
        lng: unitCoord.lng + offsetLng,
      },
    };
  });

  const todosMapeadosNoMapa = [...membros, ...mappedVisitors] as Membro[];

  // Get unique bairros
  const bairros = Array.from(
    new Set(todosMapeadosNoMapa.map((m) => m.endereco?.bairro).filter(Boolean))
  ).sort();

  // Filter members/visitors based on unit and other filters
  const filteredMembros = !filterUnidadeId ? [] : todosMapeadosNoMapa.filter((membro) => {
    const matchesUnidade = filterUnidadeId === "todos" || membro.unidadeId === filterUnidadeId;
    const matchesTipo = filterTipo === "todos" || membro.tipo === filterTipo;
    const matchesCargo = filterCargo === "todos" || membro.cargo === filterCargo;
    const matchesBairro = filterBairro === "todos" || membro.endereco?.bairro === filterBairro;
    
    // Filter by Group
    const matchesGrupo = filterGrupo === "todos" || (membro as any).grupoId === filterGrupo;

    // Filter by Family
    let matchesFamilia = true;
    if (filterFamilia !== "todos") {
      const family = familias.find(f => f.id === filterFamilia);
      if (family) {
        const isMemberInFamily = (membroId: string, fam: any) => {
          if (fam.responsavel_1_id === membroId) return true;
          if (fam.responsavel_2_id === membroId) return true;
          if (fam.dependentes && Array.isArray(fam.dependentes)) {
            return fam.dependentes.some((dep: any) => dep.membroVinculadoId === membroId || dep.id === membroId);
          }
          return false;
        };
        matchesFamilia = isMemberInFamily(membro.id, family);
      } else {
        matchesFamilia = false;
      }
    }

    return matchesUnidade && matchesTipo && matchesCargo && matchesBairro && matchesGrupo && matchesFamilia;
  });

  const handleMemberClick = useCallback((membro: Membro) => {
    setSelectedMembro(membro);
  }, []);

  const clearFilters = () => {
    setFilterUnidadeId("");
    setFilterTipo("todos");
    setFilterCargo("todos");
    setFilterBairro("todos");
    setFilterGrupo("todos");
    setFilterFamilia("todos");
  };

  const hasActiveFilters =
    filterUnidadeId !== "" ||
    filterTipo !== "todos" ||
    filterCargo !== "todos" ||
    filterBairro !== "todos" ||
    filterGrupo !== "todos" ||
    filterFamilia !== "todos";

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    return phone;
  };
  const membrosNoMesmoEndereco = useMemo(() => {
    if (!selectedMembro) return [];
    return filteredMembros.filter(
      (m) =>
        Math.abs(m.coordenadas.lat - selectedMembro.coordenadas.lat) < 0.00015 &&
        Math.abs(m.coordenadas.lng - selectedMembro.coordenadas.lng) < 0.00015
    );
  }, [selectedMembro, filteredMembros]);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mapa de Membros</h1>
          <p className="text-muted-foreground flex flex-col gap-0.5">
            <span>
              {filteredMembros.length} membro{filteredMembros.length !== 1 && "s"} no mapa
            </span>
            {igrejaNome && (
              <span className="text-xs text-muted-foreground mt-0.5">
                Igreja: <strong className="text-foreground">{igrejaNome}</strong>
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showFilters ? "secondary" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="default" className="ml-2">
                {[filterTipo, filterCargo, filterBairro, filterGrupo, filterFamilia].filter(
                  (f) => f !== "todos"
                ).length}
              </Badge>
            )}
          </Button>
          <Button asChild>
            <Link href="/grupos/novo">
              <UsersRound className="mr-2 h-4 w-4" />
              Criar Grupo
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:flex-wrap">
            {/* Unit/Church select filter */}
            {todasUnidades && (
              <Select
                value={filterUnidadeId}
                onValueChange={setFilterUnidadeId}
              >
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Selecionar Igreja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as igrejas/unidades</SelectItem>
                  {todasUnidades
                    .filter((u) => unidadesAcessiveis.includes(u.id))
                    .map((unidade) => (
                      <SelectItem key={unidade.id} value={unidade.id}>
                        {unidade.nome} ({unidade.tipo.toUpperCase()})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}

            <Select
              value={filterTipo}
              onValueChange={(v) => setFilterTipo(v as TipoMembro | "todos")}
              disabled={!filterUnidadeId}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {(Object.keys(TIPOS_MEMBRO) as TipoMembro[]).map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {TIPOS_MEMBRO[tipo]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterCargo}
              onValueChange={(v) => setFilterCargo(v as CargoMembro | "todos")}
              disabled={!filterUnidadeId}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os cargos</SelectItem>
                {(Object.keys(CARGOS_MEMBRO) as CargoMembro[]).map((cargo) => (
                  <SelectItem key={cargo} value={cargo}>
                    {CARGOS_MEMBRO[cargo]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterBairro} onValueChange={setFilterBairro} disabled={!filterUnidadeId}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Bairro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os bairros</SelectItem>
                {bairros.map((bairro) => (
                  <SelectItem key={bairro} value={bairro!}>
                    {bairro}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {grupos.length > 0 && (
              <Select value={filterGrupo} onValueChange={setFilterGrupo} disabled={!filterUnidadeId}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os grupos</SelectItem>
                  {grupos.map((grupo) => (
                    <SelectItem key={grupo.id} value={grupo.id}>
                      {grupo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {familias.length > 0 && (
              <Select value={filterFamilia} onValueChange={setFilterFamilia} disabled={!filterUnidadeId}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Família" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as famílias</SelectItem>
                  {familias.map((familia) => (
                    <SelectItem key={familia.id} value={familia.id}>
                      {familia.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Map */}
      {loading ? (
        <Card className="flex-1">
          <CardContent className="flex h-full items-center justify-center p-6">
            <div className="text-center">
              <Skeleton className="mx-auto mb-4 h-12 w-12 rounded-full" />
              <Skeleton className="mx-auto h-4 w-32" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex-1 overflow-hidden">
          <GoogleMap
            membros={filteredMembros}
            igreja={igreja || undefined}
            selectedUnidade={
              filterUnidadeId !== "todos"
                ? {
                    id: filterUnidadeId,
                    nome: todasUnidades.find((u) => u.id === filterUnidadeId)?.nome || "",
                    coordenadas: unidadesCoords[filterUnidadeId],
                  }
                : undefined
            }
            onMemberClick={handleMemberClick}
            selectedMemberId={selectedMembro?.id}
          />
        </Card>
      )}

      {/* Member Details Sheet */}
      <Sheet open={!!selectedMembro} onOpenChange={() => setSelectedMembro(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Detalhes do Membro</SheetTitle>
          </SheetHeader>

          {selectedMembro && (
            <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
              <div className="space-y-6 py-4">
                {/* Selector for multiple members at the same address */}
                {membrosNoMesmoEndereco.length > 1 && (
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/40">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Membros neste endereço ({membrosNoMesmoEndereco.length}):
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {membrosNoMesmoEndereco.map((m) => (
                        <Button
                          key={m.id}
                          variant={m.id === selectedMembro.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedMembro(m)}
                          className="h-7 text-xs px-2.5"
                        >
                          {m.nome}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Name and Type */}
                <div>
                  <h3 className="text-xl font-semibold">{selectedMembro.nome}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge
                      style={{
                        backgroundColor: `var(--type-${selectedMembro.tipo})`,
                        color: "white",
                      }}
                    >
                      {TIPOS_MEMBRO[selectedMembro.tipo]}
                    </Badge>
                    {selectedMembro.cargo && (
                      <Badge variant="outline">
                        {selectedMembro.cargo === "outro"
                          ? selectedMembro.cargoDescricao
                          : CARGOS_MEMBRO[selectedMembro.cargo]}
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Contact */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Contato
                  </h4>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:+55${selectedMembro.telefone}`}
                      className="hover:underline"
                    >
                      {formatPhone(selectedMembro.telefone)}
                    </a>
                  </div>
                </div>

                <Separator />

                {/* Address */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Endereço
                  </h4>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p>
                        {selectedMembro.endereco.logradouro},{" "}
                        {selectedMembro.endereco.numero}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedMembro.endereco.bairro} -{" "}
                        {selectedMembro.endereco.cidade}/
                        {selectedMembro.endereco.estado}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="space-y-2">
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={`https://wa.me/55${selectedMembro.telefone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      Enviar WhatsApp
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedMembro.coordenadas.lat},${selectedMembro.coordenadas.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Traçar Rota
                    </a>
                  </Button>
                  <Button className="w-full" asChild>
                    <Link href={`/membros/${selectedMembro.id}`}>
                      <User className="mr-2 h-4 w-4" />
                      Ver Perfil Completo
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
