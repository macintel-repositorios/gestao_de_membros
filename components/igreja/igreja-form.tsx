"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Search, MapPin } from "lucide-react";
import { Igreja } from "@/lib/types";
import { FotoUpload } from "@/components/membros/foto-upload";

const igrejaSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  convencao: z.string().min(2, "Convenção é obrigatória"),
  sede: z.string().min(2, "Sede é obrigatória"),
  dirigente: z.string().min(3, "Nome do dirigente deve ter pelo menos 3 caracteres"),
  telefone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cep: z.string().min(8, "CEP inválido"),
  logradouro: z.string().min(3, "Logradouro inválido"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(2, "Bairro inválido"),
  cidade: z.string().min(2, "Cidade inválida"),
  estado: z.string().length(2, "Estado inválido"),
});

type IgrejaFormData = z.infer<typeof igrejaSchema>;

interface IgrejaFormProps {
  igreja?: Igreja;
  onSave: (data: Omit<Igreja, "id" | "dataCadastro">) => Promise<void>;
  onCancel?: () => void;
}

export function IgrejaForm({ igreja, onSave, onCancel }: IgrejaFormProps) {
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lng: number } | null>(
    igreja?.coordenadas || null
  );
  const [fotoBase64, setFotoBase64] = useState<string | null>(igreja?.fotoUrl || null);

  const form = useForm<IgrejaFormData>({
    resolver: zodResolver(igrejaSchema),
    defaultValues: {
      nome: igreja?.nome || "",
      convencao: igreja?.convencao || "",
      sede: igreja?.sede || "",
      dirigente: igreja?.dirigente || "",
      telefone: igreja?.telefone || "",
      email: igreja?.email || "",
      cep: igreja?.endereco?.cep || "",
      logradouro: igreja?.endereco?.logradouro || "",
      numero: igreja?.endereco?.numero || "",
      complemento: igreja?.endereco?.complemento || "",
      bairro: igreja?.endereco?.bairro || "",
      cidade: igreja?.endereco?.cidade || "",
      estado: igreja?.endereco?.estado || "",
    },
  });

  // Format phone for display
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
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
    const endereco = `${values.logradouro}, ${values.numero}, ${values.bairro}, ${values.cidade}, ${values.estado}, Brasil`;

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
      toast.error("Erro ao buscar localização");
    } finally {
      setLoadingGeo(false);
    }
  };

  const onSubmit = async (data: IgrejaFormData) => {
    // Coordenadas são opcionais
    setLoading(true);
    try {
      await onSave({
        nome: data.nome,
        tipo: igreja?.tipo || "sede",
        convencao: data.convencao,
        sede: data.sede,
        dirigente: data.dirigente,
        telefone: data.telefone?.replace(/\D/g, "") || undefined,
        email: data.email || undefined,
        fotoUrl: fotoBase64 || undefined,
        endereco: {
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento || undefined,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          cep: data.cep.replace(/\D/g, ""),
        },
        coordenadas: coordenadas || undefined,
      });
      
      if (!coordenadas) {
        toast.info("Igreja salva sem localização no mapa. Você pode adicionar depois.");
      }
      toast.success(igreja ? "Igreja atualizada com sucesso!" : "Igreja cadastrada com sucesso!");
    } catch {
      toast.error("Erro ao salvar dados da igreja");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Photo */}
        <Card>
          <CardHeader>
            <CardTitle>Foto da Igreja</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <FotoUpload
              fotoUrl={fotoBase64 || undefined}
              nome={form.watch("nome")}
              onFotoChange={setFotoBase64}
            />
          </CardContent>
        </Card>

        {/* Church Data */}
        <Card>
          <CardHeader>
            <CardTitle>Dados da Igreja</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nome da Igreja *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da igreja" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="convencao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Convenção *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: CGADB, CONAMAD" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sede"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sede *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Ministério Belém" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dirigente"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Dirigente (Pastor) *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do pastor dirigente" {...field} />
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
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="(11) 3333-3333"
                      value={formatPhone(field.value || "")}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
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
                    <Input type="email" placeholder="igreja@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                      <Input placeholder="Sala, Bloco, etc." {...field} />
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

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Localização no Mapa (Marco Zero)</p>
                <p className="text-xs text-muted-foreground">
                  {coordenadas
                    ? `Lat: ${coordenadas.lat.toFixed(6)}, Lng: ${coordenadas.lng.toFixed(6)}`
                    : "A igreja será o ponto central do mapa"}
                </p>
              </div>
              <Button
                type="button"
                variant={coordenadas ? "outline" : "default"}
                onClick={geocodarEndereco}
                disabled={loadingGeo}
              >
                {loadingGeo ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <MapPin className="mr-2 h-4 w-4" />
                )}
                {coordenadas ? "Atualizar Localização" : "Localizar no Mapa"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={loading} className="flex-1 sm:flex-none">
            {loading && <Spinner className="mr-2 h-4 w-4" />}
            {igreja ? "Salvar Alterações" : "Cadastrar Igreja"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
