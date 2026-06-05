"use client";

import { useEffect, useState, useCallback } from "react";
import { query, onSnapshot, getDoc, getDocs } from "firebase/firestore";
import { getMembrosCollection, getIgrejaDoc } from "@/lib/firestore";
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
  const { igrejaId, unidadesAcessiveis } = useAuth();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [igreja, setIgreja] = useState<Igreja | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterTipo, setFilterTipo] = useState<TipoMembro | "todos">("todos");
  const [filterCargo, setFilterCargo] = useState<CargoMembro | "todos">("todos");
  const [filterBairro, setFilterBairro] = useState<string>("todos");
  const [selectedMembro, setSelectedMembro] = useState<Membro | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Load church data
  useEffect(() => {
    if (!igrejaId) return;

    const loadIgreja = async () => {
      try {
        const igrejaDocRef = getIgrejaDoc(igrejaId);
        const igrejaDocSnap = await getDoc(igrejaDocRef);
        if (igrejaDocSnap.exists()) {
          setIgreja({ id: igrejaDocSnap.id, ...igrejaDocSnap.data() } as Igreja);
        }
      } catch (error) {
        console.error("Erro ao carregar dados da igreja:", error);
      }
    };

    loadIgreja();
  }, [igrejaId]);

  // Load members from all accessible units
  useEffect(() => {
    if (!igrejaId || unidadesAcessiveis.length === 0) {
      setLoading(false);
      return;
    }

    const loadMembros = async () => {
      try {
        const membrosData: Membro[] = [];
        
        for (const unidadeId of unidadesAcessiveis) {
          const membrosRef = getMembrosCollection(igrejaId, unidadeId);
          const snapshot = await getDocs(query(membrosRef));
          snapshot.forEach((docSnap) => {
            membrosData.push({ id: docSnap.id, unidadeId, ...docSnap.data() } as Membro);
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

  // Get unique bairros
  const bairros = Array.from(
    new Set(membros.map((m) => m.endereco?.bairro).filter(Boolean))
  ).sort();

  // Filter members
  const filteredMembros = membros.filter((membro) => {
    const matchesTipo = filterTipo === "todos" || membro.tipo === filterTipo;
    const matchesCargo =
      filterCargo === "todos" || membro.cargo === filterCargo;
    const matchesBairro =
      filterBairro === "todos" || membro.endereco?.bairro === filterBairro;

    return matchesTipo && matchesCargo && matchesBairro;
  });

  const handleMemberClick = useCallback((membro: Membro) => {
    setSelectedMembro(membro);
  }, []);

  const clearFilters = () => {
    setFilterTipo("todos");
    setFilterCargo("todos");
    setFilterBairro("todos");
  };

  const hasActiveFilters =
    filterTipo !== "todos" ||
    filterCargo !== "todos" ||
    filterBairro !== "todos";

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mapa de Membros</h1>
          <p className="text-muted-foreground">
            {filteredMembros.length} membro
            {filteredMembros.length !== 1 && "s"} no mapa
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
                {[filterTipo, filterCargo, filterBairro].filter(
                  (f) => f !== "todos"
                ).length}
              </Badge>
            )}
          </Button>
          <Button asChild>
            <Link href="/dashboard/grupos/novo">
              <UsersRound className="mr-2 h-4 w-4" />
              Criar Grupo
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <Select
              value={filterTipo}
              onValueChange={(v) => setFilterTipo(v as TipoMembro | "todos")}
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

            <Select value={filterBairro} onValueChange={setFilterBairro}>
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
                    <Link href={`/dashboard/membros/${selectedMembro.id}`}>
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
