import { Timestamp } from "firebase/firestore";

export type TipoMembro = "visitante" | "congregado" | "membro" | "obreiro" | "lider";

export type Sexo = "masculino" | "feminino";

export type EstadoCivil = "solteiro" | "casado" | "amasiado" | "divorciado" | "viuvo";

export type CargoMembro =
  | "pastor"
  | "evangelista"
  | "presbitero"
  | "diacono"
  | "auxiliar_escala"
  | "outro";

// Departamentos/Ministérios da igreja
export type Departamento =
  | "louvor"
  | "infantil"
  | "jovens"
  | "mulheres"
  | "homens"
  | "casais"
  | "missoes"
  | "ensino"
  | "diaconia"
  | "recepcao"
  | "midia"
  | "intercessao"
  | "evangelismo"
  | "outro";

// Funções que o membro pode exercer
export type FuncaoIgreja =
  | "musico"
  | "cantor"
  | "sonoplasta"
  | "projetista"
  | "recepcionista"
  | "porteiro"
  | "tesoureiro"
  | "secretario"
  | "professor_ebd"
  | "lider_celula"
  | "lider_departamento"
  | "coordenador"
  | "outro";

// Níveis de acesso hierárquicos
// - full: acesso total ao sistema (todas as unidades)
// - admin: acesso à sua unidade + unidades filhas
// - user: acesso apenas à sua unidade
export type NivelAcesso = "full" | "admin" | "lider" | "user";

// Tipos de unidade na hierarquia
export type TipoUnidade = "sede" | "congregacao" | "subcongregacao";

// Tipos de igreja
export type TipoIgreja = "sede" | "congregacao" | "subcongregacao" | "missao" | "outro";

export type TipoGrupo = "estudo" | "visita" | "acompanhamento";

export type TipoAcompanhamento = 
  | "visita_residencial"
  | "visita_hospitalar"
  | "culto_no_lar"
  | "aconselhamento";

export interface DadosHospital {
  nomeHospital: string;
  enderecoHospital: string;
  telefoneHospital?: string;
  quartoLeito?: string;
  horarioVisita?: string;
  previsaoAlta?: Timestamp;
}

export interface Endereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface Igreja {
  id: string;
  nome: string;
  tipo: TipoIgreja;
  codIgreja?: string;
  convencao?: string; // Convenção/Denominação (herdada da sede para filhas)
  sede?: string; // Sede/Ministério principal
  ministerio?: string;
  igrejaPaiId?: string; // ID da igreja pai (para congregações/subcongregações)
  sedeId?: string; // ID da sede raiz (para congregações e subcongregações)
  endereco?: Endereco;
  coordenadas?: Coordenadas;
  dirigente?: string;
  fotoUrl?: string;
  telefone?: string;
  email?: string;
  cnpj?: string;
  dataCadastro?: Timestamp;
  atualizadoPor?: string;
  dataAtualizacao?: Timestamp;
  ativa?: boolean;
}

// Unidade hierárquica (Sede > Congregação > Subcongregação)
export interface Unidade {
  id: string;
  nome: string;
  tipo: TipoUnidade;
  unidadePaiId?: string; // ID da unidade pai (null para sede)
  endereco?: Endereco;
  coordenadas?: Coordenadas;
  dirigente?: string;
  telefone?: string;
  ativa: boolean;
  dataCriacao: Timestamp;
  fotoUrl?: string;
  // Campos de Regional / Setor
  ehHospedeira?: boolean;
  hospedaRegionalId?: string | null;
  regionalSetorId?: string | null;
}

export interface RegionalSetor {
  id: string;
  tipo: "regional" | "setor";
  numero: number;
  nome: string;
  hospedeiraId: string; // ID da unidade (igreja) hospedeira
  dirigente?: string;
  igrejasMembrosIds?: string[]; // congregações/subcongregações associadas
  dataCriacao: Timestamp;
}



