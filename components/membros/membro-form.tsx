"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Search, MapPin, CalendarIcon, UserPlus, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Membro,
  TipoMembro,
  CargoMembro,
  Departamento,
  FuncaoIgreja,
  EstadoCivil,
  Sexo,
  TIPOS_MEMBRO,
  CARGOS_MEMBRO,
  DEPARTAMENTOS,
  FUNCOES_IGREJA,
  TIPOS_UNIDADE,
  ESTADOS_CIVIS,
  SEXOS,
} from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FotoUpload } from "./foto-upload";

const membroSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  telefone: z.string().min(10, "Telefone inválido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  sexo: z.enum(["masculino", "feminino"]).nullable().optional(),
  dataNascimento: z.date().optional(),
  tipo: z.enum(["visitante", "congregado", "membro", "obreiro", "lider"]),
  cargo: z
    .enum(["pastor", "evangelista", "presbitero", "diacono", "auxiliar_escala", "outro"])
    .nullable()
    .optional(),
  cargoDescricao: z.string().optional(),
  // Estado civil e cônjuge
  estadoCivil: z.enum(["solteiro", "casado", "amasiado", "divorciado", "viuvo"]).nullable().optional(),
  nomeConjuge: z.string().optional(),
  conjugeEhMembro: z.boolean().optional(),
  conjugeIdSelecionado: z.string().optional(),
  adicionarNovoConjuge: z.boolean().optional(),
  telefoneConjuge: z.string().optional(),
  emailConjuge: z.string().email("Email inválido").optional().or(z.literal("")),
  sexoConjuge: z.enum(["masculino", "feminino"]).nullable().optional(),
  tipoConjuge: z.enum(["visitante", "congregado", "membro", "obreiro", "lider"]).optional(),
  cargoConjuge: z.enum(["pastor", "evangelista", "presbitero", "diacono", "auxiliar_escala", "outro"]).nullable().optional(),
  dataNascimentoConjuge: z.date().optional(),
  // Campos para funções e departamentos
  temFuncaoIgreja: z.boolean().optional(),
  funcoes: z.array(z.enum(["musico", "cantor", "sonoplasta", "projetista", "recepcionista", "porteiro", "tesoureiro", "secretario", "professor_ebd", "lider_celula", "lider_departamento", "coordenador", "outro"])).optional(),
  funcaoDescricao: z.string().optional(),
  departamentos: z.array(z.enum(["louvor", "infantil", "jovens", "mulheres", "homens", "casais", "missoes", "ensino", "diaconia", "recepcao", "midia", "intercessao", "evangelismo", "outro"])).optional(),
  departamentoDescricao: z.string().optional(),
  ehLider: z.boolean().optional(),
  liderDe: z.string().optional(),
  // Endereço
  cep: z.string().min(8, "CEP inválido"),
  logradouro: z.string().min(3, "Logradouro inválido"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(2, "Bairro inválido"),
  cidade: z.string().min(2, "Cidade inválida"),
  estado: z.string().length(2, "Estado inválido"),
  observacoes: z.string().optional(),
});

type MembroFormData = z.infer<typeof membroSchema>;

interface MembroFormProps {
  membro?: Membro;
  unidadeIdParam?: string; // Para edição, passa a unidade do membro
  onSuccess?: () => void;
}

