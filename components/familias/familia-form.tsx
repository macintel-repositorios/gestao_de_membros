"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Plus, Trash2, CalendarIcon, Users, Baby, Home, Search, Link2, UserPlus } from "lucide-react";
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
  Familia,
  Membro,
  Parentesco,
  Sexo,
  PARENTESCOS,
  SEXOS,
  TIPOS_UNIDADE,
} from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const dependenteSchema = z.object({
  id: z.string(),
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  dataNascimento: z.date().optional(),
  sexo: z.enum(["masculino", "feminino"]).nullable().optional(),
  parentesco: z.enum(["filho", "filha", "enteado", "enteada", "neto", "neta", "sobrinho", "sobrinha", "outro"]),
  vinculadoAMembro: z.boolean().optional(),
  membroVinculadoId: z.string().optional(),
  membroVinculadoNome: z.string().optional(),
});

const familiaSchema = z.object({
  nome: z.string().min(3, "Nome da família deve ter pelo menos 3 caracteres"),
  responsavel1Id: z.string().min(1, "Selecione o primeiro responsável"),
  responsavel2Id: z.string().optional(),
  dependentes: z.array(dependenteSchema),
  observacoes: z.string().optional(),
});

type FamiliaFormData = z.infer<typeof familiaSchema>;

interface FamiliaFormProps {
  familia?: Familia;
  unidadeIdParam?: string;
  onSuccess?: () => void;
}

interface MembroSimples {
  id: string;
  nome: string;
  telefone?: string;
  unidadeId: string;
}

