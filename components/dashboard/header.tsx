"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Church } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TIPOS_UNIDADE } from "@/lib/types";
import { getDoc } from "firebase/firestore";
import { getMembroDoc, getVisitanteDoc, getFamiliaDoc } from "@/lib/firestore";

const pathNames: Record<string, string> = {
  dashboard: "Dashboard",
  membros: "Membros",
  visitantes: "Visitantes",
  familias: "Famílias",
  novo: "Novo Cadastro",
  nova: "Nova",
  mapa: "Mapa",
  grupos: "Grupos",
  configuracoes: "Configurações",
  igrejas: "Igrejas",
  igreja: "Dados da Igreja",
  unidades: "Unidades",
  aniversariantes: "Aniversariantes",
  acompanhamento: "Acompanhamento",
  relatorios: "Relatórios",
  editar: "Editar",
  usuarios: "Usuários",
  converter: "Converter para Membro",
};

export function Header() {
  const pathname = usePathname();
  const segments = React.useMemo(() => pathname.split("/").filter(Boolean), [pathname]);
  const { unidadeAtual, igrejaId, unidadesAcessiveis } = useAuth();
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});

  // Verifica se há algum ID potencial na URL (segmento que não é um nome conhecido)
  const hasEntityId = React.useMemo(() => {
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const prevSegment = segments[i - 1];
      if (!pathNames[segment] && (prevSegment === "membros" || prevSegment === "visitantes" || prevSegment === "familias")) {
        return true;
      }
    }
    return false;
  }, [segments]);

  // Busca o nome do membro/visitante quando a URL contém um ID
  useEffect(() => {
    // Só executa se houver um ID potencial na URL
    if (!hasEntityId || !igrejaId || !unidadesAcessiveis || unidadesAcessiveis.length === 0) {
      return;
    }

    let isMounted = true;
    
    async function fetchEntityNames() {
      const newNames: Record<string, string> = {};
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const prevSegment = segments[i - 1];
        
        // Verifica se o segmento parece ser um ID (não está no dicionário de nomes)
        if (!pathNames[segment] && prevSegment) {
          // Se o segmento anterior é "membros", busca o membro
          if (prevSegment === "membros") {
            for (const unidadeId of unidadesAcessiveis) {
              try {
                const docRef = getMembroDoc(igrejaId!, unidadeId, segment);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                  const data = docSnap.data();
                  newNames[segment] = data.nome || segment;
                  break;
                }
              } catch {
                // Continua tentando outras unidades
              }
            }
          }
          // Se o segmento anterior é "visitantes", busca o visitante
          else if (prevSegment === "visitantes") {
            for (const unidadeId of unidadesAcessiveis) {
              try {
                const docRef = getVisitanteDoc(igrejaId!, unidadeId, segment);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                  const data = docSnap.data();
                  newNames[segment] = data.nome || segment;
                  break;
                }
              } catch {
                // Continua tentando outras unidades
              }
            }
          }
          // Se o segmento anterior é "familias", busca a família
          else if (prevSegment === "familias") {
            for (const unidadeId of unidadesAcessiveis) {
              try {
                const docRef = getFamiliaDoc(igrejaId!, unidadeId, segment);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                  const data = docSnap.data();
                  newNames[segment] = data.nome || segment;
                  break;
                }
              } catch {
                // Continua tentando outras unidades
              }
            }
          }
        }
      }
      
      if (isMounted) {
        setEntityNames(newNames);
      }
    }

    fetchEntityNames();
    
    return () => {
      isMounted = false;
    };
  }, [hasEntityId, igrejaId, unidadesAcessiveis, segments]);

  // Função para obter o nome do segmento
  const getSegmentName = (segment: string) => {
    // Primeiro verifica se é um nome de entidade buscado
    if (entityNames[segment]) {
      return entityNames[segment];
    }
    // Depois verifica se é um nome fixo
    return pathNames[segment] || segment;
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {segments.map((segment, index) => {
              const isLast = index === segments.length - 1;
              const href = "/" + segments.slice(0, index + 1).join("/");
              const name = getSegmentName(segment);

              return (
                <React.Fragment key={segment}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{name}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={href}>{name}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      {/* Nome da Igreja/Unidade atual */}
      {unidadeAtual && (
        <div className="flex items-center gap-2">
          <Church className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{unidadeAtual.nome}</span>
          <Badge variant="outline" className="text-xs">
            {TIPOS_UNIDADE[unidadeAtual.tipo]}
          </Badge>
        </div>
      )}
    </header>
  );
}
