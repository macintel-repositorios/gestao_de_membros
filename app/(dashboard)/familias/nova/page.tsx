"use client";

import { FamiliaForm } from "@/components/familias/familia-form";

export default function NovaFamiliaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nova Família</h1>
        <p className="text-muted-foreground">
          Cadastre uma nova família vinculando membros como responsáveis e adicionando dependentes
        </p>
      </div>
      <FamiliaForm />
    </div>
  );
}
