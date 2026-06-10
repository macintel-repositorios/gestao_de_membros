"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Printer,
  Church,
  Users,
  Home,
  UsersRound,
  UserPlus,
  Building2,
  Cake,
  TrendingUp,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Membro,
  TipoMembro,
  CargoMembro,
  TIPOS_MEMBRO,
  CARGOS_MEMBRO,
  Unidade,
  TIPOS_UNIDADE,
  Grupo,
  TIPOS_GRUPO,
} from "@/lib/types";

interface FamiliaRelatorio {
  id: string;
  nome: string;
  responsavel1Nome: string;
  responsavel2Nome?: string;
  dependentesCount: number;
  unidadeId: string;
}

interface VisitanteRelatorio {
  id: string;
  nome: string;
  telefone: string;
  dataVisita: Date;
  status: string;
  unidadeId: string;
}

type TipoRelatorio = "consolidado" | "membros" | "familias" | "grupos" | "visitantes" | "aniversariantes";

// Helper to parse date string without timezone shift (created in local timezone)
const parseLocalDate = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
};

export default function RelatorioGeralPage() {
  const { igrejaId, unidadesAcessiveis, todasUnidades, igrejaNome, usuario } = useAuth();
  const [loading, setLoading] = useState(true);

  // Dados carregados
  const [membros, setMembros] = useState<Membro[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [familias, setFamilias] = useState<FamiliaRelatorio[]>([]);
  const [visitantes, setVisitantes] = useState<VisitanteRelatorio[]>([]);

  // Filtros
  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>("consolidado");
  const [filterUnidade, setFilterUnidade] = useState<string>("todos");
  const [filterMonth, setFilterMonth] = useState<string>("todos");

  const loadData = async () => {
    if (!igrejaId || unidadesAcessiveis.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Membros
      const { data: membrosData, error: membrosErr } = await supabase
        .from("membros")
        .select("*")
        .eq("igreja_id", igrejaId)
        .in("unidade_id", unidadesAcessiveis)
        .eq("ativo", true);
      
      if (membrosErr) throw membrosErr;

      const listMembros: Membro[] = (membrosData || []).map((row) => ({
        id: row.id,
        nome: row.nome,
        telefone: row.telefone || "",
        email: row.email,
        sexo: row.sexo,
        fotoUrl: row.foto_url,
        endereco: row.endereco,
        coordenadas: row.coordenadas,
        tipo: row.tipo as TipoMembro,
        cargo: row.cargo as CargoMembro,
        cargoDescricao: row.cargo_descricao || "",
        unidadeId: row.unidade_id,
        dataCadastro: row.data_cadastro ? { toDate: () => new Date(row.data_cadastro) } : { toDate: () => new Date() },
        dataNascimento: row.data_nascimento ? { toDate: () => parseLocalDate(row.data_nascimento) } : undefined,
        dataBatismo: row.data_batismo ? { toDate: () => parseLocalDate(row.data_batismo) } : undefined,
        ativo: row.ativo,
        criadoPor: row.criado_por || "",
      }));

      const membrosMap = new Map<string, string>();
      listMembros.forEach((m) => membrosMap.set(m.id, m.nome));

      // 2. Grupos
      const { data: gruposData, error: gruposErr } = await supabase
        .from("grupos")
        .select("*")
        .eq("igreja_id", igrejaId)
        .in("unidade_id", unidadesAcessiveis)
        .eq("ativo", true);

      if (gruposErr) throw gruposErr;

      const listGrupos: Grupo[] = (gruposData || []).map((row) => ({
        id: row.id,
        nome: row.nome,
        tipo: row.tipo,
        liderUid: row.lider_uid,
        liderNome: row.lider_uid ? (membrosMap.get(row.lider_uid) || "Líder") : "Não informado",
        membrosIds: Array.isArray(row.membros_ids) ? row.membros_ids : [],
        linkWhatsApp: row.link_whatsapp || "",
        dataCriacao: row.data_criacao ? { toDate: () => new Date(row.data_criacao) } : { toDate: () => new Date() },
        ativo: row.ativo,
      }));

      // 3. Famílias
      const { data: familiasData, error: familiasErr } = await supabase
        .from("familias")
        .select("*")
        .eq("igreja_id", igrejaId)
        .in("unidade_id", unidadesAcessiveis)
        .eq("ativo", true);

      if (familiasErr) throw familiasErr;

      const listFamilias: FamiliaRelatorio[] = (familiasData || []).map((row) => ({
        id: row.id,
        nome: row.nome,
        responsavel1Nome: membrosMap.get(row.responsavel_1_id) || "Não encontrado",
        responsavel2Nome: row.responsavel_2_id ? (membrosMap.get(row.responsavel_2_id) || "Não encontrado") : undefined,
        dependentesCount: Array.isArray(row.dependentes) ? row.dependentes.length : 0,
        unidadeId: row.unidade_id,
      }));

      // 4. Visitantes
      const { data: visitantesData, error: visitantesErr } = await supabase
        .from("visitantes")
        .select("*")
        .eq("igreja_id", igrejaId)
        .in("unidade_id", unidadesAcessiveis);

      if (visitantesErr) throw visitantesErr;

      const listVisitantes: VisitanteRelatorio[] = (visitantesData || []).map((row) => ({
        id: row.id,
        nome: row.nome,
        telefone: row.telefone || "",
        dataVisita: row.data_visita ? parseLocalDate(row.data_visita) : new Date(),
        status: row.status || "ativo",
        unidadeId: row.unidade_id,
      }));

      setMembros(listMembros);
      setGrupos(listGrupos);
      setFamilias(listFamilias);
      setVisitantes(listVisitantes);
    } catch (err) {
      console.error("Erro ao carregar dados do relatório:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [igrejaId]);

  const getUnidadeNome = (id: string): string => {
    const un = todasUnidades.find((u) => u.id === id);
    return un?.nome || "Não definida";
  };

  // Filtragem
  const filteredMembros = useMemo(() => {
    return membros.filter((m) => filterUnidade === "todos" || m.unidadeId === filterUnidade);
  }, [membros, filterUnidade]);

  const filteredGrupos = useMemo(() => {
    return grupos.filter((g) => {
      if (filterUnidade === "todos") return true;
      const lider = membros.find((m) => m.id === g.liderUid);
      return lider?.unidadeId === filterUnidade;
    });
  }, [grupos, membros, filterUnidade]);

  const filteredFamilias = useMemo(() => {
    return familias.filter((f) => filterUnidade === "todos" || f.unidadeId === filterUnidade);
  }, [familias, filterUnidade]);

  const filteredVisitantes = useMemo(() => {
    return visitantes.filter((v) => filterUnidade === "todos" || v.unidadeId === filterUnidade);
  }, [visitantes, filterUnidade]);

  const filteredAniversariantes = useMemo(() => {
    return membros.filter((m) => {
      if (!m.dataNascimento) return false;
      const birthMonth = m.dataNascimento.toDate().getMonth() + 1;
      const matchesMonth = filterMonth === "todos" || birthMonth.toString() === filterMonth;
      const matchesUnidade = filterUnidade === "todos" || m.unidadeId === filterUnidade;
      return matchesMonth && matchesUnidade;
    });
  }, [membros, filterMonth, filterUnidade]);

  const stats = useMemo(() => {
    return {
      totalMembros: filteredMembros.length,
      obreiros: filteredMembros.filter((m) => m.tipo === "obreiro").length,
      lideres: filteredMembros.filter((m) => m.tipo === "lider").length,
      congregados: filteredMembros.filter((m) => m.tipo === "congregado").length,
      membrosComuns: filteredMembros.filter((m) => m.tipo === "membro").length,
      totalFamilias: filteredFamilias.length,
      totalGrupos: filteredGrupos.length,
      totalVisitantes: filteredVisitantes.length,
    };
  }, [filteredMembros, filteredFamilias, filteredGrupos, filteredVisitantes]);

  const handlePrint = () => {
    window.print();
  };

  const getMesNome = (mVal: string) => {
    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const idx = parseInt(mVal) - 1;
    return meses[idx] || "Todos os Meses";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* CSS CSS otimizado para gerar folha de papel limpa */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            font-family: serif !important;
          }
          aside, nav, header, footer, button, .no-print {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .print-sheet {
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            color: black !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .print-table th {
            background-color: #f3f4f6 !important;
            color: black !important;
            border-bottom: 2px solid #000 !important;
          }
          .print-table td, .print-table th {
            padding: 6px 10px !important;
            border-bottom: 1px solid #ddd !important;
            font-size: 10pt !important;
          }
        }
      `}</style>

      {/* Header (No print) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios de Impressão</h1>
          <p className="text-muted-foreground">
            Selecione o tipo de listagem e aplique filtros para gerar uma folha timbrada limpa para impressão.
          </p>
        </div>
        <Button onClick={handlePrint} className="shrink-0 bg-primary hover:bg-primary/95 text-white">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir / Salvar PDF
        </Button>
      </div>

      {/* Control Panel (No print) */}
      <Card className="no-print">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Configurações do Relatório Geral
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="tipoRelatorio">Selecione o Relatório</Label>
            <Select value={tipoRelatorio} onValueChange={(v) => setTipoRelatorio(v as TipoRelatorio)}>
              <SelectTrigger id="tipoRelatorio">
                <SelectValue placeholder="Selecione o Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consolidado">Visão Geral Consolidada</SelectItem>
                <SelectItem value="membros">Relação de Membros e Obreiros</SelectItem>
                <SelectItem value="familias">Mapeamento de Famílias</SelectItem>
                <SelectItem value="grupos">Grupos e Células</SelectItem>
                <SelectItem value="visitantes">Visitantes Cadastrados</SelectItem>
                <SelectItem value="aniversariantes">Lista de Aniversariantes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="unidadeFiltro">Congregação / Unidade</Label>
            <Select value={filterUnidade} onValueChange={setFilterUnidade}>
              <SelectTrigger id="unidadeFiltro">
                <SelectValue placeholder="Selecione a Congregação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as Congregações</SelectItem>
                {todasUnidades.filter(u => unidadesAcessiveis.includes(u.id)).map((un) => (
                  <SelectItem key={un.id} value={un.id}>
                    {un.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tipoRelatorio === "aniversariantes" && (
            <div className="space-y-1.5">
              <Label htmlFor="monthFiltro">Mês de Aniversário</Label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger id="monthFiltro">
                  <SelectValue placeholder="Selecione o Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os meses</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => (i + 1).toString()).map((m) => (
                    <SelectItem key={m} value={m}>
                      {getMesNome(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- FOLHA DE IMPRESSÃO (PREVIEW EM TELA / FULL PRINT) --- */}
      <Card className="print-sheet max-w-[210mm] mx-auto bg-white text-black p-8 sm:p-12 shadow-md border border-slate-200">
        
        {/* Cabecalho Timbrado Formal */}
        <div className="flex flex-col items-center text-center border-b-2 border-black pb-4 mb-6">
          <Church className="h-10 w-10 text-black mb-1" />
          <h2 className="text-xl font-bold uppercase tracking-wider">{igrejaNome || "Ministério Geral da Igreja"}</h2>
          <p className="text-xs font-semibold text-slate-700 tracking-wide mt-0.5">Relatório Oficial de Secretaria Eclesiástica</p>
          <div className="flex gap-4 mt-2 text-[10px] text-slate-600 font-mono">
            <span>Congregação: {filterUnidade === "todos" ? "Geral/Todas" : getUnidadeNome(filterUnidade)}</span>
            {tipoRelatorio === "aniversariantes" && <span>Mês: {getMesNome(filterMonth)}</span>}
            <span>Emissão: {format(new Date(), "dd/MM/yyyy")}</span>
          </div>
        </div>

        {/* Nome do Relatório Ativo */}
        <div className="mb-6">
          <h3 className="text-base font-bold uppercase tracking-wide border-l-4 border-black pl-2">
            {tipoRelatorio === "consolidado" && "Visão Geral Consolidada do Ministério"}
            {tipoRelatorio === "membros" && "Relação Oficial de Membros e Obreiros"}
            {tipoRelatorio === "familias" && "Mapeamento das Famílias e Dependentes"}
            {tipoRelatorio === "grupos" && "Grupos Eclesiásticos e Células Ativas"}
            {tipoRelatorio === "visitantes" && "Lista de Visitantes e Novos Contatos"}
            {tipoRelatorio === "aniversariantes" && `Aniversariantes do Período: ${getMesNome(filterMonth)}`}
          </h3>
        </div>

        {/* CONTEÚDO DINÂMICO CONFORME O RELATÓRIO ESCOLHIDO */}

        {/* 1. CONSOLIDADO */}
        {tipoRelatorio === "consolidado" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="border p-3 rounded text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Membros</span>
                <span className="text-2xl font-extrabold">{stats.totalMembros}</span>
              </div>
              <div className="border p-3 rounded text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Famílias</span>
                <span className="text-2xl font-extrabold">{stats.totalFamilias}</span>
              </div>
              <div className="border p-3 rounded text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Grupos</span>
                <span className="text-2xl font-extrabold">{stats.totalGrupos}</span>
              </div>
              <div className="border p-3 rounded text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Visitantes</span>
                <span className="text-2xl font-extrabold">{stats.totalVisitantes}</span>
              </div>
            </div>

            <div className="border rounded p-4 mt-6">
              <h4 className="font-bold text-sm mb-3 uppercase">Detalhamento de Membresia</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-600">Obreiros Cadastrados:</span>
                  <span className="font-bold">{stats.obreiros}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-600">Líderes de Setor/Grupos:</span>
                  <span className="font-bold">{stats.lideres}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-600">Membros Comuns:</span>
                  <span className="font-bold">{stats.membrosComuns}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-600">Congregados:</span>
                  <span className="font-bold">{stats.congregados}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. MEMBROS */}
        {tipoRelatorio === "membros" && (
          <div className="overflow-x-auto">
            <Table className="print-table w-full border-collapse">
              <TableHeader>
                <TableRow className="border-b border-black">
                  <TableHead className="text-left font-bold">Nome Completo</TableHead>
                  <TableHead className="text-left font-bold">Tipo</TableHead>
                  <TableHead className="text-left font-bold">Cargo</TableHead>
                  <TableHead className="text-left font-bold">Unidade</TableHead>
                  <TableHead className="text-left font-bold">Telefone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembros.map((m) => (
                  <TableRow key={m.id} className="border-b">
                    <TableCell className="font-semibold">{m.nome}</TableCell>
                    <TableCell>{TIPOS_MEMBRO[m.tipo]}</TableCell>
                    <TableCell>
                      {m.cargo ? (m.cargo === "outro" ? m.cargoDescricao : CARGOS_MEMBRO[m.cargo]) : "Membro"}
                    </TableCell>
                    <TableCell>{getUnidadeNome(m.unidadeId)}</TableCell>
                    <TableCell>{m.telefone || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 3. FAMILIAS */}
        {tipoRelatorio === "familias" && (
          <div className="overflow-x-auto">
            <Table className="print-table w-full border-collapse">
              <TableHeader>
                <TableRow className="border-b border-black">
                  <TableHead className="text-left font-bold">Família</TableHead>
                  <TableHead className="text-left font-bold">Responsável 1</TableHead>
                  <TableHead className="text-left font-bold">Responsável 2</TableHead>
                  <TableHead className="text-left font-bold">Unidade</TableHead>
                  <TableHead className="text-right font-bold">Dependentes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFamilias.map((f) => (
                  <TableRow key={f.id} className="border-b">
                    <TableCell className="font-semibold">{f.nome}</TableCell>
                    <TableCell>{f.responsavel1Nome}</TableCell>
                    <TableCell>{f.responsavel2Nome || "-"}</TableCell>
                    <TableCell>{getUnidadeNome(f.unidadeId)}</TableCell>
                    <TableCell className="text-right font-bold">{f.dependentesCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 4. GRUPOS */}
        {tipoRelatorio === "grupos" && (
          <div className="overflow-x-auto">
            <Table className="print-table w-full border-collapse">
              <TableHeader>
                <TableRow className="border-b border-black">
                  <TableHead className="text-left font-bold">Nome do Grupo</TableHead>
                  <TableHead className="text-left font-bold">Tipo</TableHead>
                  <TableHead className="text-left font-bold">Líder</TableHead>
                  <TableHead className="text-right font-bold">Integrantes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGrupos.map((g) => (
                  <TableRow key={g.id} className="border-b">
                    <TableCell className="font-semibold">{g.nome}</TableCell>
                    <TableCell>{TIPOS_GRUPO[g.tipo] || "Estudo"}</TableCell>
                    <TableCell>{g.liderNome}</TableCell>
                    <TableCell className="text-right font-bold">{g.membrosIds.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 5. VISITANTES */}
        {tipoRelatorio === "visitantes" && (
          <div className="overflow-x-auto">
            <Table className="print-table w-full border-collapse">
              <TableHeader>
                <TableRow className="border-b border-black">
                  <TableHead className="text-left font-bold">Nome</TableHead>
                  <TableHead className="text-left font-bold">Telefone</TableHead>
                  <TableHead className="text-left font-bold">Data de Visita</TableHead>
                  <TableHead className="text-left font-bold">Unidade</TableHead>
                  <TableHead className="text-right font-bold">Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisitantes.map((v) => (
                  <TableRow key={v.id} className="border-b">
                    <TableCell className="font-semibold">{v.nome}</TableCell>
                    <TableCell>{v.telefone || "-"}</TableCell>
                    <TableCell>{format(v.dataVisita, "dd/MM/yyyy")}</TableCell>
                    <TableCell>{getUnidadeNome(v.unidadeId)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {v.status === "convertido" ? "Decidido" : v.status === "inativo" ? "Afastado" : "Visitando"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 6. ANIVERSARIANTES */}
        {tipoRelatorio === "aniversariantes" && (
          <div className="overflow-x-auto">
            <Table className="print-table w-full border-collapse">
              <TableHeader>
                <TableRow className="border-b border-black">
                  <TableHead className="text-left font-bold">Dia / Mês</TableHead>
                  <TableHead className="text-left font-bold">Nome Completo</TableHead>
                  <TableHead className="text-left font-bold">Idade</TableHead>
                  <TableHead className="text-left font-bold">Unidade</TableHead>
                  <TableHead className="text-left font-bold">Telefone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAniversariantes
                  .sort((a, b) => {
                    const dayA = a.dataNascimento?.toDate().getDate() || 0;
                    const dayB = b.dataNascimento?.toDate().getDate() || 0;
                    return dayA - dayB;
                  })
                  .map((m) => {
                    const birth = m.dataNascimento?.toDate();
                    const day = birth ? birth.getDate() : "-";
                    const month = birth ? format(birth, "MMMM", { locale: ptBR }) : "";
                    const age = birth ? new Date().getFullYear() - birth.getFullYear() : "-";

                    return (
                      <TableRow key={m.id} className="border-b">
                        <TableCell className="font-bold">{day} / {month.slice(0, 3)}</TableCell>
                        <TableCell className="font-semibold">{m.nome}</TableCell>
                        <TableCell>{age} anos</TableCell>
                        <TableCell>{getUnidadeNome(m.unidadeId)}</TableCell>
                        <TableCell>{m.telefone || "-"}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Footer Timbrado Formal */}
        <div className="mt-12 pt-4 border-t border-dashed border-slate-400 text-center text-[10px] text-slate-500 font-mono">
          <span>Fim do Relatório Oficial - Gerado eletronicamente pelo Sistema de Gestão de Membros.</span>
        </div>
      </Card>
    </div>
  );
}
