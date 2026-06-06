"use client";

import { useState, useEffect, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getIgrejaDoc } from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { Membro, Igreja, TIPOS_MEMBRO, CARGOS_MEMBRO } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import QRCode from "react-qr-code";
import { Printer, RefreshCw, Download, Check, ShieldCheck, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CartaoMembroModalProps {
  membro: Membro;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartaoMembroModal({ membro, open, onOpenChange }: CartaoMembroModalProps) {
  const { igrejaId } = useAuth();
  const [igreja, setIgreja] = useState<Igreja | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !igrejaId) return;

    async function loadIgreja() {
      setLoading(true);
      try {
        const docRef = getIgrejaDoc(igrejaId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          setIgreja({ id: snapshot.id, ...snapshot.data() } as Igreja);
        }
      } catch (error) {
        console.error("Erro ao carregar dados da igreja:", error);
      } finally {
        setLoading(false);
      }
    }

    loadIgreja();
  }, [igrejaId, open]);

  const handlePrint = () => {
    window.print();
  };

  const getVerificationUrl = () => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/cadastro/membro?igreja=${igrejaId}&unidade=${membro.unidadeId}&membro=${membro.id}`;
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    return phone;
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-6 md:max-w-2xl bg-card border border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <CreditCard className="h-5 w-5 text-primary" />
            Credencial de Membro
          </DialogTitle>
          <DialogDescription>
            Visualize a credencial frente e verso. Clique no cartão para virá-lo.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 py-4">
            {/* Custom CSS for Flip Card and Printing inside the component */}
            <style jsx global>{`
              .perspective-1000 {
                perspective: 1000px;
              }
              .transform-style-3d {
                transform-style: preserve-3d;
              }
              .backface-hidden {
                backface-visibility: hidden;
              }
              .rotate-y-180 {
                transform: rotateY(180deg);
              }
              
              /* Print Specific Styles */
              @media print {
                body * {
                  visibility: hidden;
                }
                #print-card-container, #print-card-container * {
                  visibility: visible;
                }
                #print-card-container {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  display: flex !important;
                  flex-direction: row !important;
                  justify-content: center !important;
                  gap: 20px !important;
                  background: white !important;
                  padding: 20px !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}</style>

            {/* Interactive Flip Card Container */}
            <div className="perspective-1000 w-full max-w-[400px] h-[250px] cursor-pointer no-print">
              <div
                ref={cardRef}
                onClick={() => setIsFlipped(!isFlipped)}
                className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${
                  isFlipped ? "rotate-y-180" : ""
                }`}
              >
                {/* CARD FRENTE (Front) */}
                <div className="absolute w-full h-full backface-hidden rounded-2xl overflow-hidden shadow-2xl border border-primary/20 bg-gradient-to-br from-[#0b0f19] via-[#111827] to-[#1f2937] text-white flex flex-col justify-between p-4">
                  {/* Top Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 border border-white/20 bg-white/10">
                        <AvatarImage src={igreja?.fotoUrl || "/default-church-logo.png"} />
                        <AvatarFallback className="text-[10px] text-white font-bold bg-primary">
                          {igreja?.nome?.slice(0, 2).toUpperCase() || "IG"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold tracking-wider uppercase text-white truncate max-w-[200px]">
                          {igreja?.nome || "Igreja"}
                        </span>
                        <span className="text-[8px] text-muted-foreground tracking-widest uppercase">
                          {igreja?.convencao || "Convenção"}
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] bg-primary/20 text-primary border border-primary/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      CREDENCIAL
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="flex items-center gap-4 py-2 flex-1">
                    <Avatar className="h-24 w-24 border-2 border-primary rounded-xl shadow-lg bg-slate-800">
                      <AvatarImage src={membro.fotoUrl || undefined} className="object-cover" />
                      <AvatarFallback className="text-3xl font-semibold bg-slate-800 text-slate-200">
                        {membro.nome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col justify-center flex-1 min-w-0">
                      <h4 className="text-base font-bold truncate text-white leading-tight">
                        {membro.nome}
                      </h4>
                      <p className="text-xs text-primary font-semibold tracking-wider mt-1 uppercase">
                        {membro.cargo && membro.cargo !== "outro"
                          ? CARGOS_MEMBRO[membro.cargo]
                          : membro.cargoDescricao || TIPOS_MEMBRO[membro.tipo]}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-3 border-t border-white/5 pt-2 text-[9px] text-muted-foreground">
                        <div>
                          <span className="block font-medium">MEMBRO DESDE</span>
                          <span className="text-white font-bold">
                            {membro.dataCadastro ? format(membro.dataCadastro.toDate(), "dd/MM/yyyy") : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="block font-medium">REGISTRO</span>
                          <span className="text-white font-bold truncate block">
                            #{membro.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer Decorator */}
                  <div className="flex justify-between items-center text-[7px] text-muted-foreground border-t border-white/5 pt-2">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-primary" />
                      Documento Oficial Digital
                    </span>
                    <span>Validação no verso</span>
                  </div>
                </div>

                {/* CARD VERSO (Back) */}
                <div className="absolute w-full h-full backface-hidden rotate-y-180 rounded-2xl overflow-hidden shadow-2xl border border-primary/20 bg-gradient-to-br from-[#0b0f19] via-[#111827] to-[#1f2937] text-white flex flex-col justify-between p-4">
                  {/* Top Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-[9px] text-muted-foreground font-bold tracking-wider uppercase">
                    <span>DADOS DE IDENTIFICAÇÃO</span>
                    <span className="text-primary font-bold">VERSO</span>
                  </div>

                  {/* Body Content */}
                  <div className="flex gap-4 py-2 flex-1 items-center">
                    {/* Left: QR Code */}
                    <div className="flex flex-col items-center gap-1 bg-white p-1.5 rounded-lg shadow-md">
                      <QRCode
                        value={getVerificationUrl()}
                        size={80}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        level="M"
                      />
                      <span className="text-[6px] text-black font-semibold uppercase tracking-wider">
                        Escanear Validação
                      </span>
                    </div>

                    {/* Right: Info */}
                    <div className="flex-1 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[9px] text-muted-foreground">
                      <div className="col-span-2">
                        <span className="block text-[8px]">IGREJA VINCULADA</span>
                        <span className="text-white font-bold truncate block">
                          {igreja?.nome || "Sede Principal"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[8px]">NASCIMENTO</span>
                        <span className="text-white font-bold">
                          {membro.dataNascimento ? format(membro.dataNascimento.toDate(), "dd/MM/yyyy") : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[8px]">BATISMO</span>
                        <span className="text-white font-bold">
                          {membro.dataBatismo ? format(membro.dataBatismo.toDate(), "dd/MM/yyyy") : "Não Batizado"}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-[8px]">CONTATO</span>
                        <span className="text-white font-bold truncate block">
                          {formatPhone(membro.telefone)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-2">
                    <div className="flex flex-col items-center">
                      <div className="w-full border-t border-white/30 my-1"></div>
                      <span className="text-[7px] text-muted-foreground uppercase">Assinatura do Membro</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-full border-t border-white/30 my-1"></div>
                      <span className="text-[7px] text-muted-foreground uppercase">Presidente / Dirigente</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hint to Flip */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFlipped(!isFlipped)}
              className="text-xs text-muted-foreground flex items-center gap-1.5 no-print"
            >
              <RefreshCw className="h-3 w-3" />
              Virar Cartão
            </Button>

            {/* Print Friendly Presentation Container (Hidden on Screen, Visible on Print) */}
            <div id="print-card-container" className="hidden">
              {/* Front Card */}
              <div className="w-[340px] h-[215px] rounded-xl border border-black/20 bg-gradient-to-br from-[#0b0f19] via-[#111827] to-[#1f2937] text-white flex flex-col justify-between p-3.5 box-border">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7 border border-white/20 bg-white/10">
                      <AvatarImage src={igreja?.fotoUrl || "/default-church-logo.png"} />
                      <AvatarFallback className="text-[9px] text-white font-bold bg-primary">
                        {igreja?.nome?.slice(0, 2).toUpperCase() || "IG"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-white truncate max-w-[170px]">
                        {igreja?.nome || "Igreja"}
                      </span>
                      <span className="text-[7px] text-muted-foreground tracking-widest uppercase">
                        {igreja?.convencao || "Convenção"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[8px] bg-primary/20 text-primary border border-primary/40 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    CREDENCIAL
                  </span>
                </div>

                <div className="flex items-center gap-3.5 py-1.5 flex-1">
                  <Avatar className="h-20 w-20 border border-primary rounded-lg shadow bg-slate-800">
                    <AvatarImage src={membro.fotoUrl || undefined} className="object-cover" />
                    <AvatarFallback className="text-2xl font-semibold bg-slate-800 text-slate-200">
                      {membro.nome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col justify-center flex-1 min-w-0">
                    <h4 className="text-sm font-bold truncate text-white leading-tight">
                      {membro.nome}
                    </h4>
                    <p className="text-[10px] text-primary font-semibold tracking-wider mt-0.5 uppercase">
                      {membro.cargo && membro.cargo !== "outro"
                        ? CARGOS_MEMBRO[membro.cargo]
                        : membro.cargoDescricao || TIPOS_MEMBRO[membro.tipo]}
                    </p>
                    <div className="grid grid-cols-2 gap-x-2 mt-2 border-t border-white/5 pt-1.5 text-[8px] text-muted-foreground">
                      <div>
                        <span className="block text-[7px] font-medium">MEMBRO DESDE</span>
                        <span className="text-white font-bold">
                          {membro.dataCadastro ? format(membro.dataCadastro.toDate(), "dd/MM/yyyy") : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[7px] font-medium">REGISTRO</span>
                        <span className="text-white font-bold truncate block">
                          #{membro.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[6px] text-muted-foreground border-t border-white/5 pt-1.5">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-2.5 w-2.5 text-primary" />
                    Documento Oficial Digital
                  </span>
                </div>
              </div>

              {/* Back Card */}
              <div className="w-[340px] h-[215px] rounded-xl border border-black/20 bg-gradient-to-br from-[#0b0f19] via-[#111827] to-[#1f2937] text-white flex flex-col justify-between p-3.5 box-border">
                <div className="flex items-center justify-between border-b border-white/10 pb-1 text-[8px] text-muted-foreground font-bold tracking-wider uppercase">
                  <span>DADOS DE IDENTIFICAÇÃO</span>
                  <span className="text-primary font-bold">VERSO</span>
                </div>

                <div className="flex gap-3.5 py-1.5 flex-1 items-center">
                  <div className="flex flex-col items-center gap-0.5 bg-white p-1 rounded shadow-sm">
                    <QRCode
                      value={getVerificationUrl()}
                      size={70}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      level="M"
                    />
                    <span className="text-[5px] text-black font-semibold uppercase tracking-wider">
                      Validação
                    </span>
                  </div>

                  <div className="flex-1 grid grid-cols-2 gap-x-2 gap-y-1 text-[8px] text-muted-foreground">
                    <div className="col-span-2">
                      <span className="block text-[7px]">IGREJA VINCULADA</span>
                      <span className="text-white font-bold truncate block">
                        {igreja?.nome || "Sede Principal"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[7px]">NASCIMENTO</span>
                      <span className="text-white font-bold">
                        {membro.dataNascimento ? format(membro.dataNascimento.toDate(), "dd/MM/yyyy") : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[7px]">BATISMO</span>
                      <span className="text-white font-bold">
                        {membro.dataBatismo ? format(membro.dataBatismo.toDate(), "dd/MM/yyyy") : "Não Batizado"}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-[7px]">CONTATO</span>
                      <span className="text-white font-bold truncate block">
                        {formatPhone(membro.telefone)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-1.5">
                  <div className="flex flex-col items-center">
                    <div className="w-full border-t border-white/30 my-0.5"></div>
                    <span className="text-[6px] text-muted-foreground uppercase">Assinatura do Membro</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-full border-t border-white/30 my-0.5"></div>
                    <span className="text-[6px] text-muted-foreground uppercase">Presidente / Dirigente</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="flex gap-3 justify-center mt-2 no-print">
              <Button onClick={handlePrint} className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Imprimir Credencial
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