export interface Usuario {
  uid: string;
  telefone: string;
  nome: string;
  nivelAcesso: NivelAcesso;
  membroId?: string;
  grupoId?: string; // ID do grupo que o líder gerencia
  igrejaId: string; // ID da igreja (multi-tenant)
  unidadeId: string; // ID da unidade do usuário
  ativo: boolean;
  dataCriacao: Timestamp;
}

export interface Grupo {
  id: string;
  nome: string;
  tipo: TipoGrupo;
  liderUid: string;
  liderNome?: string;
  membrosIds: string[];
  linkWhatsApp?: string;
  dataCriacao: Timestamp;
  ativo: boolean;
}

export interface Membro {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  sexo?: Sexo;
  fotoUrl?: string;
  endereco: Endereco;
  coordenadas: Coordenadas;
  tipo: TipoMembro;
  cargo?: CargoMembro;
  cargoDescricao?: string;
  // Estado civil e cônjuge
  estadoCivil?: EstadoCivil;
  nomeConjuge?: string;
  conjugeId?: string; // ID do cônjuge se também for membro
  // Campos para funções e departamentos
  temFuncaoIgreja?: boolean;
  funcoes?: FuncaoIgreja[];
  funcaoDescricao?: string;
  departamentos?: Departamento[];
  departamentoDescricao?: string;
  ehLider?: boolean;
  liderDe?: string; // Descrição do que lidera
  grupoId?: string; // Grupo ao qual o membro pertence
  unidadeId: string; // ID da unidade do membro
  dataCadastro: Timestamp;
  dataNascimento?: Timestamp;
  dataConversao?: Timestamp;
  dataBatismo?: Timestamp;
  observacoes?: string;
  ativo: boolean;
  criadoPor: string;
}

export interface Acompanhamento {
  id: string;
  membroId: string;
  membroNome: string;
  membroFotoUrl?: string;
  tipo: TipoAcompanhamento;
  data: Timestamp;
  responsavelUid: string;
  responsavelNome: string;
  descricao: string;
  dadosHospital?: DadosHospital;
  proximoContato?: Timestamp;
  observacoes?: string;
  dataCriacao: Timestamp;
}

// Labels for display
export const TIPOS_MEMBRO: Record<TipoMembro, string> = {
  visitante: "Visitante",
  congregado: "Congregado",
  membro: "Membro",
  obreiro: "Obreiro",
  lider: "Líder",
};

export const SEXOS: Record<Sexo, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
};

export const ESTADOS_CIVIS: Record<EstadoCivil, string> = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  amasiado: "Amasiado(a)",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
};

export const CARGOS_MEMBRO: Record<CargoMembro, string> = {
  pastor: "Pastor",
  evangelista: "Evangelista",
  presbitero: "Presbítero",
  diacono: "Diácono(iza)",
  auxiliar_escala: "Auxiliar de Escala",
  outro: "Outro",
};

export const DEPARTAMENTOS: Record<Departamento, string> = {
  louvor: "Louvor/Música",
  infantil: "Infantil",
  jovens: "Jovens",
  mulheres: "Mulheres",
  homens: "Homens",
  casais: "Casais",
  missoes: "Missões",
  ensino: "Ensino/EBD",
  diaconia: "Diaconia/Assistência Social",
  recepcao: "Recepção",
  midia: "Mídia/Comunicação",
  intercessao: "Intercessão",
  evangelismo: "Evangelismo",
  outro: "Outro",
};

export const FUNCOES_IGREJA: Record<FuncaoIgreja, string> = {
  musico: "Músico/Instrumentista",
  cantor: "Cantor(a)",
  sonoplasta: "Sonoplasta",
  projetista: "Projetista/Mídia",
  recepcionista: "Recepcionista",
  porteiro: "Porteiro",
  tesoureiro: "Tesoureiro",
  secretario: "Secretário(a)",
  professor_ebd: "Professor(a) EBD",
  lider_celula: "Líder de Célula/Grupo",
  lider_departamento: "Líder de Departamento",
  coordenador: "Coordenador(a)",
  outro: "Outra Função",
};

export const NIVEIS_ACESSO: Record<NivelAcesso, string> = {
  full: "Acesso Total",
  admin: "Administrador",
  lider: "Líder",
  user: "Usuário",
};

