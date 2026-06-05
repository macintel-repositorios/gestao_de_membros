"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Unidade } from "@/lib/types";
import { useAuth } from "./auth-context";

interface UnidadeSelecionadaContextType {
  unidadeSelecionada: Unidade | null;
  setUnidadeSelecionada: (unidade: Unidade | null) => void;
  // Retorna true se estamos visualizando "todas" as unidades
  visualizandoTodas: boolean;
  setVisualizandoTodas: (value: boolean) => void;
}

const UnidadeSelecionadaContext = createContext<UnidadeSelecionadaContextType | undefined>(undefined);

const STORAGE_KEY = "unidadeSelecionadaId";

export function UnidadeSelecionadaProvider({ children }: { children: ReactNode }) {
  const { todasUnidades, unidadesAcessiveis, loading } = useAuth();
  const [unidadeSelecionada, setUnidadeSelecionadaState] = useState<Unidade | null>(null);
  const [visualizandoTodas, setVisualizandoTodas] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Carrega a unidade selecionada do localStorage ao iniciar
  useEffect(() => {
    if (loading || todasUnidades.length === 0) return;

    const savedId = localStorage.getItem(STORAGE_KEY);
    const savedVisualizandoTodas = localStorage.getItem(`${STORAGE_KEY}_todas`);

    if (savedVisualizandoTodas === "true") {
      setVisualizandoTodas(true);
      setUnidadeSelecionadaState(null);
    } else if (savedId) {
      const unidade = todasUnidades.find(u => u.id === savedId);
      if (unidade && unidadesAcessiveis.includes(unidade.id)) {
        setUnidadeSelecionadaState(unidade);
      } else {
        // Se a unidade salva não existe mais ou não é acessível, seleciona a primeira
        const primeiraUnidade = todasUnidades.find(u => unidadesAcessiveis.includes(u.id));
        setUnidadeSelecionadaState(primeiraUnidade || null);
      }
    } else {
      // Se não tem nada salvo, seleciona a primeira unidade acessível
      const primeiraUnidade = todasUnidades.find(u => unidadesAcessiveis.includes(u.id));
      setUnidadeSelecionadaState(primeiraUnidade || null);
    }

    setInitialized(true);
  }, [loading, todasUnidades, unidadesAcessiveis]);

  const setUnidadeSelecionada = (unidade: Unidade | null) => {
    setUnidadeSelecionadaState(unidade);
    setVisualizandoTodas(false);
    
    if (unidade) {
      localStorage.setItem(STORAGE_KEY, unidade.id);
      localStorage.removeItem(`${STORAGE_KEY}_todas`);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleSetVisualizandoTodas = (value: boolean) => {
    setVisualizandoTodas(value);
    if (value) {
      setUnidadeSelecionadaState(null);
      localStorage.setItem(`${STORAGE_KEY}_todas`, "true");
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.removeItem(`${STORAGE_KEY}_todas`);
    }
  };

  return (
    <UnidadeSelecionadaContext.Provider
      value={{
        unidadeSelecionada,
        setUnidadeSelecionada,
        visualizandoTodas,
        setVisualizandoTodas: handleSetVisualizandoTodas,
      }}
    >
      {children}
    </UnidadeSelecionadaContext.Provider>
  );
}

export function useUnidadeSelecionada() {
  const context = useContext(UnidadeSelecionadaContext);
  if (context === undefined) {
    throw new Error("useUnidadeSelecionada must be used within a UnidadeSelecionadaProvider");
  }
  return context;
}
