"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Usuario, Unidade, NivelAcesso } from "@/lib/types";
import { getUnidadesAcessiveis, carregarTodasUnidades } from "@/lib/supabase-db";

interface AuthContextType {
  user: User | null;
  usuario: Usuario | null;
  igrejaId: string | null;
  unidadeId: string | null;
  unidadeAtual: Unidade | null;
  unidadesAcessiveis: string[]; // IDs das unidades que o usuário pode acessar
  todasUnidades: Unidade[]; // Todas as unidades carregadas
  nivelAcesso: NivelAcesso | null;
  loading: boolean;
  isConfigured: boolean;
  signOut: () => Promise<void>;
  podeAcessarUnidade: (unidadeId: string) => boolean;
  temAcessoTotal: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [igrejaId, setIgrejaId] = useState<string | null>(null);
  const [unidadeId, setUnidadeId] = useState<string | null>(null);
  const [unidadeAtual, setUnidadeAtual] = useState<Unidade | null>(null);
  const [unidadesAcessiveis, setUnidadesAcessiveis] = useState<string[]>([]);
  const [todasUnidades, setTodasUnidades] = useState<Unidade[]>([]);
  const [nivelAcesso, setNivelAcesso] = useState<NivelAcesso | null>(null);
  const [loading, setLoading] = useState(true);

  const isConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Carrega as unidades acessíveis quando o usuário é carregado
  useEffect(() => {
    async function carregarUnidades() {
      if (!usuario || !igrejaId || igrejaId === "") {
        setUnidadesAcessiveis([]);
        setTodasUnidades([]);
        setUnidadeAtual(null);
        return;
      }

      try {
        const unidades = await carregarTodasUnidades(igrejaId);
        setTodasUnidades(unidades);

        if (usuario.nivelAcesso === "full" || !usuario.unidadeId) {
          const todasIds = unidades.map(u => u.id);
          setUnidadesAcessiveis(todasIds);
          setUnidadeAtual(unidades[0] || null);
          return;
        }

        const unidade = unidades.find(u => u.id === usuario.unidadeId);
        setUnidadeAtual(unidade || null);

        const acessiveis = await getUnidadesAcessiveis(
          igrejaId,
          usuario.unidadeId,
          usuario.nivelAcesso
        );
        setUnidadesAcessiveis(acessiveis);
      } catch (error) {
        console.error("Erro ao carregar unidades:", error);
        if (usuario.unidadeId) {
          setUnidadesAcessiveis([usuario.unidadeId]);
        }
      }
    }

    carregarUnidades();
  }, [usuario, igrejaId]);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function processarSession(session: any) {
      const currentUser = session?.user ?? null;
      if (!isMounted) return;
      setUser(currentUser);

      if (currentUser) {
        try {
          // Busca os dados adicionais do usuário na tabela do banco
          const { data: userData, error } = await supabase
            .from("usuarios")
            .select("*")
            .eq("id", currentUser.id)
            .single();

          if (!isMounted) return;

          if (error) {
            console.error("Erro ao buscar dados do usuário:", error);
            // Caso o documento do usuário ainda não esteja criado
            setUsuario(null);
            setIgrejaId(null);
            setUnidadeId(null);
            setNivelAcesso(null);
          } else if (userData) {
            const u: Usuario = {
              uid: userData.id,
              nome: userData.nome,
              telefone: userData.telefone,
              email: userData.email,
              nivelAcesso: userData.nivel_acesso as NivelAcesso,
              igrejaId: userData.igreja_id || "",
              unidadeId: userData.unidade_id || "",
              ativo: userData.ativo,
              dataCriacao: userData.data_criacao,
            };
            setUsuario(u);
            setIgrejaId(u.igrejaId || null);
            setUnidadeId(u.unidadeId || null);
            setNivelAcesso(u.nivelAcesso || null);
          }
        } catch (err) {
          console.error("Erro no processamento do usuário:", err);
        }
      } else {
        setUsuario(null);
        setIgrejaId(null);
        setUnidadeId(null);
        setNivelAcesso(null);
        setUnidadesAcessiveis([]);
        setTodasUnidades([]);
        setUnidadeAtual(null);
      }
      setLoading(false);
    }

    // Busca a sessão inicial de forma assíncrona
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        processarSession(session);
      }
    }).catch((err) => {
      console.error("Erro ao obter sessão inicial:", err);
      if (isMounted) {
        setLoading(false);
      }
    });

    // Monitora alterações no estado de autenticação do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isMounted) {
          await processarSession(session);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUsuario(null);
    setIgrejaId(null);
    setUnidadeId(null);
    setNivelAcesso(null);
    setUnidadesAcessiveis([]);
    setTodasUnidades([]);
    setUnidadeAtual(null);
  };

  const podeAcessarUnidade = (targetUnidadeId: string): boolean => {
    if (nivelAcesso === "full") return true;
    return unidadesAcessiveis.includes(targetUnidadeId);
  };

  const temAcessoTotal = (): boolean => {
    return nivelAcesso === "full";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        usuario,
        igrejaId,
        unidadeId,
        unidadeAtual,
        unidadesAcessiveis,
        todasUnidades,
        nivelAcesso,
        loading,
        isConfigured,
        signOut,
        podeAcessarUnidade,
        temAcessoTotal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
