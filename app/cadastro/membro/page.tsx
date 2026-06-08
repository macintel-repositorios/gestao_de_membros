"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Church, User, CheckCircle2, MapPin, Heart, Users, Camera } from "lucide-react";
import { TIPOS_MEMBRO, TipoMembro, CARGOS_MEMBRO, CargoMembro, ESTADOS_CIVIS, EstadoCivil, SEXOS, Sexo, Membro } from "@/lib/types";
import { Search, UserPlus } from "lucide-react";
import { FotoUpload } from "@/components/membros/foto-upload";

interface UnidadeSimples {
  id: string;
  nome: string;
}

interface IgrejaInfo {
  nome: string;
  convencao?: string;
}

function CadastroMembroContent() {
  const searchParams = useSearchParams();
  const igrejaId = searchParams.get("igreja");
  const unidadeIdParam = searchParams.get("unidade");

  const [loading, setLoading] = useState(false);
  const [loadingIgreja, setLoadingIgreja] = useState(true);
  const [success, setSuccess] = useState(false);
  const [igrejaInfo, setIgrejaInfo] = useState<IgrejaInfo | null>(null);
  const [unidades, setUnidades] = useState<UnidadeSimples[]>([]);
  const [unidadeAtualNome, setUnidadeAtualNome] = useState<string | null>(null);

  // Dados do membro
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [sexo, setSexo] = useState<Sexo | "">("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [tipo, setTipo] = useState<TipoMembro>("congregado");
  const [cargo, setCargo] = useState<CargoMembro | "">("");
  const [cargoDescricao, setCargoDescricao] = useState("");
  const [unidadeId, setUnidadeId] = useState(unidadeIdParam || "");
  const [foto, setFoto] = useState<string | null>(null);
  const [mostrarAdicionais, setMostrarAdicionais] = useState(false);

  // Controle de edição/atualização
  const [isEditMode, setIsEditMode] = useState(false);
  const [membroId, setMembroId] = useState<string | null>(null);
  
  // Lista de membros para seleção de cônjuge
  const [membrosLista, setMembrosLista] = useState<Pick<Membro, 'id' | 'nome' | 'telefone' | 'sexo'>[]>([]);
  const [loadingMembros, setLoadingMembros] = useState(false);

  // Endereço
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  // Coordenadas
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(false);

  // Estado Civil e Cônjuge
  const [estadoCivil, setEstadoCivil] = useState<EstadoCivil>("solteiro");
  const [nomeConjuge, setNomeConjuge] = useState("");
  const [conjugeEhMembro, setConjugeEhMembro] = useState(false);
  const [conjugeIdSelecionado, setConjugeIdSelecionado] = useState<string>(""); // ID do cônjuge se já é membro
  const [adicionarNovoConjuge, setAdicionarNovoConjuge] = useState(false); // Para adicionar cônjuge que não está na lista
  
  // Dados do cônjuge (quando cadastrar novo)
  const [telefoneConjuge, setTelefoneConjuge] = useState("");
  const [emailConjuge, setEmailConjuge] = useState("");
  const [dataNascimentoConjuge, setDataNascimentoConjuge] = useState("");
  const [sexoConjuge, setSexoConjuge] = useState<Sexo | "">("");
  const [tipoConjuge, setTipoConjuge] = useState<TipoMembro>("membro");
  const [cargoConjuge, setCargoConjuge] = useState<CargoMembro | "">("");

  // Outros
  const [batizado, setBatizado] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  
  // Verifica se o estado civil permite cônjuge
  const temConjuge = estadoCivil === "casado" || estadoCivil === "amasiado";
  const showCargoConjuge = tipoConjuge === "obreiro" || tipoConjuge === "lider";

  // Carrega informações da igreja
  useEffect(() => {
    async function loadIgreja() {
      if (!igrejaId) {
        setLoadingIgreja(false);
        return;
      }

      try {
        // Busca dados da igreja
        const { data: igrejaData, error: igrejaErr } = await supabase
          .from("igrejas")
          .select("*")
          .eq("id", igrejaId)
          .single();
        
        if (igrejaErr) throw igrejaErr;
        
        if (igrejaData) {
          setIgrejaInfo({
            nome: igrejaData.nome || "Igreja",
            convencao: igrejaData.convencao,
          });
        }

        // Busca unidades
        const { data: unidadesData, error: unidadesErr } = await supabase
          .from("unidades")
          .select("id, nome, ativa")
          .eq("igreja_id", igrejaId);
          
        if (unidadesErr) throw unidadesErr;
        
        const unidadesList: UnidadeSimples[] = (unidadesData || [])
          .filter((u) => u.ativa !== false)
          .map((u) => ({
            id: u.id,
            nome: u.nome || "Sem nome",
          }));
        
        setUnidades(unidadesList);
        
        // Se já veio uma unidade no link, usa ela e busca o nome
        if (unidadeIdParam && unidadesList.some(u => u.id === unidadeIdParam)) {
          setUnidadeId(unidadeIdParam);
          const unidadeEncontrada = unidadesList.find(u => u.id === unidadeIdParam);
          if (unidadeEncontrada) {
            setUnidadeAtualNome(unidadeEncontrada.nome);
          }
        } else if (unidadesList.length === 1) {
          setUnidadeId(unidadesList[0].id);
          setUnidadeAtualNome(unidadesList[0].nome);
        }

        // Se veio o parâmetro membro, carrega as informações do membro para edição
        const membroIdParam = searchParams.get("membro");
        if (membroIdParam) {
          const { data: memberData, error: memberErr } = await supabase
            .from("membros")
            .select("*")
            .eq("id", membroIdParam)
            .single();
            
          if (memberErr) throw memberErr;

          if (memberData) {
            setMembroId(membroIdParam);
            setIsEditMode(true);
            setUnidadeId(memberData.unidade_id || "");
            setNome(memberData.nome || "");
            setTelefone(memberData.telefone || "");
            setEmail(memberData.email || "");
            setSexo(memberData.sexo || "");
            
            if (memberData.data_nascimento) {
              setDataNascimento(memberData.data_nascimento);
            } else {
              setDataNascimento("");
            }
            
            setTipo(memberData.tipo || "congregado");
            setCargo(memberData.cargo || "");
            setCargoDescricao(memberData.cargo_descricao || "");
            setBatizado(!!memberData.data_batismo);
            setFoto(memberData.foto_url || null);
            setEstadoCivil(memberData.estado_civil || "solteiro");
            setObservacoes(memberData.observacoes || "");
            
            setCep(memberData.cep || "");
            setLogradouro(memberData.logradouro || "");
            setNumero(memberData.numero || "");
            setComplemento(memberData.complemento || "");
            setBairro(memberData.bairro || "");
            setCidade(memberData.cidade || "");
            setEstado(memberData.estado || "");
            
            if (memberData.latitude && memberData.longitude) {
              setCoordenadas({ lat: memberData.latitude, lng: memberData.longitude });
            }
            setMostrarAdicionais(true);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar igreja:", error);
      } finally {
        setLoadingIgreja(false);
      }
    }

    loadIgreja();
  }, [igrejaId]);

  // Carrega membros quando usuário indica que cônjuge é membro
  useEffect(() => {
    async function loadMembros() {
      if (!conjugeEhMembro || !igrejaId || !unidadeId) return;
      
      setLoadingMembros(true);
      try {
        const { data: membrosData, error: membrosErr } = await supabase
          .from("membros")
          .select("id, nome, telefone, sexo, situacao")
          .eq("igreja_id", igrejaId)
          .eq("unidade_id", unidadeId)
          .eq("situacao", "ativo");
          
        if (membrosErr) throw membrosErr;
        
        const lista = (membrosData || []).map((row) => ({
          id: row.id,
          nome: row.nome || "",
          telefone: row.telefone || "",
          sexo: row.sexo || "",
        }));
        
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
  }, [conjugeEhMembro, igrejaId, unidadeId]);

  const formatPhoneInput = (value: string) => {
    return value.replace(/\D/g, "").slice(0, 11);
  };

  const formatCepInput = (value: string) => {
    return value.replace(/\D/g, "").slice(0, 8);
  };

  const buscarCep = async () => {
    if (cep.length !== 8) {
      toast.error("CEP deve ter 8 dígitos");
      return;
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      setLogradouro(data.logradouro || "");
      setBairro(data.bairro || "");
      setCidade(data.localidade || "");
      setEstado(data.uf || "");
      toast.success("Endereço encontrado!");
    } catch {
      toast.error("Erro ao buscar CEP");
    }
  };

  // Geocode - Localizar no mapa
  const localizarNoMapa = async () => {
    if (!logradouro || !numero || !cidade || !estado) {
      toast.error("Preencha o endereço completo antes de localizar no mapa");
      return;
    }
    
    const partesEndereco = [
      logradouro,
      numero,
      bairro,
      cidade,
      estado,
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
        toast.success("Localização encontrada no mapa!");
      } else {
        toast.error(data.error || "Não foi possível localizar o endereço");
      }
    } catch {
      toast.error("Erro ao buscar localização. Verifique sua conexão.");
    } finally {
      setLoadingGeo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!telefone.trim()) {
      toast.error("Telefone é obrigatório");
      return;
    }
    if (!unidadeId) {
      toast.error("Selecione uma unidade");
      return;
    }
    if (!igrejaId) {
      toast.error("Link inválido");
      return;
    }
    
    // Validações do cônjuge
    if (temConjuge) {
      if (conjugeEhMembro) {
        // Se é membro, deve selecionar um existente ou adicionar novo
        if (!conjugeIdSelecionado && !adicionarNovoConjuge) {
          toast.error("Selecione o cônjuge na lista ou clique em adicionar novo");
          return;
        }
        // Se está adicionando novo, precisa dos dados
        if (adicionarNovoConjuge) {
          if (!nomeConjuge.trim()) {
            toast.error("Nome do cônjuge é obrigatório");
            return;
          }
          if (!telefoneConjuge.trim()) {
            toast.error("Telefone do cônjuge é obrigatório");
            return;
          }
        }
      } else {
        // Se não é membro, só precisa do nome
        if (!nomeConjuge.trim()) {
          toast.error("Nome do cônjuge é obrigatório");
          return;
        }
      }
    }

    setLoading(true);
    try {
      // Determina nome e ID do cônjuge
      let nomeConjugeFinal: string | null = null;
      let conjugeIdFinal: string | null = null;
      
      if (temConjuge) {
        if (conjugeEhMembro && conjugeIdSelecionado) {
          const conjugeSelecionado = membrosLista.find(m => m.id === conjugeIdSelecionado);
          nomeConjugeFinal = conjugeSelecionado?.nome || "";
          conjugeIdFinal = conjugeIdSelecionado;
        } else if (nomeConjuge.trim()) {
          nomeConjugeFinal = nomeConjuge.trim();
        }
      }

      // Cargo (para obreiro/líder)
      const showCargo = tipo === "obreiro" || tipo === "lider";

      const membroPayload = {
        nome: nome.trim(),
        telefone: telefone.replace(/\D/g, ""),
        tipo,
        situacao: "ativo",
        igreja_id: igrejaId,
        unidade_id: unidadeId,
        foto_url: foto || null,
        email: email.trim().toLowerCase() || null,
        sexo: sexo || null,
        data_nascimento: dataNascimento || null,
        observacoes: observacoes.trim() || null,
        estado_civil: estadoCivil,
        nome_conjuge: nomeConjugeFinal,
        conjuge_id: conjugeIdFinal,
        cargo: showCargo ? (cargo || null) : null,
        cargo_descricao: showCargo && cargo === "outro" ? (cargoDescricao.trim() || null) : null,
        data_batismo: batizado ? format(new Date(), "yyyy-MM-dd") : null,
        cep: cep || null,
        logradouro: logradouro || null,
        numero: numero || null,
        complemento: complemento || null,
        bairro: bairro || null,
        cidade: cidade || null,
        estado: estado || null,
        latitude: coordenadas?.lat || null,
        longitude: coordenadas?.lng || null,
      };

      // Primeiro cadastra ou atualiza o membro principal
      let memberIdFinal = membroId;
      if (isEditMode && membroId) {
        const { error } = await supabase
          .from("membros")
          .update(membroPayload)
          .eq("id", membroId);
          
        if (error) throw error;
      } else {
        const { data: newMemb, error } = await supabase
          .from("membros")
          .insert({
            ...membroPayload,
            data_cadastro: format(new Date(), "yyyy-MM-dd"),
          })
          .select("id")
          .single();
          
        if (error) throw error;
        memberIdFinal = newMemb.id;
      }
      
      // Se selecionou um cônjuge existente, atualiza ambos os registros
      if (temConjuge && conjugeEhMembro && conjugeIdSelecionado && memberIdFinal) {
        await supabase
          .from("membros")
          .update({
            conjuge_id: memberIdFinal,
            nome_conjuge: nome.trim(),
          })
          .eq("id", conjugeIdSelecionado);
      }
      
      // Se for para cadastrar um novo cônjuge (não está na lista)
      if (temConjuge && conjugeEhMembro && adicionarNovoConjuge && nomeConjuge.trim() && telefoneConjuge.trim() && memberIdFinal) {
        const conjugePayload = {
          nome: nomeConjuge.trim(),
          telefone: telefoneConjuge.replace(/\D/g, ""),
          tipo: tipoConjuge,
          situacao: "ativo",
          data_cadastro: format(new Date(), "yyyy-MM-dd"),
          unidade_id: unidadeId,
          igreja_id: igrejaId,
          estado_civil: estadoCivil,
          nome_conjuge: nome.trim(),
          conjuge_id: memberIdFinal,
          cargo: showCargoConjuge ? (cargoConjuge || null) : null,
          email: emailConjuge.trim().toLowerCase() || null,
          sexo: sexoConjuge || null,
          data_nascimento: dataNascimentoConjuge || null,
          cep: cep || null,
          logradouro: logradouro || null,
          numero: numero || null,
          complemento: complemento || null,
          bairro: bairro || null,
          cidade: cidade || null,
          estado: estado || null,
          latitude: coordenadas?.lat || null,
          longitude: coordenadas?.lng || null,
        };
        
        // Cadastra o cônjuge
        const { data: newConj, error: conjErr } = await supabase
          .from("membros")
          .insert(conjugePayload)
          .select("id")
          .single();
          
        if (conjErr) throw conjErr;
        
        // Atualiza o membro principal com o ID do cônjuge
        await supabase
          .from("membros")
          .update({
            conjuge_id: newConj.id
          })
          .eq("id", memberIdFinal);
      }
      
      setSuccess(true);
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      toast.error("Erro ao enviar cadastro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!igrejaId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Church className="mx-auto h-12 w-12 text-muted-foreground" />
            <h1 className="mt-4 text-xl font-semibold">Link Inválido</h1>
            <p className="mt-2 text-muted-foreground">
              Este link de cadastro não é válido. Solicite um novo link à igreja.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingIgreja) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="mx-auto w-fit rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">Cadastro Realizado!</h1>
            <p className="mt-2 text-muted-foreground">
              Seu cadastro foi recebido com sucesso. Seja bem-vindo à nossa igreja!
            </p>
            <p className="mt-4 font-medium text-primary">
              {unidadeAtualNome || igrejaInfo?.nome}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-fit rounded-full bg-primary/10 p-3">
            <Church className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Cadastro de Membro</h1>
          {unidadeAtualNome ? (
            <p className="mt-1 text-muted-foreground">{unidadeAtualNome}</p>
          ) : igrejaInfo && (
            <p className="mt-1 text-muted-foreground">{igrejaInfo.nome}</p>
          )}
        </div>

        {isEditMode && (
          <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <span className="text-sm font-medium text-primary flex items-center gap-2 text-left">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Atualizando cadastro de: <strong>{nome}</strong></span>
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Foto */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Sua Foto
              </CardTitle>
              <CardDescription>Tire uma foto ou faça upload para seu cadastro</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <FotoUpload
                fotoUrl={foto || undefined}
                nome={nome}
                onFotoChange={setFoto}
              />
            </CardContent>
          </Card>

          {/* Dados Pessoais Básicos */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados Básicos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">WhatsApp *</Label>
                  <Input
                    id="telefone"
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhoneInput(e.target.value))}
                    placeholder="11999999999"
                    maxLength={11}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sexo">Sexo *</Label>
                  <Select value={sexo} onValueChange={(v) => setSexo(v as Sexo)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SEXOS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Só mostra seleção de unidade se não veio no link E há mais de uma opção */}
              {!unidadeIdParam && unidades.length > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="unidade">Unidade *</Label>
                  <Select value={unidadeId} onValueChange={setUnidadeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map((unidade) => (
                        <SelectItem key={unidade.id} value={unidade.id}>
                          {unidade.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botão de Toggle para Campos Opcionais */}
          <div className="py-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMostrarAdicionais(!mostrarAdicionais)}
              className="w-full flex items-center justify-between text-sm h-11"
            >
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {mostrarAdicionais ? "Ocultar campos adicionais" : "Preencher mais dados (Opcional - Endereço, Cônjuge, etc)"}
              </span>
              <span>{mostrarAdicionais ? "▲" : "▼"}</span>
            </Button>
          </div>

          {/* Campos Adicionais Opcionais */}
          {mostrarAdicionais && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Outros Dados Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                      <Input
                        id="dataNascimento"
                        type="date"
                        value={dataNascimento}
                        onChange={(e) => setDataNascimento(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estadoCivil">Estado Civil</Label>
                    <Select value={estadoCivil} onValueChange={(v) => setEstadoCivil(v as EstadoCivil)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ESTADOS_CIVIS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo de Membro</Label>
                    <Select value={tipo} onValueChange={(v) => setTipo(v as TipoMembro)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TIPOS_MEMBRO)
                          .filter(([value]) => value !== "visitante")
                          .map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {(tipo === "obreiro" || tipo === "lider") && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="cargo">Cargo *</Label>
                        <Select value={cargo} onValueChange={(v) => setCargo(v as CargoMembro)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o cargo" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(CARGOS_MEMBRO).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {cargo === "outro" && (
                        <div className="space-y-2">
                          <Label htmlFor="cargoDescricao">Descreva o cargo</Label>
                          <Input
                            id="cargoDescricao"
                            value={cargoDescricao}
                            onChange={(e) => setCargoDescricao(e.target.value)}
                            placeholder="Qual é o cargo?"
                          />
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="batizado"
                      checked={batizado}
                      onCheckedChange={(checked) => setBatizado(!!checked)}
                    />
                    <Label htmlFor="batizado">Sou batizado nas águas</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Dados do Cônjuge - Aparece apenas se casado ou amasiado */}
              {temConjuge && (
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      Dados do Cônjuge
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Meu cônjuge também é membro desta igreja? *</Label>
                      <Select
                        value={conjugeEhMembro ? "sim" : "nao"}
                        onValueChange={(v) => {
                          const isMembro = v === "sim";
                          setConjugeEhMembro(isMembro);
                          if (!isMembro) {
                            setConjugeIdSelecionado("");
                            setAdicionarNovoConjuge(false);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nao">Não</SelectItem>
                          <SelectItem value="sim">Sim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {conjugeEhMembro ? (
                      <div className="rounded-lg border bg-muted/50 p-4 space-y-4">
                        {loadingMembros ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <span className="ml-2 text-sm text-muted-foreground">Carregando membros...</span>
                          </div>
                        ) : (
                          <>
                            {!adicionarNovoConjuge ? (
                              <>
                                <div className="space-y-2">
                                  <Label htmlFor="conjugeSelecionado">Selecione seu cônjuge *</Label>
                                  <Select 
                                    value={conjugeIdSelecionado} 
                                    onValueChange={(v) => setConjugeIdSelecionado(v)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione na lista" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {membrosLista
                                        .filter((m) => {
                                          if (sexo === "masculino") return m.sexo === "feminino";
                                          if (sexo === "feminino") return m.sexo === "masculino";
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
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setAdicionarNovoConjuge(true);
                                      setConjugeIdSelecionado("");
                                    }}
                                  >
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Não encontrei, adicionar novo
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <UserPlus className="h-4 w-4" />
                                    <span>Cadastrar novo cônjuge</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setAdicionarNovoConjuge(false);
                                      setNomeConjuge("");
                                      setTelefoneConjuge("");
                                      setEmailConjuge("");
                                      setDataNascimentoConjuge("");
                                      setSexoConjuge("");
                                      setTipoConjuge("membro");
                                      setCargoConjuge("");
                                    }}
                                  >
                                    <Search className="h-4 w-4 mr-2" />
                                    Voltar para lista
                                  </Button>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="nomeConjuge">Nome do Cônjuge *</Label>
                                  <Input
                                    id="nomeConjuge"
                                    value={nomeConjuge}
                                    onChange={(e) => setNomeConjuge(e.target.value)}
                                    placeholder="Nome completo do cônjuge"
                                  />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="tipoConjuge">Tipo do Cônjuge *</Label>
                                    <Select value={tipoConjuge} onValueChange={(v) => setTipoConjuge(v as TipoMembro)}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Object.entries(TIPOS_MEMBRO).map(([value, label]) => (
                                          <SelectItem key={value} value={value}>
                                            {label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {showCargoConjuge && (
                                    <div className="space-y-2">
                                      <Label htmlFor="cargoConjuge">Cargo do Cônjuge *</Label>
                                      <Select value={cargoConjuge} onValueChange={(v) => setCargoConjuge(v as CargoMembro)}>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {Object.entries(CARGOS_MEMBRO).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>
                                              {label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="telefoneConjuge">WhatsApp do Cônjuge *</Label>
                                    <Input
                                      id="telefoneConjuge"
                                      value={telefoneConjuge}
                                      onChange={(e) => setTelefoneConjuge(formatPhoneInput(e.target.value))}
                                      placeholder="11999999999"
                                      maxLength={11}
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="sexoConjuge">Sexo do Cônjuge *</Label>
                                    <Select value={sexoConjuge} onValueChange={(v) => setSexoConjuge(v as Sexo)}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Object.entries(SEXOS).map(([value, label]) => (
                                          <SelectItem key={value} value={value}>
                                            {label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="emailConjuge">E-mail do Cônjuge</Label>
                                    <Input
                                      id="emailConjuge"
                                      type="email"
                                      value={emailConjuge}
                                      onChange={(e) => setEmailConjuge(e.target.value)}
                                      placeholder="email@exemplo.com"
                                    />
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label htmlFor="dataNascimentoConjuge">Data de Nascimento</Label>
                                    <Input
                                      id="dataNascimentoConjuge"
                                      type="date"
                                      value={dataNascimentoConjuge}
                                      onChange={(e) => setDataNascimentoConjuge(e.target.value)}
                                    />
                                  </div>
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
                      <div className="space-y-2">
                        <Label htmlFor="nomeConjuge">Nome do Cônjuge *</Label>
                        <Input
                          id="nomeConjuge"
                          value={nomeConjuge}
                          onChange={(e) => setNomeConjuge(e.target.value)}
                          placeholder="Nome completo do cônjuge"
                          required
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Endereço */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Endereço
                  </CardTitle>
                  <CardDescription>Opcional, mas ajuda nos grupos por proximidade</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="cep">CEP</Label>
                      <Input
                        id="cep"
                        value={cep}
                        onChange={(e) => setCep(formatCepInput(e.target.value))}
                        placeholder="00000000"
                        maxLength={8}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="button" variant="outline" onClick={buscarCep}>
                        Buscar
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logradouro">Logradouro</Label>
                    <Input
                      id="logradouro"
                      value={logradouro}
                      onChange={(e) => setLogradouro(e.target.value)}
                      placeholder="Rua, Avenida..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="numero">Número</Label>
                      <Input
                        id="numero"
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        placeholder="123"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="complemento">Complemento</Label>
                      <Input
                        id="complemento"
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                        placeholder="Apto, Bloco..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      placeholder="Bairro"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input
                        id="cidade"
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                        placeholder="Cidade"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado</Label>
                      <Input
                        id="estado"
                        value={estado}
                        onChange={(e) => setEstado(e.target.value)}
                        placeholder="SP"
                        maxLength={2}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <p className="text-sm font-medium">Localização no Mapa</p>
                      <p className="text-xs text-muted-foreground">
                        {coordenadas 
                          ? "Localização encontrada" 
                          : "Clique para localizar o endereço no mapa"}
                      </p>
                    </div>
                    <Button 
                      type="button" 
                      variant={coordenadas ? "outline" : "default"}
                      onClick={localizarNoMapa}
                      disabled={loadingGeo}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      {loadingGeo ? "Localizando..." : coordenadas ? "Localizado" : "Localizar no Mapa"}
                    </Button>
                  </div>

                  {coordenadas && (
                    <p className="text-xs text-muted-foreground text-center">
                      Coordenadas: {coordenadas.lat.toFixed(6)}, {coordenadas.lng.toFixed(6)}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Observações */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Alguma informação adicional?"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={3}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Enviando..." : "Enviar Cadastro"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function CadastroMembroPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    }>
      <CadastroMembroContent />
    </Suspense>
  );
}
