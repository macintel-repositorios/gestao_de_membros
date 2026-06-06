"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addDoc, query, getDocs, Timestamp } from "firebase/firestore";
import { getMembrosCollection, getAcompanhamentosCollection } from "@/lib/firestore";
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
  FormDescription,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { 
  CalendarIcon, 
  Check, 
  ChevronsUpDown,
  Home,
  Hospital,
  BookOpen,
  MessageCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Membro,
  TipoAcompanhamento,
  TIPOS_ACOMPANHAMENTO,
  CORES_ACOMPANHAMENTO,
  CORES_TIPO,
} from "@/lib/types";

const ICONES_ACOMPANHAMENTO: Record<TipoAcompanhamento, React.ComponentType<{ className?: string; color?: string }>> = {
  visita_residencial: Home,
  visita_hospitalar: Hospital,
  culto_no_lar: BookOpen,
  aconselhamento: MessageCircle,
};

const acompanhamentoSchema = z.object({
  membroId: z.string().min(1, "Selecione um membro"),
  tipo: z.enum(["visita_residencial", "visita_hospitalar", "culto_no_lar", "aconselhamento"]),
  data: z.date({ required_error: "Selecione a data" }),
  descricao: z.string().min(10, "Descreva o acompanhamento (mínimo 10 caracteres)"),
  observacoes: z.string().optional(),
  // Hospital fields
  nomeHospital: z.string().optional(),
  enderecoHospital: z.string().optional(),
  telefoneHospital: z.string().optional(),
  quartoLeito: z.string().optional(),
  horarioVisita: z.string().optional(),
  previsaoAlta: z.date().optional().nullable(),
  // Follow-up
  proximoContato: z.date().optional().nullable(),
});

type AcompanhamentoFormData = z.infer<typeof acompanhamentoSchema>;

interface AcompanhamentoFormProps {
  onSuccess?: () => void;
}

