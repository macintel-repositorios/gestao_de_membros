"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { query, getDocs } from "firebase/firestore";
import { getMembrosCollection } from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { ChevronLeft, ChevronRight, Cake, Phone, Gift, Eye } from "lucide-react";
import { format, isSameDay, isSameMonth, getDaysInMonth, setDate } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Membro, TIPOS_MEMBRO, CORES_TIPO } from "@/lib/types";

export default function AniversariantesPage() {
  const { igrejaId, unidadesAcessiveis } = useAuth();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  useEffect(() => {
    if (!igrejaId || unidadesAcessiveis.length === 0) {
      setLoading(false);
      return;
    }

    const loadMembros = async () => {
      try {
        const membrosData: Membro[] = [];
        
        for (const unidadeId of unidadesAcessiveis) {
          const membrosRef = getMembrosCollection(igrejaId, unidadeId);
          const snapshot = await getDocs(query(membrosRef));
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.dataNascimento) {
              membrosData.push({ id: docSnap.id, unidadeId, ...data } as Membro);
            }
          });
        }
        
        setMembros(membrosData);
      } catch (error) {
        console.error("Erro ao carregar membros:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMembros();
  }, [igrejaId, unidadesAcessiveis]);

  // Get birthdays for the selected month
  const aniversariantesDoMes = useMemo(() => {
    return membros
      .filter((membro) => {
        if (!membro.dataNascimento) return false;
        const birthDate = membro.dataNascimento.toDate();
        return birthDate.getMonth() === currentMonth.getMonth();
      })
      .sort((a, b) => {
        const dayA = a.dataNascimento!.toDate().getDate();
        const dayB = b.dataNascimento!.toDate().getDate();
        return dayA - dayB;
      });
  }, [membros, currentMonth]);

  // Get birthdays for a specific day
  const getAniversariantesDoDia = (date: Date) => {
    return membros.filter((membro) => {
      if (!membro.dataNascimento) return false;
      const birthDate = membro.dataNascimento.toDate();
      return (
        birthDate.getDate() === date.getDate() &&
        birthDate.getMonth() === date.getMonth()
      );
    });
  };

  // Get birthdays for today
  const aniversariantesHoje = useMemo(() => {
    const today = new Date();
    return getAniversariantesDoDia(today);
  }, [membros]);

  // Days with birthdays in current month for calendar highlighting
  const diasComAniversario = useMemo(() => {
    const dias: Date[] = [];
    const daysInMonth = getDaysInMonth(currentMonth);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = setDate(currentMonth, day);
      const aniversariantes = getAniversariantesDoDia(date);
      if (aniversariantes.length > 0) {
        dias.push(date);
      }
    }
    return dias;
  }, [membros, currentMonth]);

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    return phone;
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Selected day birthdays
  const aniversariantesSelecionados = useMemo(() => {
    return selectedDate ? getAniversariantesDoDia(selectedDate) : [];
  }, [selectedDate, membros]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Aniversariantes</h1>
        <p className="text-muted-foreground">
          Acompanhe os aniversários dos membros da igreja
        </p>
      </div>

      {/* Today's birthdays highlight */}
      {aniversariantesHoje.length > 0 && (
        <Card className="border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Gift className="h-5 w-5" />
              Aniversariantes de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {aniversariantesHoje.map((membro) => (
                <Link
                  key={membro.id}
                  href={`/membros/${membro.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-background/80 p-3 transition-colors hover:bg-background"
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2" style={{ borderColor: CORES_TIPO[membro.tipo] }}>
                      <AvatarImage src={membro.fotoUrl || undefined} alt={membro.nome} />
                      <AvatarFallback style={{ backgroundColor: CORES_TIPO[membro.tipo], color: "white" }}>
                        {membro.nome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                      <Cake className="h-3 w-3" />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">{membro.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      Completa {calculateAge(membro.dataNascimento!.toDate()) + 1} anos
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[300px_1fr]">
        {/* Calendar */}
        <Card className="overflow-hidden">
          <CardContent className="p-2 sm:p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={ptBR}
              captionLayout="label"
              modifiers={{
                birthday: diasComAniversario,
              }}
              modifiersClassNames={{
                birthday: "bg-amber-100 dark:bg-amber-900/30 font-bold text-amber-700 dark:text-amber-400",
              }}
            />
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-3 w-3 rounded bg-amber-100 dark:bg-amber-900/30" />
              <span>Dias com aniversariantes</span>
            </div>
          </CardContent>
        </Card>

        {/* Birthday list */}
        <div className="space-y-4">
          {/* Selected day */}
          {selectedDate && aniversariantesSelecionados.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {isSameDay(selectedDate, new Date())
                    ? "Hoje"
                    : format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {aniversariantesSelecionados.map((membro) => (
                  <AniversarianteCard key={membro.id} membro={membro} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Month list */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>
                  Aniversariantes de {format(currentMonth, "MMMM", { locale: ptBR })}
                </span>
                <Badge variant="secondary">{aniversariantesDoMes.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : aniversariantesDoMes.length === 0 ? (
                <Empty>
                  <EmptyMedia variant="icon">
                    <Cake className="h-10 w-10" />
                  </EmptyMedia>
                  <EmptyTitle>Nenhum aniversariante</EmptyTitle>
                  <EmptyDescription>
                    Não há aniversariantes cadastrados para {format(currentMonth, "MMMM", { locale: ptBR })}.
                  </EmptyDescription>
                </Empty>
              ) : (
                <div className="space-y-3">
                  {aniversariantesDoMes.map((membro) => (
                    <AniversarianteCard key={membro.id} membro={membro} showDay />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AniversarianteCard({ membro, showDay = false }: { membro: Membro; showDay?: boolean }) {
  const birthDate = membro.dataNascimento!.toDate();
  const today = new Date();
  const isToday = birthDate.getDate() === today.getDate() && birthDate.getMonth() === today.getMonth();
  
  const calculateAge = (date: Date) => {
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }
    return age;
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    return phone;
  };

  return (
    <div
      className={`flex items-center gap-2 sm:gap-4 rounded-lg border p-2 sm:p-3 transition-colors ${
        isToday ? "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20" : ""
      }`}
    >
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2" style={{ borderColor: CORES_TIPO[membro.tipo] }}>
          <AvatarImage src={membro.fotoUrl || undefined} alt={membro.nome} />
          <AvatarFallback style={{ backgroundColor: CORES_TIPO[membro.tipo], color: "white" }}>
            {membro.nome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {isToday && (
          <div className="absolute -bottom-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-amber-500 text-white">
            <Cake className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <p className="font-medium text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">{membro.nome}</p>
          <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs px-1 sm:px-2" style={{ borderColor: CORES_TIPO[membro.tipo], color: CORES_TIPO[membro.tipo] }}>
            {TIPOS_MEMBRO[membro.tipo]}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-0.5 text-xs sm:text-sm text-muted-foreground">
          {showDay && (
            <span className="font-medium text-foreground">
              Dia {birthDate.getDate()}
            </span>
          )}
          <span>{calculateAge(birthDate)} anos</span>
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {formatPhone(membro.telefone)}
          </span>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 sm:h-10 sm:w-10" asChild>
        <Link href={`/membros/${membro.id}`}>
          <Eye className="h-4 w-4" />
          <span className="sr-only">Ver perfil</span>
        </Link>
      </Button>
    </div>
  );
}