export function FamiliaForm({ familia, unidadeIdParam, onSuccess }: FamiliaFormProps) {
  const router = useRouter();
  const { user, igrejaId, unidadeId, unidadesAcessiveis, todasUnidades } = useAuth();
  
  const unidadesDisponiveis = todasUnidades.filter(u => 
    unidadesAcessiveis.includes(u.id)
  );
  
  const defaultUnidadeId = unidadeIdParam || unidadeId || 
    (unidadesDisponiveis.length === 1 ? unidadesDisponiveis[0]?.id : "") || "";
  
  const [selectedUnidadeId, setSelectedUnidadeId] = useState<string>(defaultUnidadeId);
  const [loading, setLoading] = useState(false);
  const [membros, setMembros] = useState<MembroSimples[]>([]);
  const [loadingMembros, setLoadingMembros] = useState(false);
  
  // Estados para combobox de responsáveis
  const [openResponsavel1, setOpenResponsavel1] = useState(false);
  const [openResponsavel2, setOpenResponsavel2] = useState(false);
  const [searchResponsavel1, setSearchResponsavel1] = useState("");
  const [searchResponsavel2, setSearchResponsavel2] = useState("");

  useEffect(() => {
    if (!selectedUnidadeId && unidadesDisponiveis.length >= 1) {
      setSelectedUnidadeId(unidadesDisponiveis[0].id);
    }
  }, [unidadesDisponiveis, selectedUnidadeId]);

  // Carregar membros quando a unidade mudar
  useEffect(() => {
    async function loadMembros() {
      if (!igrejaId || unidadesAcessiveis.length === 0) return;
      
      setLoadingMembros(true);
      try {
        const { data, error } = await supabase
          .from("membros")
          .select("id, nome, telefone, unidade_id")
          .eq("igreja_id", igrejaId)
          .in("unidade_id", unidadesAcessiveis)
          .eq("situacao", "ativo")
          .order("nome", { ascending: true });

        if (error) throw error;
        
        const allMembros: MembroSimples[] = (data || []).map((row) => ({
          id: row.id,
          nome: row.nome,
          telefone: row.telefone || "",
          unidadeId: row.unidade_id,
        }));
        
        setMembros(allMembros);
      } catch (error) {
        console.error("Erro ao carregar membros:", error);
        toast.error("Erro ao carregar lista de membros");
      } finally {
        setLoadingMembros(false);
      }
    }
    
    loadMembros();
  }, [igrejaId, unidadesAcessiveis]);

  const form = useForm<FamiliaFormData>({
    resolver: zodResolver(familiaSchema),
    mode: "onSubmit",
    defaultValues: {
      nome: familia?.nome || "",
      responsavel1Id: familia?.responsavel1Id || "",
      responsavel2Id: familia?.responsavel2Id || "",
      dependentes: familia?.dependentes?.map(d => ({
        ...d,
        dataNascimento: d.dataNascimento ? (typeof d.dataNascimento.toDate === "function" ? d.dataNascimento.toDate() : new Date(d.dataNascimento as any)) : undefined,
        vinculadoAMembro: !!d.membroVinculadoId,
      })) || [],
      observacoes: familia?.observacoes || "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "dependentes",
  });

  // Gerar sugestão de nome da família baseado nos sobrenomes
  const gerarNomeFamilia = useCallback(() => {
    const resp1Id = form.getValues("responsavel1Id");
    const resp2Id = form.getValues("responsavel2Id");
    
    const membro1 = membros.find(m => m.id === resp1Id);
    const membro2 = membros.find(m => m.id === resp2Id);
    
    if (!membro1) return;
    
    const partes1 = membro1.nome.trim().split(" ");
    const sobrenome1 = partes1.length > 1 ? partes1[partes1.length - 1] : partes1[0];
    
    if (membro2) {
      const partes2 = membro2.nome.trim().split(" ");
      const sobrenome2 = partes2.length > 1 ? partes2[partes2.length - 1] : partes2[0];
      
      if (sobrenome1.toLowerCase() === sobrenome2.toLowerCase()) {
        form.setValue("nome", `Família ${sobrenome1}`);
      } else {
        form.setValue("nome", `Família ${sobrenome1} ${sobrenome2}`);
      }
    } else {
      form.setValue("nome", `Família ${sobrenome1}`);
    }
  }, [form, membros]);

  // Observar mudanças nos responsáveis para sugerir nome
  const responsavel1Id = form.watch("responsavel1Id");
  const responsavel2Id = form.watch("responsavel2Id");
  
  useEffect(() => {
    if (responsavel1Id && !familia) {
      gerarNomeFamilia();
    }
  }, [responsavel1Id, responsavel2Id, familia, gerarNomeFamilia]);

  const addDependente = () => {
    append({
      id: crypto.randomUUID(),
      nome: "",
      parentesco: "filho",
      vinculadoAMembro: false,
    });
  };

  const getInitials = (nome: string) => {
    return nome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const filteredMembrosResp1 = membros.filter(m => 
    m.nome.toLowerCase().includes(searchResponsavel1.toLowerCase()) &&
    m.id !== form.getValues("responsavel2Id")
  );

  const filteredMembrosResp2 = membros.filter(m => 
    m.nome.toLowerCase().includes(searchResponsavel2.toLowerCase()) &&
    m.id !== form.getValues("responsavel1Id")
  );

  const onSubmit = async (data: FamiliaFormData) => {
    if (!igrejaId || !user || !selectedUnidadeId) {
      toast.error("Erro: Dados de autenticação não encontrados");
      return;
    }

    setLoading(true);
    try {
      const responsavel1 = membros.find(m => m.id === data.responsavel1Id);
      const responsavel2 = data.responsavel2Id ? membros.find(m => m.id === data.responsavel2Id) : null;

      const familiaData = {
        nome: data.nome.trim(),
        responsavel_1_id: data.responsavel1Id,
        responsavel_2_id: data.responsavel2Id || null,
        dependentes: data.dependentes.map(dep => ({
          id: dep.id,
          nome: dep.vinculadoAMembro && dep.membroVinculadoNome ? dep.membroVinculadoNome : dep.nome.trim(),
          dataNascimento: dep.dataNascimento ? new Date(dep.dataNascimento.getFullYear(), dep.dataNascimento.getMonth(), dep.dataNascimento.getDate(), 12, 0, 0).toISOString() : null,
          sexo: dep.sexo || null,
          parentesco: dep.parentesco,
          membroVinculadoId: dep.vinculadoAMembro ? dep.membroVinculadoId : null,
          membroVinculadoNome: dep.vinculadoAMembro ? dep.membroVinculadoNome : null,
        })),
        observacoes: data.observacoes || null,
        unidade_id: selectedUnidadeId,
        igreja_id: igrejaId,
        ativo: true,
      };

      if (familia) {
        // Atualizar
        const { error } = await supabase
          .from("familias")
          .update({
            ...familiaData,
            data_atualizacao: new Date().toISOString(),
          })
          .eq("id", familia.id);

        if (error) throw error;
        toast.success("Família atualizada com sucesso!");
      } else {
        // Criar
        const { error } = await supabase
          .from("familias")
          .insert({
            ...familiaData,
            criado_por: user.id,
          });

        if (error) throw error;
        toast.success("Família cadastrada com sucesso!");
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/familias");
      }
    } catch (error) {
      console.error("Erro ao salvar família:", error);
      toast.error("Erro ao salvar família");
    } finally {
      setLoading(false);
    }
  };

  if (loadingMembros) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
        <span className="ml-2 text-muted-foreground">Carregando membros...</span>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Seleção de Unidade */}
        {unidadesDisponiveis.length > 1 && !familia && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Home className="h-5 w-5" />
                Unidade
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}

        {/* Dados da Família */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Home className="h-5 w-5" />
              Dados da Família
            </CardTitle>
            <CardDescription>
              O nome da família será sugerido automaticamente baseado nos sobrenomes dos responsáveis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Família *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Família Silva Santos" {...field} />
                  </FormControl>
                  <FormDescription>
                    Será preenchido automaticamente ao selecionar os responsáveis
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Responsáveis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Responsáveis
            </CardTitle>
            <CardDescription>
              Selecione até 2 membros como responsáveis da família
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Responsável 1 */}
            <FormField
              control={form.control}
              name="responsavel1Id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Responsável 1 *</FormLabel>
                  <Popover open={openResponsavel1} onOpenChange={setOpenResponsavel1}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openResponsavel1}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {getInitials(membros.find(m => m.id === field.value)?.nome || "")}
                                </AvatarFallback>
                              </Avatar>
                              {membros.find(m => m.id === field.value)?.nome}
                            </div>
                          ) : (
                            "Selecione um membro..."
                          )}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Buscar membro..." 
                          value={searchResponsavel1}
                          onValueChange={setSearchResponsavel1}
                        />
                        <CommandList>
                          <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                          <CommandGroup>
                            {filteredMembrosResp1.slice(0, 10).map((membro) => (
                              <CommandItem
                                key={membro.id}
                                value={membro.nome}
                                onSelect={() => {
                                  field.onChange(membro.id);
                                  setOpenResponsavel1(false);
                                  setSearchResponsavel1("");
                                }}
                              >
                                <Avatar className="h-6 w-6 mr-2">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(membro.nome)}
                                  </AvatarFallback>
                                </Avatar>
                                {membro.nome}
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

            {/* Responsável 2 */}
            <FormField
              control={form.control}
              name="responsavel2Id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Responsável 2 (opcional)</FormLabel>
                  <Popover open={openResponsavel2} onOpenChange={setOpenResponsavel2}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openResponsavel2}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {getInitials(membros.find(m => m.id === field.value)?.nome || "")}
                                </AvatarFallback>
                              </Avatar>
                              {membros.find(m => m.id === field.value)?.nome}
                            </div>
                          ) : (
                            "Selecione um membro..."
                          )}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Buscar membro..." 
                          value={searchResponsavel2}
                          onValueChange={setSearchResponsavel2}
                        />
                        <CommandList>
                          <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                          <CommandGroup>
                            {field.value && (
                              <CommandItem
                                value="limpar"
                                onSelect={() => {
                                  field.onChange("");
                                  setOpenResponsavel2(false);
                                  setSearchResponsavel2("");
                                }}
                                className="text-muted-foreground"
                              >
                                Remover seleção
                              </CommandItem>
                            )}
                            {filteredMembrosResp2.slice(0, 10).map((membro) => (
                              <CommandItem
                                key={membro.id}
                                value={membro.nome}
                                onSelect={() => {
                                  field.onChange(membro.id);
                                  setOpenResponsavel2(false);
                                  setSearchResponsavel2("");
                                }}
                              >
                                <Avatar className="h-6 w-6 mr-2">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(membro.nome)}
                                  </AvatarFallback>
                                </Avatar>
                                {membro.nome}
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

        {/* Dependentes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Baby className="h-5 w-5" />
                  Dependentes
                </CardTitle>
                <CardDescription>
                  Filhos, netos, sobrinhos e outros dependentes da família
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addDependente}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Baby className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>Nenhum dependente adicionado</p>
                <Button type="button" variant="link" onClick={addDependente}>
                  Adicionar dependente
                </Button>
              </div>
            ) : (
              fields.map((field, index) => (
                <DependenteItem
                  key={field.id}
                  index={index}
                  form={form}
                  membros={membros}
                  onRemove={() => remove(index)}
                  getInitials={getInitials}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre a família (opcional)"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Botões */}
        <div className="flex gap-4">
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
            {familia ? "Atualizar" : "Cadastrar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Componente separado para cada dependente
interface DependenteItemProps {
  index: number;
  form: ReturnType<typeof useForm<FamiliaFormData>>;
  membros: MembroSimples[];
  onRemove: () => void;
  getInitials: (nome: string) => string;
}

function DependenteItem({ index, form, membros, onRemove, getInitials }: DependenteItemProps) {
  const [openMembroVinculado, setOpenMembroVinculado] = useState(false);
  const [searchMembro, setSearchMembro] = useState("");
  
  const vinculadoAMembro = form.watch(`dependentes.${index}.vinculadoAMembro`);
  
  const filteredMembros = membros.filter(m => 
    m.nome.toLowerCase().includes(searchMembro.toLowerCase())
  );

  return (
    <div className="border rounded-lg p-4 space-y-4 relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <div className="pr-10">
        <div className="flex items-center gap-4 mb-4">
          <FormField
            control={form.control}
            name={`dependentes.${index}.vinculadoAMembro`}
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <Label className="text-sm font-normal flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  Vincular a membro existente
                </Label>
              </FormItem>
            )}
          />
        </div>

        {vinculadoAMembro ? (
          <FormField
            control={form.control}
            name={`dependentes.${index}.membroVinculadoId`}
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Membro</FormLabel>
                <Popover open={openMembroVinculado} onOpenChange={setOpenMembroVinculado}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getInitials(membros.find(m => m.id === field.value)?.nome || "")}
                              </AvatarFallback>
                            </Avatar>
                            {membros.find(m => m.id === field.value)?.nome}
                          </div>
                        ) : (
                          "Selecione um membro..."
                        )}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Buscar membro..." 
                        value={searchMembro}
                        onValueChange={setSearchMembro}
                      />
                      <CommandList>
                        <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                        <CommandGroup>
                          {filteredMembros.slice(0, 10).map((membro) => (
                            <CommandItem
                              key={membro.id}
                              value={membro.nome}
                              onSelect={() => {
                                field.onChange(membro.id);
                                form.setValue(`dependentes.${index}.membroVinculadoNome`, membro.nome);
                                form.setValue(`dependentes.${index}.nome`, membro.nome);
                                setOpenMembroVinculado(false);
                                setSearchMembro("");
                              }}
                            >
                              <Avatar className="h-6 w-6 mr-2">
                                <AvatarFallback className="text-xs">
                                  {getInitials(membro.nome)}
                                </AvatarFallback>
                              </Avatar>
                              {membro.nome}
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
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name={`dependentes.${index}.nome`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do dependente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`dependentes.${index}.dataNascimento`}
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
                            format(field.value, "dd/MM/yyyy", { locale: ptBR })
                          ) : (
                            "Selecione a data"
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
                        initialFocus
                        captionLayout="dropdown"
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`dependentes.${index}.sexo`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexo</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(SEXOS) as Sexo[]).map((sexo) => (
                        <SelectItem key={sexo} value={sexo}>
                          {SEXOS[sexo]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="mt-4">
          <FormField
            control={form.control}
            name={`dependentes.${index}.parentesco`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parentesco *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.keys(PARENTESCOS) as Parentesco[]).map((parentesco) => (
                      <SelectItem key={parentesco} value={parentesco}>
                        {PARENTESCOS[parentesco]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
