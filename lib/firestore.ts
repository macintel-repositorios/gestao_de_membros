// Firestore helpers para estrutura hierárquica multi-tenant
// Estrutura: /igrejas/{igrejaId}/unidades/{unidadeId}/membros
//            /igrejas/{igrejaId}/unidades
//            /igrejas/{igrejaId}/usuarios

import { collection, doc, query, where, getDocs, DocumentData } from "firebase/firestore";
import { db } from "./firebase";
import type { Unidade, NivelAcesso } from "./types";

// Nomes das coleções padronizados
export const COLLECTIONS = {
  IGREJAS: "igrejas",
  UNIDADES: "unidades",
  MEMBROS: "membros",
  VISITANTES: "visitantes",
  GRUPOS: "grupos",
  ACOMPANHAMENTOS: "acompanhamentos",
  USUARIOS: "usuarios",
  FAMILIAS: "familias",
} as const;

/**
 * Retorna a referência da coleção de igrejas
 */
export function getIgrejasCollection() {
  if (!db) throw new Error("Firebase não configurado");
  return collection(db, COLLECTIONS.IGREJAS);
}

/**
 * Retorna a referência do documento da igreja
 */
export function getIgrejaDoc(igrejaId: string) {
  if (!db) throw new Error("Firebase não configurado");
  if (!igrejaId) throw new Error("igrejaId é obrigatório");
  return doc(db, COLLECTIONS.IGREJAS, igrejaId);
}

/**
 * Retorna a referência da coleção de unidades de uma igreja
 */
export function getUnidadesCollection(igrejaId: string) {
  if (!db) throw new Error("Firebase não configurado");
  if (!igrejaId) throw new Error("igrejaId é obrigatório");
  return collection(db, COLLECTIONS.IGREJAS, igrejaId, COLLECTIONS.UNIDADES);
}

/**
 * Retorna a referência do documento de uma unidade
 */
export function getUnidadeDoc(igrejaId: string, unidadeId: string) {
  if (!db) throw new Error("Firebase não configurado");
  if (!igrejaId) throw new Error("igrejaId é obrigatório");
  if (!unidadeId) throw new Error("unidadeId é obrigatório");
  return doc(db, COLLECTIONS.IGREJAS, igrejaId, COLLECTIONS.UNIDADES, unidadeId);
}

/**
 * Retorna a referência da coleção de membros de uma unidade
 */
export function getMembrosCollection(igrejaId: string, unidadeId: string) {
  if (!db) throw new Error("Firebase não configurado");
  if (!igrejaId) throw new Error("igrejaId é obrigatório");
  if (!unidadeId) throw new Error("unidadeId é obrigatório");
  return collection(db, COLLECTIONS.IGREJAS, igrejaId, COLLECTIONS.UNIDADES, unidadeId, COLLECTIONS.MEMBROS);
}

/**
 * Retorna a referência do documento de um membro
 */
export function getMembroDoc(igrejaId: string, unidadeId: string, membroId: string) {
  if (!db) throw new Error("Firebase não configurado");
  if (!igrejaId) throw new Error("igrejaId é obrigatório");
  if (!unidadeId) throw new Error("unidadeId é obrigatório");
  if (!membroId) throw new Error("membroId é obrigatório");
  return doc(db, COLLECTIONS.IGREJAS, igrejaId, COLLECTIONS.UNIDADES, unidadeId, COLLECTIONS.MEMBROS, membroId);
}

/**
 * Retorna a referência da coleção de usuários de uma igreja
 */
export function getUsuariosCollection(igrejaId: string) {
  if (!db) throw new Error("Firebase não configurado");
  if (!igrejaId) throw new Error("igrejaId é obrigatório");
  return collection(db, COLLECTIONS.IGREJAS, igrejaId, COLLECTIONS.USUARIOS);
}

/**
 * Retorna a referência do documento de um usuário
 */
export function getUsuarioDoc(igrejaId: string, usuarioId: string) {
  if (!db) throw new Error("Firebase não configurado");
  if (!igrejaId) throw new Error("igrejaId é obrigatório");
  if (!usuarioId) throw new Error("usuarioId é obrigatório");
  return doc(db, COLLECTIONS.IGREJAS, igrejaId, COLLECTIONS.USUARIOS, usuarioId);
}

/**
 * Retorna a referência da coleção de grupos de uma unidade
 */
export function getGruposCollection(igrejaId: string, unidadeId: string) {
  if (!db) throw new Error("Firebase não configurado");
  if (!igrejaId) throw new Error("igrejaId é obrigatório");
  if (!unidadeId) throw new Error("unidadeId é obrigatório");
  return collection(db, COLLECTIONS.IGREJAS, igrejaId, COLLECTIONS.UNIDADES, unidadeId, COLLECTIONS.GRUPOS);
}

/**
 * Retorna a referência da coleção de acompanhamentos de uma unidade
 */
