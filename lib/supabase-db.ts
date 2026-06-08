import { supabase } from "./supabase";
import type { Unidade, NivelAcesso, Usuario, Igreja, RegionalSetor, Membro, Visitante, Grupo } from "./types";

// ============ UNIDADES ============

/**
 * Busca todas as unidades de uma igreja
 */
export async function carregarTodasUnidades(igrejaId: string): Promise<Unidade[]> {
  const { data, error } = await supabase
    .from("unidades")
    .select("*")
    .eq("igreja_id", igrejaId)
    .order("nome", { ascending: true });

  if (error) {
    console.error("Erro ao carregar unidades:", error);
    throw error;
  }

  return (data || []).map(u => ({
    id: u.id,
    igrejaId: u.igreja_id,
    nome: u.nome,
    tipo: u.tipo,
    unidadePaiId: u.unidade_pai_id,
    dirigente: u.dirigente,
    telefone: u.telefone,
    fotoUrl: u.foto_url,
    ehHospedeira: u.eh_hospedeira,
    regionalSetorId: u.regional_setor_id,
    ativa: u.ativa,
    dataCriacao: u.data_criacao,
    endereco: u.cep ? {
      cep: u.cep,
      logradouro: u.logradouro,
      numero: u.numero,
      complemento: u.complemento,
      bairro: u.bairro,
      cidade: u.cidade,
      estado: u.estado
    } : undefined
  })) as unknown as Unidade[];
}

/**
 * Busca todas as unidades filhas (recursivo)
 */
export async function getUnidadesFilhas(igrejaId: string, unidadeId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("unidades")
    .select("id")
    .eq("igreja_id", igrejaId)
    .eq("unidade_pai_id", unidadeId);

  if (error) {
    console.error("Erro ao carregar unidades filhas:", error);
    throw error;
  }

  const filhasIds: string[] = [];
  for (const row of data || []) {
    filhasIds.push(row.id);
    const subFilhas = await getUnidadesFilhas(igrejaId, row.id);
    filhasIds.push(...subFilhas);
  }

  return filhasIds;
}

/**
 * Retorna as unidades acessíveis com base no nível de acesso
 */
export async function getUnidadesAcessiveis(
  igrejaId: string,
  unidadeId: string,
  nivelAcesso: NivelAcesso
): Promise<string[]> {
  if (nivelAcesso === "full") {
    const { data, error } = await supabase
      .from("unidades")
      .select("id")
      .eq("igreja_id", igrejaId);
    if (error) throw error;
    return (data || []).map(u => u.id);
  }

  if (nivelAcesso === "user" || nivelAcesso === "lider") {
    return [unidadeId];
  }

  const filhas = await getUnidadesFilhas(igrejaId, unidadeId);
  return [unidadeId, ...filhas];
}

// ============ IGREJAS ============

/**
 * Carrega os dados de uma única igreja
 */
export async function carregarIgreja(igrejaId: string): Promise<Igreja | null> {
  const { data, error } = await supabase
    .from("igrejas")
    .select("*")
    .eq("id", igrejaId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Não encontrado
    console.error("Erro ao carregar igreja:", error);
    throw error;
  }

  return {
    id: data.id,
    nome: data.nome,
    tipo: "sede", // Sede padrão no frontend
    convencao: data.convencao,
    ministerio: data.ministerio,
    dirigente: data.dirigente,
    telefone: data.telefone,
    email: data.email,
    cnpj: data.cnpj,
    fotoUrl: data.foto_url,
    ativa: data.ativa,
    dataCadastro: data.data_cadastro,
    endereco: data.cep ? {
      cep: data.cep,
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.cidade,
      estado: data.estado
    } : undefined
  } as unknown as Igreja;
}

/**
 * Carrega todas as igrejas ativas
 */
export async function carregarTodasIgrejas(): Promise<Igreja[]> {
  const { data, error } = await supabase
    .from("igrejas")
    .select("*")
    .eq("ativa", true)
    .order("nome", { ascending: true });

  if (error) {
    console.error("Erro ao carregar igrejas:", error);
    throw error;
  }

  return (data || []).map(i => ({
    id: i.id,
    nome: i.nome,
    tipo: "sede",
    convencao: i.convencao,
    ministerio: i.ministerio,
    dirigente: i.dirigente,
    telefone: i.telefone,
    email: i.email,
    cnpj: i.cnpj,
    fotoUrl: i.foto_url,
    ativa: i.ativa,
    dataCadastro: i.data_cadastro,
    endereco: i.cep ? {
      cep: i.cep,
      logradouro: i.logradouro,
      numero: i.numero,
      complemento: i.complemento,
      bairro: i.bairro,
      cidade: i.cidade,
      estado: i.estado
    } : undefined
  })) as unknown as Igreja[];
}

// ============ REGIONAIS / SETORES ============

/**
 * Carrega todas as regionais/setores de uma igreja
 */
export async function carregarRegionaisSetores(igrejaId: string): Promise<RegionalSetor[]> {
  const { data, error } = await supabase
    .from("regionais_setores")
    .select("*")
    .eq("igreja_id", igrejaId)
    .order("numero", { ascending: true });

  if (error) {
    console.error("Erro ao carregar regionais/setores:", error);
    throw error;
  }

  return (data || []).map(r => ({
    id: r.id,
    tipo: r.tipo,
    numero: r.numero,
    nome: r.nome,
    hospedeiraId: r.hospedeira_id,
    dirigente: r.dirigente,
    dataCriacao: r.data_criacao
  })) as unknown as RegionalSetor[];
}