export const TIPOS_UNIDADE: Record<TipoUnidade, string> = {
  sede: "Sede",
  congregacao: "Congregação",
  subcongregacao: "Subcongregação",
};

export const TIPOS_IGREJA: Record<TipoIgreja, string> = {
  sede: "Igreja Sede",
  congregacao: "Congregação",
  subcongregacao: "Subcongregação",
  missao: "Campo Missionário",
  outro: "Outro",
};

export const TIPOS_GRUPO: Record<TipoGrupo, string> = {
  estudo: "Estudo Bíblico",
  visita: "Visitas",
  acompanhamento: "Acompanhamento",
};

export const TIPOS_ACOMPANHAMENTO: Record<TipoAcompanhamento, string> = {
  visita_residencial: "Visita Residencial",
  visita_hospitalar: "Visita Hospitalar",
  culto_no_lar: "Culto no Lar",
  aconselhamento: "Aconselhamento",
};

export const CORES_ACOMPANHAMENTO: Record<TipoAcompanhamento, string> = {
  visita_residencial: "#22c55e", // green
  visita_hospitalar: "#ef4444", // red
  culto_no_lar: "#8b5cf6", // violet
  aconselhamento: "#f59e0b", // amber
};

// Colors for map markers
export const CORES_TIPO: Record<TipoMembro, string> = {
  visitante: "#94a3b8", // slate
  congregado: "#60a5fa", // blue
  membro: "#34d399", // green
  obreiro: "#fbbf24", // amber
  lider: "#f472b6", // pink
};

export const CORES_CARGO: Record<CargoMembro, string> = {
  pastor: "#ef4444", // red
  evangelista: "#f97316", // orange
  presbitero: "#8b5cf6", // violet
  diacono: "#06b6d4", // cyan
  auxiliar_escala: "#84cc16", // lime
  outro: "#6b7280", // gray
};

// ============ FAMÍLIAS ============

export type Parentesco = 
  | "filho"
  | "filha"
  | "enteado"
  | "enteada"
  | "neto"
  | "neta"
  | "sobrinho"
  | "sobrinha"
  | "outro";

export interface Dependente {
  id: string;
  nome: string;
  dataNascimento?: Timestamp;
  sexo?: Sexo;
  parentesco: Parentesco;
  membroVinculadoId?: string; // Se vinculado a um membro existente
  membroVinculadoNome?: string;
}

export interface Familia {
  id: string;
  nome: string; // Nome da família (ex: "Família Silva Santos")
  responsavel1Id: string; // ID do membro responsável 1
  responsavel1Nome: string;
  responsavel2Id?: string; // ID do membro responsável 2 (opcional)
  responsavel2Nome?: string;
  dependentes: Dependente[];
  observacoes?: string;
  unidadeId: string;
  dataCriacao: Timestamp;
  dataAtualizacao?: Timestamp;
  criadoPor: string;
  ativo: boolean;
}

export const PARENTESCOS: Record<Parentesco, string> = {
  filho: "Filho",
  filha: "Filha",
  enteado: "Enteado",
  enteada: "Enteada",
  neto: "Neto",
  neta: "Neta",
  sobrinho: "Sobrinho",
  sobrinha: "Sobrinha",
  outro: "Outro",
};

// ============ VISITANTES ============

export interface Acompanhante {
  nome: string;
  telefone: string;
  dataNascimento?: Timestamp;
  parentesco?: string;
}

export interface Visitante {
  id: string;
  nome: string;
  telefone: string;
  dataNascimento?: Timestamp;
  dataVisita: Timestamp;
  acompanhantes?: Acompanhante[];
  jaRecebeuJesus?: boolean;
  pertenceIgreja?: boolean;
  qualIgreja?: string;
  primeiraVisita?: boolean;
  convidadoPor?: string;
  pedidoOracao?: string;
  observacoes?: string;
  unidadeId: string;
  convertidoParaMembro?: boolean;
  membroId?: string; // ID do membro se foi convertido
  ativo: boolean;
  dataCriacao: Timestamp;
  criadoPor?: string;
}
