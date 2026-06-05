"use client";

import { ChevronDown, Building2, Check, Layers } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { useUnidadeSelecionada } from "@/contexts/unidade-selecionada-context";
import { Unidade, TIPOS_UNIDADE, TipoUnidade } from "@/lib/types";

const CORES_TIPO_UNIDADE: Record<TipoUnidade, string> = {
  sede: "#16a34a",
  congregacao: "#2563eb",
  subcongregacao: "#9333ea",
};

export function UnidadeSelector() {
  const { todasUnidades, unidadesAcessiveis, temAcessoTotal } = useAuth();
  const { unidadeSelecionada, setUnidadeSelecionada, visualizandoTodas, setVisualizandoTodas } = useUnidadeSelecionada();

  // Filtra apenas as unidades que o usuário pode acessar
  const unidadesDisponiveis = todasUnidades.filter(u => unidadesAcessiveis.includes(u.id));

  // Agrupa unidades por tipo para exibição
  const sedes = unidadesDisponiveis.filter(u => u.tipo === "sede");
  const congregacoes = unidadesDisponiveis.filter(u => u.tipo === "congregacao");
  const subcongregacoes = unidadesDisponiveis.filter(u => u.tipo === "subcongregacao");

  const handleSelectUnidade = (unidade: Unidade) => {
    setUnidadeSelecionada(unidade);
  };

  const handleSelectTodas = () => {
    setVisualizandoTodas(true);
  };

  if (unidadesDisponiveis.length === 0) {
    return null;
  }

  const displayName = visualizandoTodas 
    ? "Todas as unidades" 
    : unidadeSelecionada?.nome || "Selecione uma unidade";

  const displayTipo = visualizandoTodas 
    ? null 
    : unidadeSelecionada?.tipo;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between gap-2 border-sidebar-border bg-sidebar-accent/50 hover:bg-sidebar-accent"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {visualizandoTodas ? (
              <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <div 
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: displayTipo ? CORES_TIPO_UNIDADE[displayTipo] : "#6b7280" }}
              />
            )}
            <span className="truncate text-sm font-medium">{displayName}</span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Marco Zero - Unidade Ativa
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Opção para ver todas */}
        {temAcessoTotal() && unidadesDisponiveis.length > 1 && (
          <>
            <DropdownMenuItem onClick={handleSelectTodas} className="gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span>Todas as unidades</span>
              {visualizandoTodas && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Sedes */}
        {sedes.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CORES_TIPO_UNIDADE.sede }} />
                Sedes
              </div>
            </DropdownMenuLabel>
            {sedes.map((unidade) => (
              <DropdownMenuItem 
                key={unidade.id} 
                onClick={() => handleSelectUnidade(unidade)}
                className="gap-2 pl-4"
              >
                <Building2 className="h-4 w-4" style={{ color: CORES_TIPO_UNIDADE.sede }} />
                <span className="truncate">{unidade.nome}</span>
                {unidadeSelecionada?.id === unidade.id && !visualizandoTodas && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Congregações */}
        {congregacoes.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CORES_TIPO_UNIDADE.congregacao }} />
                Congregações
              </div>
            </DropdownMenuLabel>
            {congregacoes.map((unidade) => (
              <DropdownMenuItem 
                key={unidade.id} 
                onClick={() => handleSelectUnidade(unidade)}
                className="gap-2 pl-4"
              >
                <Building2 className="h-4 w-4" style={{ color: CORES_TIPO_UNIDADE.congregacao }} />
                <span className="truncate">{unidade.nome}</span>
                {unidadeSelecionada?.id === unidade.id && !visualizandoTodas && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Subcongregações */}
        {subcongregacoes.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CORES_TIPO_UNIDADE.subcongregacao }} />
                Subcongregações
              </div>
            </DropdownMenuLabel>
            {subcongregacoes.map((unidade) => (
              <DropdownMenuItem 
                key={unidade.id} 
                onClick={() => handleSelectUnidade(unidade)}
                className="gap-2 pl-4"
              >
                <Building2 className="h-4 w-4" style={{ color: CORES_TIPO_UNIDADE.subcongregacao }} />
                <span className="truncate">{unidade.nome}</span>
                {unidadeSelecionada?.id === unidade.id && !visualizandoTodas && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
