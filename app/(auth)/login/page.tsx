"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Church, Mail } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Digite o e-mail e a senha");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          setError("E-mail ou senha inválidos.");
        } else {
          setError(authError.message);
        }
      } else {
        toast.success("Login realizado com sucesso!");
        router.push("/");
      }
    } catch (err) {
      console.error("Erro no login:", err);
      setError("Erro inesperado ao realizar login.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Church className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Gestão de Membros</h1>
        <p className="text-muted-foreground">Sistema da Igreja</p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Acessar Sistema
          </CardTitle>
          <CardDescription>
            Digite seu e-mail e senha cadastrados para entrar.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin}>
            <FieldGroup className="space-y-4">
              <Field>
                <FieldLabel>E-mail</FieldLabel>
                <Input
                  type="email"
                  placeholder="exemplo@igreja.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  disabled={loading}
                />
              </Field>

              <Field>
                <FieldLabel>Senha</FieldLabel>
                <Input
                  type="password"
                  placeholder="Sua senha secreta"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  disabled={loading}
                />
              </Field>

              {error && <FieldError>{error}</FieldError>}

              <Button
                type="submit"
                className="w-full mt-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Ao entrar, você concorda com os termos de uso do sistema.
      </p>
    </div>
  );
}