export const MembroForm = forwardRef(function MembroForm({ membro, unidadeIdParam, onSuccess }: MembroFormProps, ref) {
  const router = useRouter();
  const { user, igrejaId, unidadeId, unidadesAcessiveis, todasUnidades, temAcessoTotal, loading: authLoading } = useAuth();
  // Unidades disponíveis para seleção
  const unidadesDisponiveis = todasUnidades.filter(u => 
    unidadesAcessiveis.includes(u.id)
  );
  
  // Se só há 1 unidade, usa ela automaticamente
  const defaultUnidadeId = unidadeIdParam || membro?.unidadeId || unidadeId || 
    (unidadesDisponiveis.length === 1 ? unidadesDisponiveis[0]?.id : "") || "";
  
  const [selectedUnidadeId, setSelectedUnidadeId] = useState<string>(defaultUnidadeId);

  useImperativeHandle(ref, () => ({
    isDirty: () => form.formState.isDirty,
    submitForm: async () => {
      const isValid = await form.trigger();
      if (!isValid) return false;
      
      try {
        const values = form.getValues();
        await onSubmit(values);
        return true;
      } catch (error) {
        console.error("Erro no autosave:", error);
        return false;
      }
    }
  }));
  
  // Atualiza selectedUnidadeId quando unidades disponíveis carregarem
  useEffect(() => {
    if (!selectedUnidadeId && unidadesDisponiveis.length >= 1) {
      setSelectedUnidadeId(unidadesDisponiveis[0].id);
    }
  }, [unidadesDisponiveis, selectedUnidadeId]);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(membro ? null : "dados");
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lng: number } | null>(
    membro?.coordenadas || null
  );
  const [fotoBase64, setFotoBase64] = useState<string | null>(membro?.fotoUrl || null);

  // Lista de membros para seleção de cônjuge
  const [membrosLista, setMembrosLista] = useState<Pick<Membro, 'id' | 'nome' | 'telefone' | 'sexo'>[]>([]);
  const [loadingMembros, setLoadingMembros] = useState(false);

  const form = useForm<MembroFormData>({
    resolver: zodResolver(membroSchema),
    mode: "onSubmit",
    defaultValues: {
      nome: membro?.nome || "",
      telefone: membro?.telefone || "",
      email: membro?.email || "",
      sexo: membro?.sexo || undefined,
      dataNascimento: membro?.dataNascimento ? (() => {
        // Corrige o problema de fuso horário: extrai apenas a data (ano, mês, dia)
        // e cria uma nova data no fuso local para evitar deslocamento de 1 dia
        const d = membro.dataNascimento.toDate();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
      })() : undefined,
      tipo: membro?.tipo || "membro",
      cargo: membro?.cargo,
      cargoDescricao: membro?.cargoDescricao || "",
      estadoCivil: membro?.estadoCivil || "solteiro",
      nomeConjuge: membro?.nomeConjuge || "",
      conjugeEhMembro: !!membro?.conjugeId,
      conjugeIdSelecionado: membro?.conjugeId || "",
      adicionarNovoConjuge: false,
      telefoneConjuge: "",
      emailConjuge: "",
      sexoConjuge: undefined,
      tipoConjuge: "membro",
      cargoConjuge: undefined,
      dataNascimentoConjuge: undefined,
      temFuncaoIgreja: membro?.temFuncaoIgreja || false,
      funcoes: membro?.funcoes || [],
      funcaoDescricao: membro?.funcaoDescricao || "",
      departamentos: membro?.departamentos || [],
      departamentoDescricao: membro?.departamentoDescricao || "",
      ehLider: membro?.ehLider || false,
      liderDe: membro?.liderDe || "",
      cep: membro?.endereco?.cep || "",
      logradouro: membro?.endereco?.logradouro || "",
      numero: membro?.endereco?.numero || "",
      complemento: membro?.endereco?.complemento || "",
      bairro: membro?.endereco?.bairro || "",
      cidade: membro?.endereco?.cidade || "",
      estado: membro?.endereco?.estado || "",
      observacoes: membro?.observacoes || "",
    },
  });

  const watchTipo = form.watch("tipo");
  const showCargo = ["obreiro", "lider"].includes(watchTipo);
  const watchCargo = form.watch("cargo");
  const watchEstadoCivil = form.watch("estadoCivil");
  const temConjuge = watchEstadoCivil === "casado" || watchEstadoCivil === "amasiado";
  const watchConjugeEhMembro = form.watch("conjugeEhMembro");
  const watchConjugeIdSelecionado = form.watch("conjugeIdSelecionado");
  const watchAdicionarNovoConjuge = form.watch("adicionarNovoConjuge");
  const watchTipoConjuge = form.watch("tipoConjuge");
  const showCargoConjuge = watchTipoConjuge === "obreiro" || watchTipoConjuge === "lider";
  const watchSexo = form.watch("sexo");
  const watchTemFuncao = form.watch("temFuncaoIgreja");
  const watchEhLider = form.watch("ehLider");
  const watchFuncoes = form.watch("funcoes") || [];
  const watchDepartamentos = form.watch("departamentos") || [];

  // Carrega membros quando usuário indica que cônjuge é membro
  useEffect(() => {
    async function loadMembros() {
      if (!watchConjugeEhMembro || !igrejaId || !selectedUnidadeId) return;
      
      setLoadingMembros(true);
      try {
        const { data, error } = await supabase
          .from("membros")
          .select("id, nome, telefone, sexo")
          .eq("igreja_id", igrejaId)
          .eq("unidade_id", selectedUnidadeId)
          .eq("situacao", "ativo");
          
        if (error) throw error;
        
        let lista = (data || []).map(row => ({
          id: row.id,
          nome: row.nome,
          telefone: row.telefone || "",
          sexo: row.sexo || "",
        }));
        
        // Exclui o próprio membro se estiver editando
        if (membro) {
          lista = lista.filter(m => m.id !== membro.id);
        }
        
        // Ordena por nome
        lista.sort((a, b) => a.nome.localeCompare(b.nome));
        setMembrosLista(lista);
      } catch (error) {
        console.error("Erro ao carregar membros:", error);
      } finally {
        setLoadingMembros(false);
      }
    }
    
    loadMembros();
  }, [watchConjugeEhMembro, igrejaId, selectedUnidadeId, membro]);

  // Format phone for display
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  // Format CEP for display
  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
  };

  // Search address by CEP
  const buscarCep = async () => {
    const cep = form.getValues("cep").replace(/\D/g, "");
    if (cep.length !== 8) {
      toast.error("CEP deve ter 8 dígitos");
      return;
    }

    setLoadingCep(true);
    try {
      const response = await fetch(`/api/cep?cep=${cep}`);
      const data = await response.json();

      if (response.ok) {
        form.setValue("logradouro", data.logradouro);
        form.setValue("bairro", data.bairro);
        form.setValue("cidade", data.cidade);
        form.setValue("estado", data.estado);
        toast.success("Endereço encontrado!");

        // Busca as coordenadas automaticamente
        const partesEndereco = [
          data.logradouro,
          form.getValues("numero"), // se houver número já preenchido
          data.bairro,
          data.cidade,
          data.estado,
          "Brasil"
        ].filter(Boolean);
        const endereco = partesEndereco.join(", ");

        try {
          const resGeo = await fetch("/api/geocode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endereco }),
          });
          const dataGeo = await resGeo.json();
          if (resGeo.ok) {
            setCoordenadas({ lat: dataGeo.lat, lng: dataGeo.lng });
          }
        } catch (err) {
          console.error("Erro ao buscar coordenadas automaticamente:", err);
        }
      } else {
        toast.error(data.error || "CEP não encontrado");
      }
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setLoadingCep(false);
    }
  };

  // Geocode address
  const geocodarEndereco = async () => {
    const values = form.getValues();
    
    // Valida se os campos necessários estão preenchidos
    if (!values.logradouro || !values.numero || !values.cidade || !values.estado) {
      toast.error("Preencha o endereço completo antes de localizar no mapa");
      return;
    }
    
    // Monta o endereço de forma mais completa para melhor precisão
    const partesEndereco = [
      values.logradouro,
      values.numero,
      values.bairro,
      values.cidade,
      values.estado,
      "Brasil"
    ].filter(Boolean);
    
    const endereco = partesEndereco.join(", ");

    setLoadingGeo(true);
    try {
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endereco }),
      });

      const data = await response.json();

      if (response.ok) {
        setCoordenadas({ lat: data.lat, lng: data.lng });
        toast.success(`Localização encontrada: ${data.formatted_address || endereco}`);
      } else {
        toast.error(data.error || "Não foi possível localizar o endereço");
      }
    } catch {
      toast.error("Erro ao buscar localização. Verifique sua conexão.");
    } finally {
      setLoadingGeo(false);
    }
  };

  const onSubmit = async (data: MembroFormData) => {
    // Coordenadas são opcionais - o membro pode ser cadastrado sem geolocalização
    // A localização no mapa pode ser feita posteriormente se necessário
    
    if (!user || !igrejaId || !selectedUnidadeId) {
      toast.error("Você precisa estar logado e selecionar uma unidade");
      return;
    }

    // Validações do cônjuge
    const temConjugeAtual = data.estadoCivil === "casado" || data.estadoCivil === "amasiado";
    
    if (temConjugeAtual) {
      if (data.conjugeEhMembro) {
        // Se é membro, deve selecionar um existente ou adicionar novo
        if (!data.conjugeIdSelecionado && !data.adicionarNovoConjuge) {
          toast.error("Selecione o cônjuge na lista ou clique em adicionar novo");
          return;
        }
        // Se está adicionando novo, precisa dos dados
        if (data.adicionarNovoConjuge) {
          if (!data.nomeConjuge?.trim()) {
            toast.error("Nome do cônjuge é obrigatório");
            return;
          }
          if (!data.telefoneConjuge?.trim()) {
            toast.error("Telefone do cônjuge é obrigatório");
            return;
          }
        }
      } else {
        // Se não é membro, só precisa do nome
        if (!data.nomeConjuge?.trim()) {
          toast.error("Nome do cônjuge é obrigatório");
          return;
        }
      }
    }

    setLoading(true);
    try {
      let lat = coordenadas?.lat || null;
      let lng = coordenadas?.lng || null;

      if (!lat || !lng) {
        if (data.logradouro && data.cidade && data.estado) {
          try {
            const partesEndereco = [
              data.logradouro,
              data.numero,
              data.bairro,
              data.cidade,
              data.estado,
              "Brasil"
            ].filter(Boolean);
            const endereco = partesEndereco.join(", ");

            const resGeo = await fetch("/api/geocode", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ endereco }),
            });
            const dataGeo = await resGeo.json();
            if (resGeo.ok) {
              lat = dataGeo.lat;
              lng = dataGeo.lng;
            }
          } catch (e) {
            console.error("Erro ao autogeocodificar no submit:", e);
          }
        }
      }

      // Determina nome e ID do cônjuge
      let nomeConjugeFinal: string | null = null;
      let conjugeIdFinal: string | null = null;
      
      if (temConjugeAtual) {
        if (data.conjugeEhMembro && data.conjugeIdSelecionado) {
          const conjugeSelecionado = membrosLista.find(m => m.id === data.conjugeIdSelecionado);
          nomeConjugeFinal = conjugeSelecionado?.nome || null;
          conjugeIdFinal = data.conjugeIdSelecionado;
        } else if (data.nomeConjuge?.trim()) {
          nomeConjugeFinal = data.nomeConjuge.trim();
        }
      }

      const dataNascimentoVal = data.dataNascimento ? format(data.dataNascimento, "yyyy-MM-dd") : null;

      const membroPayload = {
        nome: data.nome,
        telefone: data.telefone.replace(/\D/g, ""),
        email: data.email || null,
        sexo: data.sexo || null,
        foto_url: fotoBase64 || null,
        data_nascimento: dataNascimentoVal,
        tipo: data.tipo,
        cargo: showCargo ? data.cargo : null,
        cargo_descricao: data.cargo === "outro" ? data.cargoDescricao : null,
        estado_civil: data.estadoCivil || "solteiro",
        nome_conjuge: nomeConjugeFinal,
        conjuge_id: conjugeIdFinal,
        tem_funcao_igreja: data.temFuncaoIgreja || false,
        funcoes: data.temFuncaoIgreja ? data.funcoes : null,
        funcao_descricao: data.funcoes?.includes("outro") ? data.funcaoDescricao : null,
        departamentos: data.temFuncaoIgreja ? data.departamentos : null,
        departamento_descricao: data.departamentos?.includes("outro") ? data.departamentoDescricao : null,
        eh_lider: data.ehLider || false,
        lider_de: data.ehLider ? data.liderDe : null,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento || null,
        bairro: data.bairro,
        cidade: data.cidade,
        estado: data.estado,
        cep: data.cep.replace(/\D/g, ""),
        latitude: lat,
        longitude: lng,
        observacoes: data.observacoes || null,
        situacao: "ativo",
        igreja_id: igrejaId,
        unidade_id: selectedUnidadeId,
      };
      
      // Aviso se não tiver coordenadas
      if (!coordenadas) {
        toast.info("Membro será salvo sem localização no mapa. Você pode adicionar depois.");
      }

      if (membro) {
        // Update existing member
        const { error } = await supabase
          .from("membros")
          .update(membroPayload)
          .eq("id", membro.id);
        
        if (error) throw error;
        
        // Se selecionou um cônjuge existente, atualiza o registro do cônjuge para vincular
        if (temConjugeAtual && data.conjugeEhMembro && data.conjugeIdSelecionado) {
          await supabase
            .from("membros")
            .update({
              conjuge_id: membro.id,
              nome_conjuge: data.nome.trim(),
            })
            .eq("id", data.conjugeIdSelecionado);
        }
        
        // Se for para cadastrar um novo cônjuge (não está na lista)
        if (temConjugeAtual && data.conjugeEhMembro && data.adicionarNovoConjuge && data.nomeConjuge?.trim() && data.telefoneConjuge?.trim()) {
          const tipoConjugeFinal = (data.tipoConjuge || "membro") as TipoMembro;
          const showCargoConjugeFinal = tipoConjugeFinal === "obreiro" || tipoConjugeFinal === "lider";
          
          const conjugePayload = {
            nome: data.nomeConjuge.trim(),
            telefone: data.telefoneConjuge.replace(/\D/g, ""),
            email: data.emailConjuge || null,
            sexo: data.sexoConjuge || null,
            foto_url: null,
            data_nascimento: data.dataNascimentoConjuge ? format(data.dataNascimentoConjuge, "yyyy-MM-dd") : null,
            tipo: tipoConjugeFinal,
            cargo: showCargoConjugeFinal ? data.cargoConjuge : null,
            cargo_descricao: null,
            estado_civil: data.estadoCivil,
            nome_conjuge: data.nome.trim(),
            conjuge_id: membro.id,
            tem_funcao_igreja: false,
            funcoes: null,
            funcao_descricao: null,
            departamentos: null,
            departamento_descricao: null,
            eh_lider: false,
            lider_de: null,
            logradouro: data.logradouro,
            numero: data.numero,
            complemento: data.complemento || null,
            bairro: data.bairro,
            cidade: data.cidade,
            estado: data.estado,
            cep: data.cep.replace(/\D/g, ""),
            latitude: lat,
            longitude: lng,
            observacoes: null,
            ativo: true,
            unidade_id: selectedUnidadeId,
            igreja_id: igrejaId,
            data_cadastro: format(new Date(), "yyyy-MM-dd"),
          };
          
          // Cadastra o cônjuge
          const { data: newConj, error: newConjErr } = await supabase
            .from("membros")
            .insert(conjugePayload)
            .select("id")
            .single();
            
          if (newConjErr) throw newConjErr;
          
          // Atualiza o membroData com o ID do novo cônjuge
          await supabase
            .from("membros")
            .update({
              conjuge_id: newConj.id,
              nome_conjuge: data.nomeConjuge.trim()
            })
            .eq("id", membro.id);
            
          toast.success("Membro atualizado e cônjuge cadastrado com sucesso!");
        } else {
          toast.success("Membro atualizado com sucesso!");
        }
      } else {
        // Create new member na unidade selecionada
        const { data: newMemb, error: newMembErr } = await supabase
          .from("membros")
          .insert({
            ...membroPayload,
            data_cadastro: format(new Date(), "yyyy-MM-dd"),
          })
          .select("id")
          .single();
          
        if (newMembErr) throw newMembErr;
        const newMembId = newMemb.id;
        
        // Se selecionou um cônjuge existente, atualiza o registro do cônjuge para vincular
        if (temConjugeAtual && data.conjugeEhMembro && data.conjugeIdSelecionado) {
          await supabase
            .from("membros")
            .update({
              conjuge_id: newMembId,
              nome_conjuge: data.nome.trim(),
            })
            .eq("id", data.conjugeIdSelecionado);
        }
        
        // Se for para cadastrar um novo cônjuge (não está na lista)
        if (temConjugeAtual && data.conjugeEhMembro && data.adicionarNovoConjuge && data.nomeConjuge?.trim() && data.telefoneConjuge?.trim()) {
          const tipoConjugeFinalNovo = (data.tipoConjuge || "membro") as TipoMembro;
          const showCargoConjugeFinalNovo = tipoConjugeFinalNovo === "obreiro" || tipoConjugeFinalNovo === "lider";
          
          const conjugePayload = {
            nome: data.nomeConjuge.trim(),
            telefone: data.telefoneConjuge.replace(/\D/g, ""),
            email: data.emailConjuge || null,
            sexo: data.sexoConjuge || null,
            foto_url: null,
            data_nascimento: data.dataNascimentoConjuge ? format(data.dataNascimentoConjuge, "yyyy-MM-dd") : null,
            tipo: tipoConjugeFinalNovo,
            cargo: showCargoConjugeFinalNovo ? data.cargoConjuge : null,
            cargo_descricao: null,
            estado_civil: data.estadoCivil,
            nome_conjuge: data.nome.trim(), // O nome do membro principal é o cônjuge do cônjuge
            conjuge_id: newMembId, // Vincula ao membro principal
            tem_funcao_igreja: false,
            funcoes: null,
            funcao_descricao: null,
            departamentos: null,
            departamento_descricao: null,
            eh_lider: false,
            lider_de: null,
            logradouro: data.logradouro,
            numero: data.numero,
            complemento: data.complemento || null,
            bairro: data.bairro,
            cidade: data.cidade,
            estado: data.estado,
            cep: data.cep.replace(/\D/g, ""),
            latitude: lat,
            longitude: lng,
            observacoes: null,
            ativo: true,
            unidade_id: selectedUnidadeId,
            igreja_id: igrejaId,
            data_cadastro: format(new Date(), "yyyy-MM-dd"),
          };
          
          // Cadastra o cônjuge
          const { data: newConj, error: newConjErr } = await supabase
            .from("membros")
            .insert(conjugePayload)
            .select("id")
            .single();
            
          if (newConjErr) throw newConjErr;
          
          // Atualiza o membro principal com o ID do cônjuge
          await supabase
            .from("membros")
            .update({ conjuge_id: newConj.id })
            .eq("id", newMembId);
          
          toast.success("Membro e cônjuge cadastrados com sucesso!");
        } else {
          toast.success("Membro cadastrado com sucesso!");
        }
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/membros");
      }
    } catch (error) {
      console.error("Erro ao salvar membro:", error);
      toast.error("Erro ao salvar membro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Photo */}
        <Collapsible open={activeSection === "foto"} onOpenChange={(open) => setActiveSection(open ? "foto" : null)} className="w-full">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">Foto</CardTitle>
                    {activeSection !== "foto" && fotoBase64 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Foto cadastrada
                      </p>
                    )}
                  </div>
                  {activeSection === "foto" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="flex justify-center pt-2">
                <FotoUpload
                  fotoUrl={fotoBase64 || undefined}
                  nome={form.watch("nome")}
                  onFotoChange={setFotoBase64}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Personal Data */}
        <Collapsible open={activeSection === "dados"} onOpenChange={(open) => setActiveSection(open ? "dados" : null)} className="w-full">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">Dados Pessoais</CardTitle>
                    {activeSection !== "dados" && form.watch("nome") && (
                      <p className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                        <span>Nome: <span className="font-semibold text-primary">{form.watch("nome")}</span></span>
                        {form.watch("estadoCivil") && (
                          <span>• Estado Civil: <span className="font-semibold text-primary">{ESTADOS_CIVIS[form.watch("estadoCivil") || "solteiro"]}</span></span>
                        )}
                        {membro && (
                          <span>• Situação: <span className={cn("font-semibold", (membro.ativo || (membro as any).situacao === "ativo") ? "text-emerald-600" : "text-destructive")}>{(membro.ativo || (membro as any).situacao === "ativo") ? "Ativo" : "Inativo"}</span></span>
                        )}
                      </p>
                    )}
                  </div>
                  {activeSection === "dados" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="grid gap-4 sm:grid-cols-2 pt-2">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do membro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(11) 99999-9999"
                          value={formatPhone(field.value)}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                            field.onChange(digits);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@exemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sexo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sexo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(SEXOS) as Sexo[]).map((s) => (
                            <SelectItem key={s} value={s}>
                              {SEXOS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dataNascimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Nascimento</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                              ) : (
                                <span>Selecione a data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            defaultMonth={field.value || new Date(1990, 0)}
                            captionLayout="dropdown"
                            fromYear={1920}
                            toYear={new Date().getFullYear()}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Estado Civil e Cônjuge */}
        <Collapsible open={activeSection === "civil"} onOpenChange={(open) => setActiveSection(open ? "civil" : null)} className="w-full">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">Estado Civil</CardTitle>
                    {activeSection !== "civil" && form.watch("estadoCivil") && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Estado Civil: <span className="font-semibold text-primary">{ESTADOS_CIVIS[form.watch("estadoCivil") || "solteiro"]}</span>
                      </p>
                    )}
                  </div>
                  {activeSection === "civil" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-2">
                <FormField
                  control={form.control}
                  name="estadoCivil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado Civil *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(ESTADOS_CIVIS) as EstadoCivil[]).map((ec) => (
                            <SelectItem key={ec} value={ec}>
                              {ESTADOS_CIVIS[ec]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {temConjuge && (
                  <>
                    <Separator />
                    
                    <FormField
                      control={form.control}
                      name="conjugeEhMembro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>O cônjuge também é membro da igreja? *</FormLabel>
                          <Select
                            onValueChange={(v) => {
                              const isMembro = v === "sim";
                              field.onChange(isMembro);
                              if (!isMembro) {
                                form.setValue("conjugeIdSelecionado", "");
                                form.setValue("adicionarNovoConjuge", false);
                              }
                            }}
                            value={field.value ? "sim" : "nao"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="nao">Não</SelectItem>
                              <SelectItem value="sim">Sim</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {watchConjugeEhMembro ? (
                      <div className="rounded-lg border bg-muted/50 p-4 space-y-4">
                        {loadingMembros ? (
                          <div className="flex items-center justify-center py-4">
                            <Spinner className="h-6 w-6" />
                            <span className="ml-2 text-sm text-muted-foreground">Carregando membros...</span>
                          </div>
                        ) : (
                          <>
                            {!watchAdicionarNovoConjuge ? (
                              <>
                                <FormField
                                  control={form.control}
                                  name="conjugeIdSelecionado"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Selecione o cônjuge *</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecione na lista" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {membrosLista
                                            .filter((m) => {
                                              if (watchSexo === "masculino") return m.sexo === "feminino";
                                              if (watchSexo === "feminino") return m.sexo === "masculino";
                                              return true;
                                            })
                                            .map((m) => (
                                              <SelectItem key={m.id} value={m.id}>
                                                {m.nome}
                                              </SelectItem>
                                            ))
                                          }
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    form.setValue("adicionarNovoConjuge", true);
                                    form.setValue("conjugeIdSelecionado", "");
                                  }}
                                >
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Não encontrei, adicionar novo
                                </Button>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <UserPlus className="h-4 w-4" />
                                    Cadastrar novo cônjuge
                                  </p>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      form.setValue("adicionarNovoConjuge", false);
                                      form.setValue("nomeConjuge", "");
                                      form.setValue("telefoneConjuge", "");
                                      form.setValue("emailConjuge", "");
                                      form.setValue("sexoConjuge", undefined);
                                      form.setValue("tipoConjuge", "membro");
                                      form.setValue("cargoConjuge", undefined);
                                      form.setValue("dataNascimentoConjuge", undefined);
                                    }}
                                  >
                                    <Search className="h-4 w-4 mr-2" />
                                    Voltar para lista
                                  </Button>
                                </div>
                                
                                <FormField
                                  control={form.control}
                                  name="nomeConjuge"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Nome do Cônjuge *</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Nome completo do cônjuge" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <div className="grid gap-4 sm:grid-cols-2">
                                  <FormField
                                    control={form.control}
                                    name="tipoConjuge"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Tipo do Cônjuge *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Selecione" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {(Object.keys(TIPOS_MEMBRO) as TipoMembro[]).map((t) => (
                                              <SelectItem key={t} value={t}>
                                                {TIPOS_MEMBRO[t]}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  {showCargoConjuge && (
                                    <FormField
                                      control={form.control}
                                      name="cargoConjuge"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Cargo do Cônjuge *</FormLabel>
                                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                                            <FormControl>
                                              <SelectTrigger>
                                                <SelectValue placeholder="Selecione" />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              {(Object.keys(CARGOS_MEMBRO) as CargoMembro[]).map((c) => (
                                                <SelectItem key={c} value={c}>
                                                  {CARGOS_MEMBRO[c]}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  )}
                                </div>
                                
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <FormField
                                    control={form.control}
                                    name="telefoneConjuge"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Telefone do Cônjuge *</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="(11) 99999-9999"
                                            value={formatPhone(field.value || "")}
                                            onChange={(e) => {
                                              const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                                              field.onChange(digits);
                                            }}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={form.control}
                                    name="sexoConjuge"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Sexo do Cônjuge *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Selecione" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {(Object.keys(SEXOS) as Sexo[]).map((s) => (
                                              <SelectItem key={s} value={s}>
                                                {SEXOS[s]}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                  <FormField
                                    control={form.control}
                                    name="emailConjuge"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Email do Cônjuge</FormLabel>
                                        <FormControl>
                                          <Input type="email" placeholder="email@exemplo.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={form.control}
                                    name="dataNascimentoConjuge"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Data de Nascimento</FormLabel>
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <FormControl>
                                              <Button
                                                variant="outline"
                                                className={cn(
                                                  "w-full pl-3 text-left font-normal",
                                                  !field.value && "text-muted-foreground"
                                                )}
                                              >
                                                {field.value ? (
                                                  format(field.value, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                                                ) : (
                                                  <span>Selecione</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                              </Button>
                                            </FormControl>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                              mode="single"
                                              selected={field.value}
                                              onSelect={field.onChange}
                                              disabled={(date) =>
                                                date > new Date() || date < new Date("1900-01-01")
                                              }
                                              defaultMonth={field.value || new Date(1990, 0)}
                                              captionLayout="dropdown"
                                              fromYear={1920}
                                              toYear={new Date().getFullYear()}
                                              locale={ptBR}
                                            />
                                          </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                
                                <p className="text-xs text-muted-foreground">
                                  O endereço será o mesmo informado abaixo para ambos.
                                </p>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <FormField
                        control={form.control}
                        name="nomeConjuge"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Cônjuge *</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome completo do cônjuge" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Unidade */}
        {!membro && (
          <Card>
            <CardHeader>
              <CardTitle>Unidade</CardTitle>
            </CardHeader>
            <CardContent>
              {authLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-sm">Carregando unidades...</span>
                </div>
              ) : !igrejaId ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <p className="text-sm font-medium text-destructive">
                    Igreja não configurada
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Seu usuário não está vinculado a nenhuma igreja. Entre em contato com o administrador.
                  </p>
                </div>
              ) : unidadesDisponiveis.length === 0 ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <p className="text-sm font-medium text-destructive">
                    Nenhuma unidade disponível
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {todasUnidades.length === 0 
                      ? "Não há unidades cadastradas na igreja. Cadastre uma unidade primeiro."
                      : unidadesAcessiveis.length === 0 
                        ? "Seu usuário não tem acesso a nenhuma unidade. Verifique suas permissões."
                        : "Não foi possível carregar as unidades. Verifique se existe pelo menos uma unidade cadastrada e se seu usuário tem permissão para acessá-la."
                    }
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Debug: todasUnidades={todasUnidades.length}, unidadesAcessiveis={unidadesAcessiveis.length}, igrejaId={igrejaId || "null"}
                  </p>
                </div>
              ) : unidadesDisponiveis.length === 1 ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unidade</label>
                  <div className="rounded-md border bg-muted/50 px-3 py-2">
                    <p className="text-sm">
                      {unidadesDisponiveis[0].nome} ({TIPOS_UNIDADE[unidadesDisponiveis[0].tipo]})
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O membro será cadastrado nesta unidade
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Selecione a Unidade *</label>
                  <Select
                    value={selectedUnidadeId}
                    onValueChange={setSelectedUnidadeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidadesDisponiveis.map((unidade) => (
                        <SelectItem key={unidade.id} value={unidade.id}>
                          {unidade.nome} ({TIPOS_UNIDADE[unidade.tipo]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    O membro será cadastrado nesta unidade
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Classification */}
        <Collapsible open={activeSection === "classificacao"} onOpenChange={(open) => setActiveSection(open ? "classificacao" : null)} className="w-full">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">Classificação</CardTitle>
                    {activeSection !== "classificacao" && form.watch("tipo") && (
                      <p className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                        <span>Tipo: <span className="font-semibold text-primary">{TIPOS_MEMBRO[form.watch("tipo")]}</span></span>
                        {showCargo && form.watch("cargo") && (
                          <span>• Cargo: <span className="font-semibold text-primary">{CARGOS_MEMBRO[form.watch("cargo") || "auxiliar_escala"]}</span></span>
                        )}
                      </p>
                    )}
                  </div>
                  {activeSection === "classificacao" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="grid gap-4 sm:grid-cols-2 pt-2">
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Membro *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(TIPOS_MEMBRO) as TipoMembro[])
                            .filter((tipo) => tipo !== "visitante")
                            .map((tipo) => (
                              <SelectItem key={tipo} value={tipo}>
                                {TIPOS_MEMBRO[tipo]}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showCargo && (
                  <>
                    <FormField
                      control={form.control}
                      name="cargo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cargo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o cargo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(Object.keys(CARGOS_MEMBRO) as CargoMembro[]).map((cargo) => (
                                <SelectItem key={cargo} value={cargo}>
                                  {CARGOS_MEMBRO[cargo]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {watchCargo === "outro" && (
                      <FormField
                        control={form.control}
                        name="cargoDescricao"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Descrição do Cargo</FormLabel>
                            <FormControl>
                              <Input placeholder="Descreva o cargo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Funções e Departamentos */}
        <Collapsible open={activeSection === "funcoes"} onOpenChange={(open) => setActiveSection(open ? "funcoes" : null)} className="w-full">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">Funções e Departamentos</CardTitle>
                    {activeSection !== "funcoes" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {watchTemFuncao ? "Ativo em funções/departamentos" : "Sem funções específicas"}
                      </p>
                    )}
                  </div>
                  {activeSection === "funcoes" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6 pt-2">
                {/* Tem função na igreja? */}
                <FormField
                  control={form.control}
                  name="temFuncaoIgreja"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer">
                          Exerce alguma função na igreja?
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Marque se o membro atua em algum ministério ou departamento
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {watchTemFuncao && (
                  <>
                    {/* Funções */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Funções que exerce</Label>
                      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                        {(Object.keys(FUNCOES_IGREJA) as FuncaoIgreja[]).map((funcao) => (
                          <div key={funcao} className="flex items-center space-x-2">
                            <Checkbox
                              id={`funcao-${funcao}`}
                              checked={watchFuncoes.includes(funcao)}
                              onCheckedChange={(checked) => {
                                const current = form.getValues("funcoes") || [];
                                if (checked) {
                                  form.setValue("funcoes", [...current, funcao]);
                                } else {
                                  form.setValue("funcoes", current.filter(f => f !== funcao));
                                }
                              }}
                            />
                            <Label htmlFor={`funcao-${funcao}`} className="text-sm cursor-pointer">
                              {FUNCOES_IGREJA[funcao]}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {watchFuncoes.includes("outro") && (
                        <FormField
                          control={form.control}
                          name="funcaoDescricao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descreva a função</FormLabel>
                              <FormControl>
                                <Input placeholder="Qual função?" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <Separator />

                    {/* Departamentos */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Departamentos que participa</Label>
                      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                        {(Object.keys(DEPARTAMENTOS) as Departamento[]).map((dept) => (
                          <div key={dept} className="flex items-center space-x-2">
                            <Checkbox
                              id={`dept-${dept}`}
                              checked={watchDepartamentos.includes(dept)}
                              onCheckedChange={(checked) => {
                                const current = form.getValues("departamentos") || [];
                                if (checked) {
                                  form.setValue("departamentos", [...current, dept]);
                                } else {
                                  form.setValue("departamentos", current.filter(d => d !== dept));
                                }
                              }}
                            />
                            <Label htmlFor={`dept-${dept}`} className="text-sm cursor-pointer">
                              {DEPARTAMENTOS[dept]}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {watchDepartamentos.includes("outro") && (
                        <FormField
                          control={form.control}
                          name="departamentoDescricao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descreva o departamento</FormLabel>
                              <FormControl>
                                <Input placeholder="Qual departamento?" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </>
                )}

                <Separator />

                {/* É líder? */}
                <FormField
                  control={form.control}
                  name="ehLider"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer">
                          É líder de algum grupo ou departamento?
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                {watchEhLider && (
                  <FormField
                    control={form.control}
                    name="liderDe"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Líder de qual grupo/departamento?</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Grupo de Jovens, Louvor, Célula Centro..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Address */}
        <Collapsible open={activeSection === "endereco"} onOpenChange={(open) => setActiveSection(open ? "endereco" : null)} className="w-full">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">Endereço</CardTitle>
                    {activeSection !== "endereco" && form.watch("logradouro") && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {form.watch("logradouro")}, {form.watch("numero")} - {form.watch("bairro")}, {form.watch("cidade")}/{form.watch("estado")}
                      </p>
                    )}
                  </div>
                  {activeSection === "endereco" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-2">
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>CEP *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="00000-000"
                            value={formatCep(field.value)}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                              field.onChange(digits);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-8"
                    onClick={buscarCep}
                    disabled={loadingCep}
                  >
                    {loadingCep ? <Spinner className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                    <span className="ml-2 hidden sm:inline">Buscar</span>
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="logradouro"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Logradouro *</FormLabel>
                        <FormControl>
                          <Input placeholder="Rua, Avenida, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número *</FormLabel>
                        <FormControl>
                          <Input placeholder="123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="complemento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input placeholder="Apto, Bloco, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro *</FormLabel>
                        <FormControl>
                          <Input placeholder="Bairro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade *</FormLabel>
                        <FormControl>
                          <Input placeholder="Cidade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado *</FormLabel>
                        <FormControl>
                          <Input placeholder="SP" maxLength={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center gap-2 text-muted-foreground text-xs mt-1 pt-2 border-t">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  <span>
                    {coordenadas
                      ? `Endereço localizado no mapa (Lat: ${coordenadas.lat.toFixed(6)}, Lng: ${coordenadas.lng.toFixed(6)})`
                      : "O endereço será localizado no mapa automaticamente ao buscar o CEP ou salvar."}
                  </span>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Notes */}
        <Collapsible open={activeSection === "observacoes"} onOpenChange={(open) => setActiveSection(open ? "observacoes" : null)} className="w-full">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">Observações</CardTitle>
                    {activeSection !== "observacoes" && form.watch("observacoes") && (
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-[300px]">
                        {form.watch("observacoes")}
                      </p>
                    )}
                  </div>
                  {activeSection === "observacoes" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-2">
                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Observações adicionais sobre o membro..."
                          className="min-h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Spinner className="mr-2 h-4 w-4" />}
            {membro ? "Salvar Alterações" : "Cadastrar Membro"}
          </Button>
        </div>
      </form>
    </Form>
  );
});
