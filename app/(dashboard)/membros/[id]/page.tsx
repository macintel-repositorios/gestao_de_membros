"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getDoc, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { getMembroDoc, getMembrosCollection, getAcompanhamentosCollection } from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Pencil,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Briefcase,
  Cake,
  Home,
  Hospital,
  BookOpen,
  MessageCircle,
  Plus,
  HeartHandshake,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Membro,
  Acompanhamento,
  TipoAcompanhamento,
  TIPOS_MEMBRO,
  CARGOS_MEMBRO,
  TIPOS_ACOMPANHAMENTO,
  CORES_ACOMPANHAMENTO,
} from "@/lib/types";

const ICONES_ACOMPANHAMENTO: Record<TipoAcompanhamento, React.ComponentType<{ className?: string }>> = {
  visita_residencial: Home,
  visita_hospitalar: Hospital,
  culto_no_lar: BookOpen,
  aconselhamento: MessageCircle,
};

export default function MembroDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const { igrejaId, unidadesAcessiveis } = useAuth();
  const [membroUnidadeId, setMembroUnidadeId] = useState<string | null>(null);
  const [membro, setMembro] = useState<Membro | null>(null);
  const [acompanhamentos, setAcompanhamentos] = useState<Acompanhamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAcomp, setLoadingAcomp] = useState(true);

  useEffect(() => {
    if (!igrejaId || unidadesAcessiveis.length === 0) {
      setLoading(false);
      setLoadingAcomp(false);
      return;
    }

    async function loadMembro() {
      try {
        // Search for member in all accessible units
        let foundMembro: Membro | null = null;
        let foundUnidadeId: string | null = null;
        
        for (const unidadeId of unidadesAcessiveis) {
          const docRef = getMembroDoc(igrejaId!, unidadeId, params.id as string);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            foundMembro = { id: docSnap.id, unidadeId, ...docSnap.data() } as Membro;
            foundUnidadeId = unidadeId;
            break;
          }
        }
        
        if (foundMembro) {
          setMembro(foundMembro);
          setMembroUnidadeId(foundUnidadeId);

        } else {
          router.push("/membros");
        }
      } catch (error) {
        console.error("Erro ao carregar membro:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMembro();
  }, [params.id, router, igrejaId, unidadesAcessiveis]);

  // Load acompanhamentos for this member after we find which unit they belong to
  useEffect(() => {
    if (!igrejaId || !membroUnidadeId) {
      setLoadingAcomp(false);
      return;
    }

    const loadAcompanhamentos = async () => {
      try {
        const acompRef = getAcompanhamentosCollection(igrejaId, membroUnidadeId);
        const acompQuery = query(
          acompRef,
          where("membroId", "==", params.id),
          orderBy("data", "desc")
        );
        
        const snapshot = await getDocs(acompQuery);
        const data: Acompanhamento[] = [];
        snapshot.forEach((docSnap) => {
          data.push({ id: docSnap.id, unidadeId: membroUnidadeId, ...docSnap.data() } as unknown as Acompanhamento);
        });
        setAcompanhamentos(data);
      } catch (error) {
        console.error("Erro ao carregar acompanhamentos:", error);
      } finally {
        setLoadingAcomp(false);
      }
    };

    loadAcompanhamentos();
  }, [params.id, igrejaId, membroUnidadeId]);

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    return phone;
  };

  const formatCep = (cep: string) => {
    if (cep.length === 8) {
      return `${cep.slice(0, 5)}-${cep.slice(5)}`;
    }
    return cep;
  };

  const formatDate = (timestamp: { toDate: () => Date } | undefined) => {
    if (!timestamp) return "-";
    return timestamp.toDate().toLocaleDateString("pt-BR");
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!membro) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{membro.nome}</h1>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                style={{
                  backgroundColor: `var(--type-${membro.tipo})`,
                  color: "white",
                }}
              >
                {TIPOS_MEMBRO[membro.tipo]}
              </Badge>
              {membro.cargo && (
                <Badge variant="outline">
                  {membro.cargo === "outro"
                    ? membro.cargoDescricao
                    : CARGOS_MEMBRO[membro.cargo]}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button asChild>
          <Link href={`/membros/${membro.id}/editar`}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações de Contato
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Phone className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefone</p>
              <a
                href={`tel:+55${membro.telefone}`}
                className="font-medium hover:underline"
              >
                {formatPhone(membro.telefone)}
              </a>
            </div>
          </div>

          {membro.email && (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <a
                  href={`mailto:${membro.email}`}
                  className="font-medium hover:underline"
                >
                  {membro.email}
                </a>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipo</p>
              <p className="font-medium">{TIPOS_MEMBRO[membro.tipo]}</p>
            </div>
          </div>

          {membro.cargo && (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cargo</p>
                <p className="font-medium">
                  {membro.cargo === "outro"
                    ? membro.cargoDescricao
                    : CARGOS_MEMBRO[membro.cargo]}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Endereço
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="font-medium">
              {membro.endereco.logradouro}, {membro.endereco.numero}
              {membro.endereco.complemento && ` - ${membro.endereco.complemento}`}
            </p>
            <p className="text-muted-foreground">
              {membro.endereco.bairro} - {membro.endereco.cidade}/
              {membro.endereco.estado}
            </p>
            <p className="text-sm text-muted-foreground">
              CEP: {formatCep(membro.endereco.cep)}
            </p>
          </div>

          <Separator className="my-4" />

          {/* Mini Map */}
          <div className="aspect-video overflow-hidden rounded-lg border bg-muted">
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${membro.coordenadas.lat},${membro.coordenadas.lng}&zoom=15`}
            />
          </div>

          <div className="mt-4 flex gap-2">
            <Button variant="outline" asChild className="flex-1">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${membro.coordenadas.lat},${membro.coordenadas.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin className="mr-2 h-4 w-4" />
                Traçar Rota
              </a>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <a
                href={`https://wa.me/55${membro.telefone}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Phone className="mr-2 h-4 w-4" />
                WhatsApp
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Datas Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {membro.dataNascimento && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Cake className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aniversário</p>
                  <p className="font-medium">
                    {format(membro.dataNascimento.toDate(), "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Data de Cadastro</p>
              <p className="font-medium">{formatDate(membro.dataCadastro)}</p>
            </div>
            {membro.dataConversao && (
              <div>
                <p className="text-sm text-muted-foreground">Data de Conversão</p>
                <p className="font-medium">{formatDate(membro.dataConversao)}</p>
              </div>
            )}
            {membro.dataBatismo && (
              <div>
                <p className="text-sm text-muted-foreground">Data de Batismo</p>
                <p className="font-medium">{formatDate(membro.dataBatismo)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Acompanhamento History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5" />
            Histórico de Acompanhamento
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/acompanhamento/novo?membroId=${membro.id}`}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loadingAcomp ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : acompanhamentos.length === 0 ? (
            <div className="py-8 text-center">
              <HeartHandshake className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhum acompanhamento registrado para este membro.
              </p>
              <Button variant="outline" size="sm" asChild className="mt-4">
                <Link href={`/acompanhamento/novo?membroId=${membro.id}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar primeiro acompanhamento
                </Link>
              </Button>
            </div>
          ) : (
            <div className="relative space-y-0">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
              
              {acompanhamentos.map((acomp, index) => {
                const Icon = ICONES_ACOMPANHAMENTO[acomp.tipo];
                return (
                  <Link
                    key={acomp.id}
                    href={`/acompanhamento/${acomp.id}`}
                    className="relative flex gap-4 py-4 transition-colors hover:bg-muted/50 rounded-lg px-2 -mx-2"
                  >
                    {/* Timeline dot */}
                    <div
                      className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: CORES_ACOMPANHAMENTO[acomp.tipo] }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{
                            borderColor: CORES_ACOMPANHAMENTO[acomp.tipo],
                            color: CORES_ACOMPANHAMENTO[acomp.tipo],
                          }}
                        >
                          {TIPOS_ACOMPANHAMENTO[acomp.tipo]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(acomp.data.toDate(), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {acomp.descricao}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Por: {acomp.responsavelNome}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Observations */}
      {membro.observacoes && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {membro.observacoes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
