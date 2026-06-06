"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { VisitanteForm } from "@/components/visitantes/visitante-form";

export default function NovoVisitantePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/visitantes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Novo Visitante</h1>
          <p className="text-muted-foreground">Cadastre um novo visitante</p>
        </div>
      </div>

      <VisitanteForm />
    </div>
  );
}
