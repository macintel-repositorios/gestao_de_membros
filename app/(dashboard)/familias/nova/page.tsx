"use client";

import { FamiliaForm } from "@/components/familias/familia-form";
import { useAuth } from "@/contexts/auth-context";

export default function NovaFamiliaPage() {
  const { igrejaNome } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nova Família</h1>
        <p className="text-muted-foreground flex flex-col gap-0.5">
          <span>Cadastre uma nova família vinculando membros como responsáveis e adicionando dependentes</span>
          {igrejaNome && (
            <span className="text-xs text-muted-foreground mt-0.5">
              Igreja: <strong className="text-foreground">{igrejaNome}</strong>
            </span>
          )}
        </p>
      </div>
      <FamiliaForm />
    </div>
  );
}