export function AcompanhamentoForm({ onSuccess }: AcompanhamentoFormProps) {
  const router = useRouter();
  const { user, usuario, igrejaId, unidadesAcessiveis } = useAuth();
  const [loading, setLoading] = useState(false);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [loadingMembros, setLoadingMembros] = useState(true);
  const [openMembro, setOpenMembro] = useState(false);
  const [selectedMembro, setSelectedMembro] = useState<Membro | null>(null);

  const form = useForm<AcompanhamentoFormData>({
    resolver: zodResolver(acompanhamentoSchema),
    defaultValues: {
      membroId: "",
      tipo: "visita_residencial",
      data: new Date(),
      descricao: "",
      observacoes: "",
      nomeHospital: "",
      enderecoHospital: "",
      telefoneHospital: "",
      quartoLeito: "",
      horarioVisita: "",
      previsaoAlta: null,
      proximoContato: null,
    },
  });

  const watchTipo = form.watch("tipo");
  const isHospital = watchTipo === "visita_hospitalar";

  useEffect(() => {
    if (!igrejaId || unidadesAcessiveis.length === 0) {
      setLoadingMembros(false);
      return;
    }

    const loadMembros = async () => {
      try {
        const data: Membro[] = [];
        for (const uId of unidadesAcessiveis) {
          const membrosRef = getMembrosCollection(igrejaId, uId);
          const snapshot = await getDocs(query(membrosRef));
          snapshot.forEach((docSnap) => {
            data.push({ id: docSnap.id, unidadeId: uId, ...docSnap.data() } as Membro);
          });
        }
        data.sort((a, b) => a.nome.localeCompare(b.nome));
        setMembros(data);
      } catch (error) {
        console.error("Erro ao carregar membros:", error);
      } finally {
        setLoadingMembros(false);
      }
    };

    loadMembros();
  }, [igrejaId, unidadesAcessiveis]);

  const onSubmit = async (data: AcompanhamentoFormData) => {
    if (!user || !usuario) {
      toast.error("Você precisa estar logado");
      return;
    }

    const membro = membros.find((m) => m.id === data.membroId);
    if (!membro) {
      toast.error("Membro não encontrado");
      return;
    }

    if (!igrejaId || !membro.unidadeId) {
      toast.error("Erro: igreja ou unidade não identificada");
      return;
    }

    setLoading(true);
    try {
      const acompanhamentoData: Record<string, unknown> = {
        membroId: data.membroId,
        membroNome: membro.nome,
        membroFotoUrl: membro.fotoUrl || null,
        tipo: data.tipo,
        data: Timestamp.fromDate(data.data),
        responsavelUid: user.uid,
        responsavelNome: usuario.nome,
        descricao: data.descricao,
        observacoes: data.observacoes || null,
        proximoContato: data.proximoContato ? Timestamp.fromDate(data.proximoContato) : null,
        dataCriacao: Timestamp.now(),
      };

      if (isHospital) {
        acompanhamentoData.dadosHospital = {
          nomeHospital: data.nomeHospital || null,
          enderecoHospital: data.enderecoHospital || null,
          telefoneHospital: data.telefoneHospital || null,
          quartoLeito: data.quartoLeito || null,
          horarioVisita: data.horarioVisita || null,
          previsaoAlta: data.previsaoAlta ? Timestamp.fromDate(data.previsaoAlta) : null,
        };
      }

      await addDoc(getAcompanhamentosCollection(igrejaId, membro.unidadeId), acompanhamentoData);
      toast.success("Acompanhamento registrado com sucesso!");
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/acompanhamento");
      }
    } catch (error) {
      console.error("Erro ao salvar acompanhamento:", error);
      toast.error("Erro ao registrar acompanhamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2">
        {/* Member Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Membro</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="membroId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Selecione o membro *</FormLabel>
                  <Popover open={openMembro} onOpenChange={setOpenMembro}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openMembro}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={loadingMembros}
                        >
                          {loadingMembros ? (
                            <span className="flex items-center gap-2">
                              <Spinner className="h-4 w-4" />
                              Carregando...
                            </span>
                          ) : selectedMembro ? (
                            <span className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={selectedMembro.fotoUrl || undefined} />
                                <AvatarFallback className="text-xs" style={{ backgroundColor: CORES_TIPO[selectedMembro.tipo], color: "white" }}>
                                  {selectedMembro.nome.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              {selectedMembro.nome}
                            </span>
                          ) : (
                            "Buscar membro..."
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar membro..." />
                        <CommandList>
                          <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                          <CommandGroup>
                            {membros.map((membro) => (
                              <CommandItem
                                key={membro.id}
                                value={membro.nome}
                                onSelect={() => {
                                  field.onChange(membro.id);
                                  setSelectedMembro(membro);
                                  setOpenMembro(false);
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={membro.fotoUrl || undefined} />
                                    <AvatarFallback style={{ backgroundColor: CORES_TIPO[membro.tipo], color: "white" }}>
                                      {membro.nome.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{membro.nome}</p>
                                    <p className="text-xs text-muted-foreground">{membro.endereco?.bairro}</p>
                                  </div>
                                </div>
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    field.value === membro.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Type and Date */}
        <Card>
          <CardHeader>
            <CardTitle>Tipo e Data</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Acompanhamento *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(TIPOS_ACOMPANHAMENTO) as TipoAcompanhamento[]).map((tipo) => {
                        const Icon = ICONES_ACOMPANHAMENTO[tipo];
                        return (
                          <SelectItem key={tipo} value={tipo}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" color={CORES_ACOMPANHAMENTO[tipo]} />
                              {TIPOS_ACOMPANHAMENTO[tipo]}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data *</FormLabel>
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
                            format(field.value, "dd/MM/yyyy", { locale: ptBR })
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
                        disabled={(date) => date > new Date()}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Hospital Data */}
        {isHospital && (
          <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <Hospital className="h-5 w-5" />
                Dados Hospitalares
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="nomeHospital"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nome do Hospital</FormLabel>
                    <FormControl>
                      <Input placeholder="Hospital São Paulo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enderecoHospital"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Endereço do Hospital</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua das Flores, 123 - Centro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefoneHospital"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone do Hospital</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 3333-4444" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quartoLeito"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quarto / Leito</FormLabel>
                    <FormControl>
                      <Input placeholder="Quarto 305, Leito B" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="horarioVisita"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário de Visita</FormLabel>
                    <FormControl>
                      <Input placeholder="14h às 16h" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="previsaoAlta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Previsão de Alta</FormLabel>
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
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
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
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do Acompanhamento *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva como foi a visita, o que foi conversado, pedidos de oração..."
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Relate os principais pontos da visita ou aconselhamento
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações Adicionais</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações extras, necessidades identificadas..."
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="proximoContato"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Próximo Contato</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full sm:w-64 pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy", { locale: ptBR })
                          ) : (
                            <span>Agendar próximo contato</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Data sugerida para o próximo acompanhamento
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Spinner className="mr-2 h-4 w-4" />}
            Registrar Acompanhamento
          </Button>
        </div>
      </form>
    </Form>
  );
}
