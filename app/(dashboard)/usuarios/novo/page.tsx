"use client";

import { useRouter } from "next/navigation";
import { UsuarioForm } from "@/components/usuarios/usuario-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NovoUsuarioPage() {
  const router = useRouter();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/usuarios">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Novo Usuário</h1>
          <p className="text-muted-foreground">
            Cadastre um novo usuário para acessar o sistema
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <UsuarioForm
          onSuccess={() => router.push("/usuarios")}
          onCancel={() => router.push("/usuarios")}
        />
      </div>
    </div>
  );
}
