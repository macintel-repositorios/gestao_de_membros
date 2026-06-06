"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AcompanhamentoForm } from "@/components/acompanhamento/acompanhamento-form";

export default function NovoAcompanhamentoPage() {
  const router = useRouter();
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Novo Acompanhamento</h1>
          <p className="text-muted-foreground">
            Registre uma visita, culto no lar ou aconselhamento
          </p>
        </div>
      </div>

      <AcompanhamentoForm onSuccess={() => router.push("/acompanhamento")} />
    </div>
  );
}
