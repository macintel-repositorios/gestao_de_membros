"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithPhoneNumber,
  ConfirmationResult,
  RecaptchaVerifier,
} from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Church, Phone, ArrowLeft, Shield } from "lucide-react";
import { toast } from "sonner";

type Step = "phone" | "code" | "name";

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | undefined;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Create reCAPTCHA verifier - creates a new one each time to avoid "already rendered" errors
  const createRecaptchaVerifier = async () => {
    if (typeof window === "undefined" || !auth) return null;
    
    // Always clear existing verifier first
    if (window.recaptchaVerifier) {
      try { 
        window.recaptchaVerifier.clear(); 
      } catch {
        // Ignore errors
      }
      window.recaptchaVerifier = undefined;
    }

    // Clear the container and recreate it with a unique ID
    const oldContainer = document.getElementById("recaptcha-container");
    if (oldContainer) {
      oldContainer.remove();
    }
    
    // Create a new container with unique ID to avoid "already rendered" issues
    const newContainer = document.createElement("div");
    newContainer.id = `recaptcha-container-${Date.now()}`;
    document.body.appendChild(newContainer);

    // Create new verifier
    const verifier = new RecaptchaVerifier(
      auth,
      newContainer.id,
      {
        size: "invisible",
        callback: () => {},
        "expired-callback": () => {
          window.recaptchaVerifier = undefined;
        },
      }
    );
    
    // Render the verifier
    try {
      await verifier.render();
    } catch (renderError) {
      console.error("Error rendering reCAPTCHA:", renderError);
    }
    
    window.recaptchaVerifier = verifier;
    return verifier;
  };

  // Format phone number for display
  const formatPhoneDisplay = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 7)
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  // Format phone for Firebase (+55...)
  const formatPhoneForFirebase = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return `+55${digits}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setPhone(digits);
    setError("");
  };

  const handleSendCode = async () => {
    if (phone.length < 10) {
      setError("Digite um número de telefone válido");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formattedPhone = formatPhoneForFirebase(phone);
      const appVerifier = await createRecaptchaVerifier();
      
      if (!appVerifier) {
        setError("Erro ao inicializar verificação. Recarregue a página.");
        setLoading(false);
        return;
      }

      const result = await signInWithPhoneNumber(auth!, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setStep("code");
      toast.success("Código enviado por SMS!");
    } catch (err: unknown) {
      console.error("Erro ao enviar SMS:", err);
      
      // Clear reCAPTCHA on error
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch {
          // Ignore
        }
        window.recaptchaVerifier = undefined;
      }

      if (err instanceof Error) {
        if (err.message.includes("too-many-requests")) {
          setError("Muitas tentativas. Aguarde alguns minutos.");
        } else if (err.message.includes("invalid-phone-number")) {
          setError("Número de telefone inválido.");
        } else if (err.message.includes("captcha-check-failed") || err.message.includes("Hostname")) {
          setError("Domínio não autorizado no Firebase. Adicione este domínio nas configurações de autenticação do Firebase Console.");
        } else {
          setError("Erro ao enviar SMS. Verifique o número e tente novamente.");
        }
      } else {
        setError("Erro desconhecido. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setError("Digite o código de 6 dígitos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await confirmationResult!.confirm(code);
      const firebaseUser = result.user;

      // Check if user exists in Firestore
      try {
        const userDoc = await getDoc(doc(db, "usuarios", firebaseUser.uid));

        if (!userDoc.exists()) {
          // New user - need to collect name
          setStep("name");
        } else {
          // Existing user - check if has igreja configured
          const userData = userDoc.data();
          if (userData.igrejaId && userData.igrejaId !== "") {
            toast.success("Login realizado com sucesso!");
            router.push("/");
          } else {
            // User exists but no igreja - go to setup
            toast.info("Configure sua igreja para continuar.");
            router.push("/setup-igreja");
          }
        }
      } catch (firestoreErr) {
        // If permission denied, user probably doesn't exist yet - go to name step
        console.log("Firestore error, assuming new user:", firestoreErr);
        setStep("name");
      }
    } catch (err: unknown) {
      console.error("Erro ao verificar código:", err);
      if (err instanceof Error && err.message.includes("invalid-verification-code")) {
        setError("Código inválido. Verifique e tente novamente.");
      } else {
        setError("Erro ao verificar código. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (name.trim().length < 2) {
      setError("Digite seu nome completo");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuário não autenticado");

      // Cria documento do usuário SEM igreja (será configurado no setup)
      const usersRef = doc(db, "usuarios", currentUser.uid);

      await setDoc(usersRef, {
        telefone: currentUser.phoneNumber,
        nome: name.trim(),
        nivelAcesso: "full", // Primeiro usuário tem acesso full para configurar
        igrejaId: "", // Será preenchido no setup da igreja
        unidadeId: "", // Será preenchido no setup da igreja
        ativo: true,
        dataCriacao: Timestamp.now(),
      });

      toast.success("Conta criada! Agora configure sua igreja.");
      router.push("/setup-igreja");
    } catch (err: unknown) {
      console.error("Erro ao criar usuário:", err);
      
      // If permission denied, still redirect to setup
      if (err instanceof Error && err.message.includes("permission-denied")) {
        toast.info("Login realizado! Configure sua igreja.");
        router.push("/setup-igreja");
      } else {
        setError("Erro ao criar conta. Verifique as permissões do Firestore.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "code") {
      setStep("phone");
      setCode("");
      setError("");
    } else if (step === "name") {
      // Can't go back from name step after verification
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
          {step !== "phone" && step !== "name" && (
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 w-fit"
              onClick={handleBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          )}
          <CardTitle className="flex items-center gap-2">
            {step === "phone" && (
              <>
                <Phone className="h-5 w-5" />
                Entrar com Telefone
              </>
            )}
            {step === "code" && (
              <>
                <Shield className="h-5 w-5" />
                Verificar Código
              </>
            )}
            {step === "name" && "Completar Cadastro"}
          </CardTitle>
          <CardDescription>
            {step === "phone" &&
              "Digite seu número de celular para receber um código de verificação via SMS."}
            {step === "code" &&
              `Digite o código de 6 dígitos enviado para ${formatPhoneDisplay(phone)}.`}
            {step === "name" &&
              "Para finalizar, informe seu nome completo."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <FieldGroup>
            {step === "phone" && (
              <Field>
                <FieldLabel>Número de Celular</FieldLabel>
                <Input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={formatPhoneDisplay(phone)}
                  onChange={handlePhoneChange}
                  disabled={loading}
                  className="text-lg"
                />
                {error && <FieldError>{error}</FieldError>}
                <Button
                  className="mt-4 w-full"
                  onClick={handleSendCode}
                  disabled={loading || phone.length < 10}
                >
                  {loading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Código SMS"
                  )}
                </Button>
              </Field>
            )}

            {step === "code" && (
              <Field>
                <FieldLabel>Código de Verificação</FieldLabel>
                <div className="flex justify-center py-4">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={setCode}
                    disabled={loading}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && <FieldError>{error}</FieldError>}
                <Button
                  className="mt-4 w-full"
                  onClick={handleVerifyCode}
                  disabled={loading || code.length !== 6}
                >
                  {loading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Verificando...
                    </>
                  ) : (
                    "Verificar Código"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className="mt-2 w-full"
                  onClick={handleSendCode}
                  disabled={loading}
                >
                  Reenviar código
                </Button>
              </Field>
            )}

            {step === "name" && (
              <Field>
                <FieldLabel>Nome Completo</FieldLabel>
                <Input
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  disabled={loading}
                  className="text-lg"
                />
                {error && <FieldError>{error}</FieldError>}
                <Button
                  className="mt-4 w-full"
                  onClick={handleCreateUser}
                  disabled={loading || name.trim().length < 2}
                >
                  {loading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Criando conta...
                    </>
                  ) : (
                    "Finalizar Cadastro"
                  )}
                </Button>
              </Field>
            )}
          </FieldGroup>
        </CardContent>
      </Card>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Ao entrar, você concorda com os termos de uso do sistema.
      </p>
    </div>
  );
}
