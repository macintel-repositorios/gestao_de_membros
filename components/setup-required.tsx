"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, ExternalLink, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const envVars = [
  { key: "NEXT_PUBLIC_FIREBASE_API_KEY", description: "API Key do Firebase" },
  { key: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", description: "Auth Domain (projeto.firebaseapp.com)" },
  { key: "NEXT_PUBLIC_FIREBASE_PROJECT_ID", description: "Project ID" },
  { key: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", description: "Storage Bucket" },
  { key: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", description: "Messaging Sender ID" },
  { key: "NEXT_PUBLIC_FIREBASE_APP_ID", description: "App ID" },
  { key: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", description: "Google Maps API Key (opcional para desenvolvimento)" },
];

export function SetupRequired() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Configuracao Necessaria</CardTitle>
          <CardDescription>
            O sistema precisa das credenciais do Firebase para funcionar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription>
              Siga os passos abaixo para configurar o Firebase e habilitar o sistema.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Passo 1: Criar projeto no Firebase</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Acesse o <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Firebase Console <ExternalLink className="w-3 h-3" /></a></li>
              <li>Clique em "Adicionar projeto" e siga as instrucoes</li>
              <li>Ative o Authentication com "Telefone" como provedor</li>
              <li>Crie um banco Firestore Database</li>
            </ol>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Passo 2: Obter credenciais</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>No Firebase Console, va em Configuracoes do Projeto</li>
              <li>Na secao "Seus apps", adicione um app Web</li>
              <li>Copie as credenciais do firebaseConfig</li>
            </ol>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Passo 3: Adicionar variaveis de ambiente</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Clique no botao <strong>Settings</strong> no canto superior direito do v0, depois em <strong>Vars</strong>, e adicione:
            </p>
            <div className="bg-muted rounded-lg p-4 space-y-2">
              {envVars.map((env) => (
                <div key={env.key} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <code className="bg-background px-2 py-1 rounded text-xs font-mono">
                      {env.key}
                    </code>
                    <span className="text-muted-foreground text-xs hidden sm:inline">
                      {env.description}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(env.key)}
                    className="h-7 px-2"
                  >
                    {copied === env.key ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground text-center">
              Apos configurar as variaveis, a pagina sera recarregada automaticamente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