export function getAcompanhamentosCollection(igrejaId: string, unidadeId: string) {
  if (!db) throw new Error("Firebase não configurado");
  if (!igrejaId) throw new Error("igrejaId é obrigatório");
  if (!unidadeId) throw new Error("unidadeId é obrigatório");
  return collection(db, COLLECTIONS.IGREJAS, igrejaId, COLLECTIONS.UNIDADES, unidadeId, COLLECTIONS.ACOMPANHAMENTOS);
}

/**
 * Busca todas as unidades filhas de uma unidade (recursivo)
 * Retorna array de IDs de unidades acessíveis
 */
export async function getUnidadesFilhas(igrejaId: string, unidadeId: string): Promise<string[]> {
  if (!db) throw new Error("Firebase não configurado");
  
  const filhasIds: string[] = [];
  const unidadesRef = getUnidadesCollection(igrejaId);
  
  // Busca unidades que têm esta unidade como pai
  const q = query(unidadesRef, where("unidadePaiId", "==", unidadeId));
  const snapshot = await getDocs(q);
  
  for (const docSnap of snapshot.docs) {
    const filhaId = docSnap.id;
    filhasIds.push(filhaId);
    
    // Busca recursivamente as filhas desta filha
    const subFilhas = await getUnidadesFilhas(igrejaId, filhaId);
    filhasIds.push(...subFilhas);
  }
  
  return filhasIds;
}

/**
 * Retorna todas as unidades acessíveis baseado no nível de acesso
 * - full: todas as unidades
 * - admin: sua unidade + unidades filhas
 * - user: apenas sua unidade
 */
export async function getUnidadesAcessiveis(
  igrejaId: string, 
  unidadeId: string, 
  nivelAcesso: NivelAcesso
): Promise<string[]> {
  if (!db) throw new Error("Firebase não configurado");
  
  // Full: acesso a todas as unidades
  if (nivelAcesso === "full") {
    const unidadesRef = getUnidadesCollection(igrejaId);
    const snapshot = await getDocs(unidadesRef);
    return snapshot.docs.map(doc => doc.id);
  }
  
  // User: apenas sua unidade
  if (nivelAcesso === "user") {
    return [unidadeId];
  }
  
  // Admin: sua unidade + filhas
  const filhas = await getUnidadesFilhas(igrejaId, unidadeId);
  return [unidadeId, ...filhas];
}

/**
 * Retorna a referência da coleção de visitantes de uma unidade
 */
export function getVisitantesCollection(igrejaId: string, unidadeId: string) {
  if (!db) throw new Error("Firebase não configurado");
  if (!igrejaId) throw new Error("igrejaId é obrigatório");
  if (!unidadeId) throw new Error("unidadeId é obrigatório");
  return collection(db, COLLECTIONS.IGREJAS, igrejaId, COLLECTIONS.UNIDADES, unidadeId, COLLECTIONS.VISITANTES);
}

/**
 * Retorna a referência do documento de um visitante
 */
export function getVisitanteDoc(igrejaId: string, unidadeId: string, visitanteId: string) {
  if (!db) throw new Error("Firebase não configurado");
  if (!igrejaId) throw new Error("igrejaId é obrigatório");
  if (!unidadeId) throw new Error("unidadeId é obrigatório");
  if (!visitanteId) throw new Error("visitanteId é obrigatório");
  return doc(db, COLLECTIONS.IGREJAS, igrejaId, COLLECTIONS.UNIDADES, unidadeId, COLLECTIONS.VISITANTES, visitanteId);
}

/**
 * Carrega todas as unidades com seus dados
 */
export async function carregarTodasUnidades(igrejaId: string): Promise<Unidade[]> {
  if (!db) throw new Error("Firebase não configurado");
  
  const unidadesRef = getUnidadesCollection(igrejaId);
  const snapshot = await getDocs(unidadesRef);
  
  const unidades = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      nome: data.nome || "Sem nome",
      tipo: data.tipo || "sede",
      ...data
    } as Unidade;
  });
  
  return unidades;
}

// ============ FAMÍLIAS ============

/**
 * Retorna a referência da coleção de famílias de uma unidade
 */
export function getFamiliasCollection(igrejaId: string, unidadeId: string) {
  if (!db) throw new Error("Firebase não configurado");
  if (!igrejaId) throw new Error("igrejaId é obrigatório");
  if (!unidadeId) throw new Error("unidadeId é obrigatório");
  return collection(db, COLLECTIONS.IGREJAS, igrejaId, COLLECTIONS.UNIDADES, unidadeId, COLLECTIONS.FAMILIAS);
}

/**
 * Retorna a referência do documento de uma família
 */
export function getFamiliaDoc(igrejaId: string, unidadeId: string, familiaId: string) {
  if (!db) throw new Error("Firebase não configurado");
  if (!igrejaId) throw new Error("igrejaId é obrigatório");
  if (!unidadeId) throw new Error("unidadeId é obrigatório");
  if (!familiaId) throw new Error("familiaId é obrigatório");
  return doc(db, COLLECTIONS.IGREJAS, igrejaId, COLLECTIONS.UNIDADES, unidadeId, COLLECTIONS.FAMILIAS, familiaId);
}


