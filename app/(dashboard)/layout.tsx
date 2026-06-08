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

  const [takingTooLong, setTakingTooLong] = useState(false);

  useEffect(() => {
    if (!loading) {
      setTakingTooLong(false);
      return;
    }
    const timer = setTimeout(() => {
      setTakingTooLong(true);
    }, 6000); // 6 segundos
    return () => clearTimeout(timer);
  }, [loading]);

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

  // Show setup page if Supabase is not configured
  if (!isConfigured) {
    return <SetupRequired />;
  }

  // Enquanto carrega OU redirecionando, mostra loading
  if (loading || isRedirecting) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <div className="flex flex-col items-center gap-4 max-w-md">
          <Spinner className="h-10 w-10 text-primary" />
          <p className="text-lg font-medium text-foreground">
            Carregando...
          </p>
          {takingTooLong && (
            <div className="mt-4 p-4 rounded-lg bg-muted border border-border text-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="font-semibold text-foreground mb-1">A conexão está demorando mais do que o esperado</p>
              <p className="text-muted-foreground text-xs mb-3">
                Isso pode ocorrer devido a oscilações na rede ou porque o banco de dados (Supabase) está ativando após inatividade.
              </p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-md shadow transition"
              >
                Recarregar Página
              </button>
            </div>
          )}
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
