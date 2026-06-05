"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDoc, deleteDoc, doc } from "firebase/firestore";
import { getAcompanhamentosCollection, COLLECTIONS } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  User,
  Phone,
  MapPin,
  Clock,
  Building2,
  Trash2,
  Home,
  Hospital,
  BookOpen,
  MessageCircle,
  CalendarClock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Acompanhamento,
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

export default function AcompanhamentoDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { usuario, igrejaId, unidadesAcessiveis } = useAuth();
  const [acompanhamento, setAcompanhamento] = useState<Acompanhamento | null>(null);
  const [acompUnidadeId, setAcompUnidadeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const canDelete = usuario?.nivelAcesso === "admin" || usuario?.nivelAcesso === "full";

  useEffect(() => {
    if (!igrejaId || unidadesAcessiveis.length === 0) {
      setLoading(false);
      return;
    }

    async function loadAcompanhamento() {
      try {
        // Search in all accessible units
        for (const unidadeId of unidadesAcessiveis) {
          const docRef = doc(db!, COLLECTIONS.IGREJAS, igrejaId!, COLLECTIONS.UNIDADES, unidadeId, COLLECTIONS.ACOMPANHAMENTOS, resolvedParams.id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setAcompanhamento({ id: docSnap.id, unidadeId, ...docSnap.data() } as unknown as Acompanhamento);
            setAcompUnidadeId(unidadeId);
            return;
          }
        }
        // Not found
        router.push("/acompanhamento");
      } catch (error) {
        console.error("Erro ao carregar acompanhamento:", error);
        toast.error("Erro ao carregar acompanhamento");
      } finally {
        setLoading(false);
      }
    }

    loadAcompanhamento();
  }, [resolvedParams.id, router, igrejaId]);

  const handleDelete = async () => {
    if (!acompanhamento || !igrejaId) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, COLLECTIONS.IGREJAS, igrejaId, COLLECTIONS.UNIDADES, acompUnidadeId!, COLLECTIONS.ACOMPANHAMENTOS, acompanhamento.id));
      toast.success("Acompanhamento excluído com sucesso");
      router.push("/acompanhamento");
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir acompanhamento");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!acompanhamento) {
    return null;
  }

  const Icon = ICONES_ACOMPANHAMENTO[acompanhamento.tipo];
  const isHospital = acompanhamento.tipo === "visita_hospitalar";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {TIPOS_ACOMPANHAMENTO[acompanhamento.tipo]}
              </h1>
              <Badge
                style={{
                  backgroundColor: CORES_ACOMPANHAMENTO[acompanhamento.tipo],
                  color: "white",
                }}
              >
                <Icon className="mr-1 h-3 w-3" />
                {TIPOS_ACOMPANHAMENTO[acompanhamento.tipo]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {format(acompanhamento.data.toDate(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deleting}>
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Acompanhamento</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este registro de acompanhamento? Esta ação não pode
                  ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Member Card */}
          <Card>
            <CardHeader>
              <CardTitle>Membro</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/membros/${acompanhamento.membroId}`}
                className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <Avatar className="h-14 w-14">
                  <AvatarImage src={acompanhamento.membroFotoUrl || undefined} />
                  <AvatarFallback className="text-lg">
                    {acompanhamento.membroNome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-medium">{acompanhamento.membroNome}</p>
                  <p className="text-sm text-muted-foreground">Clique para ver o perfil completo</p>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {acompanhamento.descricao}
              </p>
              {acompanhamento.observacoes && (
                <div className="mt-4 rounded-lg bg-muted/50 p-4">
                  <p className="mb-1 text-sm font-medium">Observações</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {acompanhamento.observacoes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hospital Details */}
          {isHospital && acompanhamento.dadosHospital && (
            <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <Hospital className="h-5 w-5" />
                  Dados Hospitalares
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {acompanhamento.dadosHospital.nomeHospital && (
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Hospital</p>
                        <p className="font-medium">{acompanhamento.dadosHospital.nomeHospital}</p>
                      </div>
                    </div>
                  )}
                  {acompanhamento.dadosHospital.enderecoHospital && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Endereço</p>
                        <p className="font-medium">{acompanhamento.dadosHospital.enderecoHospital}</p>
                      </div>
                    </div>
                  )}
                  {acompanhamento.dadosHospital.telefoneHospital && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Telefone</p>
                        <p className="font-medium">{acompanhamento.dadosHospital.telefoneHospital}</p>
                      </div>
                    </div>
                  )}
                  {acompanhamento.dadosHospital.quartoLeito && (
                    <div className="flex items-start gap-3">
                      <Home className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Quarto / Leito</p>
                        <p className="font-medium">{acompanhamento.dadosHospital.quartoLeito}</p>
                      </div>
                    </div>
                  )}
                  {acompanhamento.dadosHospital.horarioVisita && (
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Horário de Visita</p>
                        <p className="font-medium">{acompanhamento.dadosHospital.horarioVisita}</p>
                      </div>
                    </div>
                  )}
                  {acompanhamento.dadosHospital.previsaoAlta && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Previsão de Alta</p>
                        <p className="font-medium">
                          {format(acompanhamento.dadosHospital.previsaoAlta.toDate(), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {format(acompanhamento.data.toDate(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Responsável</p>
                  <p className="font-medium">{acompanhamento.responsavelNome}</p>
                </div>
              </div>

              {acompanhamento.proximoContato && (
                <div className="flex items-start gap-3">
                  <CalendarClock className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Próximo Contato</p>
                    <p className="font-medium text-amber-600 dark:text-amber-400">
                      {format(acompanhamento.proximoContato.toDate(), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Registrado em</p>
                  <p className="text-sm">
                    {format(acompanhamento.dataCriacao.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
