import { MembroForm } from "@/components/membros/membro-form";

export default function NovoMembroPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Novo Membro</h1>
        <p className="text-muted-foreground">
          Preencha os dados para cadastrar um novo membro
        </p>
      </div>

      <MembroForm />
    </div>
  );
}
