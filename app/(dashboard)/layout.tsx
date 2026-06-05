"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Header } from "@/components/dashboard/header";
import { useAuth } from "@/contexts/auth-context";
import { UnidadeSelecionadaProvider } from "@/contexts/unidade-selecionada-context";
import { Spinner } from "@/components/ui/spinner";
import { SetupRequired } from "@/components/setup-required";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, igrejaId, loading, isConfigured } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Só executa quando loading terminou
    if (loading || !isConfigured) return;
    
    if (!user) {
      setIsRedirecting(true);
      router.replace("/login");
    } else if (!igrejaId) {
      // Usuário logado mas sem igreja configurada
      // Redireciona para setup da igreja IMEDIATAMENTE
      setIsRedirecting(true);
      router.replace("/setup-igreja");
    }
  }, [user, igrejaId, loading, isConfigured, router]);

  // Show setup page if Firebase is not configured
  if (!isConfigured) {
    return <SetupRequired />;
  }

  // Enquanto carrega OU redirecionando, mostra loading
  if (loading || isRedirecting) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">
            Carregando...
          </p>
        </div>
      </div>
    );
  }

  // Se não tem user, não renderiza nada (vai redirecionar)
  if (!user) {
    return null;
  }

  // IMPORTANTE: Se não tem igrejaId, NÃO renderiza o dashboard
  // O useEffect acima já vai redirecionar
  if (!igrejaId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">
            Redirecionando para configuração da igreja...
          </p>
        </div>
      </div>
    );
  }

  return (
    <UnidadeSelecionadaProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </UnidadeSelecionadaProvider>
  );
}
