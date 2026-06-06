"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { onSnapshot } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";
import { Usuario, Unidade, NivelAcesso } from "@/lib/types";
import { getUsuarioDoc, getUnidadesAcessiveis, getUnidadeDoc, carregarTodasUnidades } from "@/lib/firestore";

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
  // Função para verificar se o usuário pode acessar uma unidade
  podeAcessarUnidade: (unidadeId: string) => boolean;
  // Função para verificar se o usuário tem acesso total
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

  // Carrega as unidades acessíveis quando o usuário é carregado
  useEffect(() => {
    async function carregarUnidades() {
      // Se não tem usuário ou igreja, limpa tudo
      if (!usuario || !igrejaId || igrejaId === "") {
        setUnidadesAcessiveis([]);
        setTodasUnidades([]);
        setUnidadeAtual(null);
        return;
      }

      try {
        // Carrega todas as unidades da igreja
        const unidades = await carregarTodasUnidades(igrejaId);
        setTodasUnidades(unidades);

        // Se o usuário é "full" ou não tem unidadeId, dá acesso a todas
        if (usuario.nivelAcesso === "full" || !usuario.unidadeId) {
          const todasIds = unidades.map(u => u.id);
          setUnidadesAcessiveis(todasIds);
          setUnidadeAtual(unidades[0] || null);
          return;
        }

        // Encontra a unidade atual do usuário
        const unidade = unidades.find(u => u.id === usuario.unidadeId);
        setUnidadeAtual(unidade || null);

        // Carrega as unidades acessíveis baseado no nível de acesso
        const acessiveis = await getUnidadesAcessiveis(
          igrejaId,
          usuario.unidadeId,
          usuario.nivelAcesso
        );
        setUnidadesAcessiveis(acessiveis);
      } catch (error) {
        console.error("Erro ao carregar unidades:", error);
        // Em caso de erro, tenta dar acesso à unidade do usuário
        if (usuario.unidadeId) {
          setUnidadesAcessiveis([usuario.unidadeId]);
        }
      }
    }

    carregarUnidades();
  }, [usuario, igrejaId]);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      setLoading(false);
      return;
    }

    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }

      setUser(firebaseUser);

      if (firebaseUser) {
        // Primeiro tenta buscar no formato antigo (coleção raiz usuarios)
        // Se não encontrar, busca no novo formato
        const { doc, getDoc } = await import("firebase/firestore");
        
        // Tenta buscar na coleção raiz primeiro (formato antigo)
        const userDocRefOld = doc(db, "usuarios", firebaseUser.uid);
        const docSnapOld = await getDoc(userDocRefOld);
        
        if (docSnapOld.exists()) {
          const userData = { uid: docSnapOld.id, ...docSnapOld.data() } as Usuario;
          setUsuario(userData);
          setIgrejaId(userData.igrejaId || null);
          setUnidadeId(userData.unidadeId || null);
          setNivelAcesso(userData.nivelAcesso || null);
          setLoading(false);
          
          // Configura listener para mudanças
          unsubscribeUser = onSnapshot(userDocRefOld, (docSnap) => {
            if (docSnap.exists()) {
              const userData = { uid: docSnap.id, ...docSnap.data() } as Usuario;
              setUsuario(userData);
              setIgrejaId(userData.igrejaId || null);
              setUnidadeId(userData.unidadeId || null);
              setNivelAcesso(userData.nivelAcesso || null);
            }
          });
          
          return;
        }

        // Se não encontrou pelo UID, tenta buscar por telefone (pré-cadastro)
        if (firebaseUser.phoneNumber) {
          const { doc, getDoc, setDoc, deleteDoc, Timestamp } = await import("firebase/firestore");
          const userPhoneDocRef = doc(db, "usuarios", firebaseUser.phoneNumber);
          const docSnapPhone = await getDoc(userPhoneDocRef);

          if (docSnapPhone.exists()) {
            const phoneData = docSnapPhone.data();
            
            // Cria o novo documento associado ao UID
            await setDoc(userDocRefOld, {
              ...phoneData,
              uid: firebaseUser.uid,
              dataAtualizacao: Timestamp.now()
            });

            // Remove o documento temporário do telefone
            await deleteDoc(userPhoneDocRef);

            const userData = { uid: firebaseUser.uid, ...phoneData } as Usuario;
            setUsuario(userData);
            setIgrejaId(userData.igrejaId || null);
            setUnidadeId(userData.unidadeId || null);
            setNivelAcesso(userData.nivelAcesso || null);
            setLoading(false);

            // Configura listener no novo UID
            unsubscribeUser = onSnapshot(userDocRefOld, (docSnap) => {
              if (docSnap.exists()) {
                const uData = { uid: docSnap.id, ...docSnap.data() } as Usuario;
                setUsuario(uData);
                setIgrejaId(uData.igrejaId || null);
                setUnidadeId(uData.unidadeId || null);
                setNivelAcesso(uData.nivelAcesso || null);
              }
            });

            return;
          }
        }
        
        // Se não encontrou na raiz, usuário não configurado corretamente
        setUsuario(null);
        setIgrejaId(null);
        setUnidadeId(null);
        setNivelAcesso(null);
        setLoading(false);
      } else {
        setUsuario(null);
        setIgrejaId(null);
        setUnidadeId(null);
        setNivelAcesso(null);
        setUnidadesAcessiveis([]);
        setTodasUnidades([]);
        setUnidadeAtual(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) {
        unsubscribeUser();
      }
    };
  }, []);

  const signOut = async () => {
    if (auth) {
      await firebaseSignOut(auth);
    }
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
        isConfigured: isFirebaseConfigured, 
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
