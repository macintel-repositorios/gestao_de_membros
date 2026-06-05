"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { addDoc, Timestamp, collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
import { Church, User, CheckCircle2, MapPin, Heart, Users } from "lucide-react";
import { TIPOS_MEMBRO, TipoMembro, CARGOS_MEMBRO, CargoMembro, ESTADOS_CIVIS, EstadoCivil, SEXOS, Sexo, Membro } from "@/lib/types";
import { Search, UserPlus } from "lucide-react";

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
  
  // Lista de membros para seleção de cônjuge
  const [membrosLista, setMembrosLista] = useState<Pick<Membro, 'id' | 'nome' | 'telefone'>[]>([]);
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
      if (!igrejaId || !db) {
        setLoadingIgreja(false);
        return;
      }

      try {
        // Busca dados da igreja
        const igrejaRef = doc(db, "igrejas", igrejaId);
        const igrejaSnap = await getDoc(igrejaRef);
        
        if (igrejaSnap.exists()) {
          const data = igrejaSnap.data();
          setIgrejaInfo({
            nome: data.nome || "Igreja",
            convencao: data.convencao,
          });
        }

        // Busca unidades
        const unidadesRef = collection(db, "igrejas", igrejaId, "unidades");
        const unidadesSnap = await getDocs(unidadesRef);
        
        const unidadesList: UnidadeSimples[] = [];
        unidadesSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.ativa !== false) {
            unidadesList.push({
              id: docSnap.id,
              nome: data.nome || "Sem nome",
            });
          }
        });
        
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
      if (!conjugeEhMembro || !igrejaId || !unidadeId || !db) return;
      
      setLoadingMembros(true);
      try {
        const membrosRef = collection(db, "igrejas", igrejaId, "unidades", unidadeId, "membros");
        const membrosSnap = await getDocs(membrosRef);
        
        const lista: Pick<Membro, 'id' | 'nome' | 'telefone'>[] = [];
        membrosSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.ativo !== false) {
            lista.push({
              id: docSnap.id,
              nome: data.nome || "",
              telefone: data.telefone || "",
            });
          }
        });
        
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
  }, [conjugeEhMembro, igrejaId, unidadeId, db]);

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
    if (!igrejaId || !db) {
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
      const membrosRef = collection(db, "igrejas", igrejaId, "unidades", unidadeId, "membros");
      
      const membroData: Record<string, unknown> = {
        nome: nome.trim(),
        telefone: telefone.replace(/\D/g, ""),
        tipo,
        ativo: true,
        dataCadastro: Timestamp.now(),
        criadoPor: "formulario_publico",
        unidadeId,
      };

      if (email.trim()) {
        membroData.email = email.trim().toLowerCase();
      }
      if (sexo) {
        membroData.sexo = sexo;
      }
      if (dataNascimento) {
        membroData.dataNascimento = Timestamp.fromDate(new Date(dataNascimento));
      }
      if (observacoes.trim()) {
        membroData.observacoes = observacoes.trim();
      }

      // Estado Civil e Cônjuge
      membroData.estadoCivil = estadoCivil;
      if (temConjuge) {
        // Se selecionou um cônjuge existente
        if (conjugeEhMembro && conjugeIdSelecionado) {
          const conjugeSelecionado = membrosLista.find(m => m.id === conjugeIdSelecionado);
          membroData.nomeConjuge = conjugeSelecionado?.nome || "";
          membroData.conjugeId = conjugeIdSelecionado;
        } else if (nomeConjuge.trim()) {
          membroData.nomeConjuge = nomeConjuge.trim();
        }
      }

      // Cargo (para obreiro/líder)
      const showCargo = tipo === "obreiro" || tipo === "lider";
      if (showCargo && cargo) {
        membroData.cargo = cargo;
        if (cargo === "outro" && cargoDescricao.trim()) {
          membroData.cargoDescricao = cargoDescricao.trim();
        }
      }

      // Batizado
      if (batizado) {
        membroData.dataBatismo = Timestamp.now(); // Marca como batizado
      }

      // Endereço no formato correto (objeto)
      if (cep || logradouro || cidade) {
        membroData.endereco = {
          cep: cep || "",
          logradouro: logradouro || "",
          numero: numero || "",
          complemento: complemento || "",
          bairro: bairro || "",
          cidade: cidade || "",
          estado: estado || "",
        };
      }

      // Coordenadas para o mapa
      if (coordenadas) {
        membroData.coordenadas = coordenadas;
      }

      // Primeiro cadastra o membro principal
      const membroPrincipalRef = await addDoc(membrosRef, membroData);
      
      const { updateDoc, doc } = await import("firebase/firestore");
      
      // Se selecionou um cônjuge existente, atualiza ambos os registros
      if (temConjuge && conjugeEhMembro && conjugeIdSelecionado) {
        // Atualiza o cônjuge existente para vincular ao novo membro
        await updateDoc(doc(db, "igrejas", igrejaId, "unidades", unidadeId, "membros", conjugeIdSelecionado), {
          conjugeId: membroPrincipalRef.id,
          nomeConjuge: nome.trim(),
        });
      }
      
      // Se for para cadastrar um novo cônjuge (não está na lista)
      if (temConjuge && conjugeEhMembro && adicionarNovoConjuge && nomeConjuge.trim() && telefoneConjuge.trim()) {
        const conjugeData: Record<string, unknown> = {
          nome: nomeConjuge.trim(),
          telefone: telefoneConjuge.replace(/\D/g, ""),
          tipo: tipoConjuge, // Tipo selecionado para o cônjuge
          ativo: true,
          dataCadastro: Timestamp.now(),
          criadoPor: "formulario_publico",
          unidadeId,
          estadoCivil, // Mesmo estado civil
          nomeConjuge: nome.trim(), // O nome do membro principal é o cônjuge do cônjuge
          conjugeId: membroPrincipalRef.id, // Vincula ao membro principal
        };
        
        // Cargo (se obreiro/líder)
        if (showCargoConjuge && cargoConjuge) {
          conjugeData.cargo = cargoConjuge;
        }
        
        if (emailConjuge.trim()) {
          conjugeData.email = emailConjuge.trim().toLowerCase();
        }
        if (sexoConjuge) {
          conjugeData.sexo = sexoConjuge;
        }
        if (dataNascimentoConjuge) {
          conjugeData.dataNascimento = Timestamp.fromDate(new Date(dataNascimentoConjuge));
        }
        
        // Usa o mesmo endereço
        if (cep || logradouro || cidade) {
          conjugeData.endereco = {
            cep: cep || "",
            logradouro: logradouro || "",
            numero: numero || "",
            complemento: complemento || "",
            bairro: bairro || "",
            cidade: cidade || "",
            estado: estado || "",
          };
        }
        if (coordenadas) {
          conjugeData.coordenadas = coordenadas;
        }
        
        // Cadastra o cônjuge
        const conjugeRef = await addDoc(membrosRef, conjugeData);
        
        // Atualiza o membro principal com o ID do cônjuge
        await updateDoc(doc(db, "igrejas", igrejaId, "unidades", unidadeId, "membros", membroPrincipalRef.id), {
          conjugeId: conjugeRef.id
        });
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dados Pessoais */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados Pessoais
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
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="estadoCivil">Estado Civil *</Label>
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
                <Label htmlFor="tipo">Tipo de Membro *</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoMembro)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPOS_MEMBRO)
                      .filter(([value]) => value !== "visitante") // Visitante tem formulário próprio
                      .map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Campo de Cargo (aparece para Obreiro e Líder) */}
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
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="conjugeEhMembro"
                    checked={conjugeEhMembro}
                    onCheckedChange={(checked) => {
                      setConjugeEhMembro(!!checked);
                      if (!checked) {
                        setConjugeIdSelecionado("");
                        setAdicionarNovoConjuge(false);
                      }
                    }}
                  />
                  <Label htmlFor="conjugeEhMembro">Meu cônjuge também é membro da igreja</Label>
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
                                  {membrosLista.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                      {m.nome}
                                    </SelectItem>
                                  ))}
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

              {/* Botão Localizar no Mapa */}
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
