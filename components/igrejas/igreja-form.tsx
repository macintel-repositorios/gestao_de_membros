"use client";

import { useState, useEffect } from "react";
import { getDoc, setDoc, doc, getDocs, Timestamp, collection, query, where, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getIgrejasCollection } from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { Igreja, TipoIgreja, TIPOS_IGREJA, Endereco } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Save, Loader2, Search, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { FotoUpload } from "@/components/membros/foto-upload";

interface IgrejaFormProps {
  igrejaId?: string;
  unidadeId?: string;
  parentIgrejaId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function IgrejaForm({ igrejaId, unidadeId, parentIgrejaId, onSuccess, onCancel }: IgrejaFormProps) {
  const { usuario } = useAuth();
  const [loading, setLoading] = useState(!!igrejaId || !!unidadeId);
  const [saving, setSaving] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [igrejasExistentes, setIgrejasExistentes] = useState<Igreja[]>([]);

  // Form state
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoIgreja>("sede");
  const [codIgreja, setCodIgreja] = useState("");
  const [convencao, setConvencao] = useState("");
  const [ministerio, setMinisterio] = useState("");
  const [igrejaPaiId, setIgrejaPaiId] = useState("");
  const [dirigente, setDirigente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cnpj, setCnpj] = useState("");

  // Endereço
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);

  // Collapsible section states
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [adminNome, setAdminNome] = useState("");
  const [adminTelefone, setAdminTelefone] = useState("");
  const [originalAdmin, setOriginalAdmin] = useState<{ id: string; nome: string; telefone: string, igrejaId?: string, unidadeId?: string, ativo?: boolean, dataCriacao?: any, criadoPor?: string | null } | null>(null);

  useEffect(() => {
    loadIgrejasExistentes();
    if (igrejaId || (unidadeId && parentIgrejaId)) {
      loadIgreja();
    }
  }, [igrejaId, unidadeId, parentIgrejaId]);

  const loadIgreja = async () => {
    if (!db) return;
    
    try {
      setLoading(true);
      let docSnap;
      if (unidadeId && parentIgrejaId) {
        docSnap = await getDoc(doc(db, "igrejas", parentIgrejaId, "unidades", unidadeId));
      } else if (igrejaId) {
        docSnap = await getDoc(doc(db, "igrejas", igrejaId));
      } else {
        setLoading(false);
        return;
      }
      
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Igreja;
        setNome(data.nome || "");
        setTipo(data.tipo || "sede");
        setCodIgreja(data.codIgreja || "");
        setConvencao(data.convencao || "");
        setMinisterio(data.ministerio || "");
        setIgrejaPaiId(data.igrejaPaiId || "");
        setDirigente(data.dirigente || "");
        setTelefone(formatTelefone(data.telefone || ""));
        setEmail(data.email || "");
        setCnpj(formatCnpj(data.cnpj || ""));

        // Endereço
        setCep(formatCep(data.endereco?.cep || ""));
        setLogradouro(data.endereco?.logradouro || "");
        setNumero(data.endereco?.numero || "");
        setComplemento(data.endereco?.complemento || "");
        setBairro(data.endereco?.bairro || "");
        setCidade(data.endereco?.cidade || "");
        setEstado(data.endereco?.estado || "");
        setFotoBase64(data.fotoUrl || null);

        // Carregar o administrador
        try {
          const usuariosRef = collection(db, "usuarios");
          let q;
          if (unidadeId) {
            // Se for unidade (congregação/subcongregação)
            q = query(usuariosRef, where("unidadeId", "==", unidadeId), where("nivelAcesso", "==", "admin"));
          } else if (igrejaId) {
            // Se for a igreja principal (Sede)
            q = query(usuariosRef, where("igrejaId", "==", igrejaId), where("nivelAcesso", "==", "admin"));
          }
          
          if (q) {
            const userSnap = await getDocs(q);
            if (!userSnap.empty) {
              const adminDoc = userSnap.docs[0];
              const adminData = adminDoc.data();
              setOriginalAdmin({
                id: adminDoc.id,
                nome: adminData.nome || "",
                telefone: adminData.telefone || "",
                igrejaId: adminData.igrejaId,
                unidadeId: adminData.unidadeId,
                ativo: adminData.ativo,
                dataCriacao: adminData.dataCriacao,
                criadoPor: adminData.criadoPor,
              });
              setAdminNome(adminData.nome || "");
              setAdminTelefone(formatTelefone(adminData.telefone || ""));
            }
          }
        } catch (err) {
          console.error("Erro ao carregar administrador:", err);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar igreja:", error);
      toast.error("Erro ao carregar igreja");
    } finally {
      setLoading(false);
    }
  };

  const loadIgrejasExistentes = async () => {
    try {
      const snapshot = await getDocs(getIgrejasCollection());
      const data = snapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }) as Igreja)
        .filter(i => i.id !== igrejaId);
      setIgrejasExistentes(data);
    } catch (error) {
      console.error("Erro ao carregar igrejas:", error);
    }
  };

  const buscarCep = async () => {
    if (cep.length < 8) return;

    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setLogradouro(data.logradouro || "");
        setBairro(data.bairro || "");
        setCidade(data.localidade || "");
        setEstado(data.uf || "");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setBuscandoCep(false);
    }
  };

  const formatCep = (value: string) => {
    const numeros = value.replace(/\D/g, "");
    if (numeros.length <= 5) return numeros;
    return `${numeros.slice(0, 5)}-${numeros.slice(5, 8)}`;
  };

  const formatTelefone = (value: string) => {
    const numeros = value.replace(/\D/g, "");
    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 6) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    if (numeros.length <= 10) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
  };

  const formatCnpj = (value: string) => {
    const numeros = value.replace(/\D/g, "");
    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 5) return `${numeros.slice(0, 2)}.${numeros.slice(2)}`;
    if (numeros.length <= 8) return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5)}`;
    if (numeros.length <= 12) return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8)}`;
    return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8, 12)}-${numeros.slice(12, 14)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim() || !db) {
      toast.error("O nome da igreja é obrigatório.");
      return;
    }

    if (!adminNome.trim() || !adminTelefone.trim()) {
      toast.error("O nome e telefone do administrador são obrigatórios.");
      return;
    }
    const adminPhoneDigits = adminTelefone.replace(/\D/g, "");
    if (adminPhoneDigits.length < 10) {
      toast.error("Telefone do administrador inválido.");
      return;
    }

    setSaving(true);
    try {
      const cleanNewPhone = adminTelefone.replace(/\D/g, "");

      const endereco: Endereco = {
        cep: cep.replace(/\D/g, ""),
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
      };

      const targetId = igrejaId || unidadeId || doc(collection(db!, "igrejas")).id;
      let docRef;
      if (unidadeId && parentIgrejaId) {
        docRef = doc(db!, "igrejas", parentIgrejaId, "unidades", unidadeId);
      } else {
        docRef = doc(db!, "igrejas", targetId);
      }

      const dataToSave = {
        nome: nome.trim(),
        tipo,
        codIgreja: codIgreja.trim() || null,
        convencao: convencao.trim() || null,
        ministerio: ministerio.trim() || null,
        igrejaPaiId: igrejaPaiId || null,
        dirigente: dirigente.trim() || null,
        telefone: telefone.replace(/\D/g, "") || null,
        email: email.trim().toLowerCase() || null,
        cnpj: cnpj.replace(/\D/g, "") || null,
        fotoUrl: fotoBase64 || null,
        endereco,
        ativa: true,
        atualizadoPor: usuario?.uid || null,
        dataAtualizacao: Timestamp.now(),
      } as any;

      if (!igrejaId && !unidadeId) {
        dataToSave.dataCadastro = Timestamp.now();
      }

      await setDoc(docRef, dataToSave, { merge: true });

      if (!igrejaId && !unidadeId) {
        // 1. Cria a unidade Sede para esta nova igreja
        const unidadesCollectionRef = collection(db!, "igrejas", targetId, "unidades");
        const novaUnidadeSedeRef = await addDoc(unidadesCollectionRef, {
          nome: "Sede - " + nome.trim(),
          tipo: "sede",
          dataCriacao: Timestamp.now(),
          ativa: true,
          dirigente: dirigente.trim() || null,
          telefone: telefone.replace(/\D/g, "") || null,
          endereco: logradouro ? {
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            estado,
            cep: cep.replace(/\D/g, "")
          } : null
        });
        const newUnidadeId = novaUnidadeSedeRef.id;

        // 2. Cria a Regional 1 correspondente
        const regCollectionRef = collection(db!, "igrejas", targetId, "regionais_setores");
        const regDocRef = await addDoc(regCollectionRef, {
          tipo: "regional",
          numero: 1,
          nome: "Regional 1",
          hospedeiraId: newUnidadeId,
          dirigente: dirigente.trim() || null,
          igrejasMembrosIds: [],
          dataCriacao: Timestamp.now(),
        });
        const newRegId = regDocRef.id;

        // Vincula a regional/setor de volta à Sede
        const sedeRef = doc(db!, "igrejas", targetId, "unidades", newUnidadeId);
        await updateDoc(sedeRef, {
          ehHospedeira: true,
          hospedaRegionalId: newRegId,
          regionalSetorId: newRegId,
        });

        // 3. Cria ou vincula o usuário administrador
        const adminPhoneDigits = adminTelefone.replace(/\D/g, "");
        const adminUserId = `+55${adminPhoneDigits}`;

        // Verifica se já existe um usuário com esse telefone no banco
        const usuariosRef = collection(db!, "usuarios");
        const q = query(usuariosRef, where("telefone", "==", adminTelefone));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          // Atualiza usuário existente para ser o admin da nova igreja
          const existingUserDoc = snapshot.docs[0];
          const userRef = doc(db!, "usuarios", existingUserDoc.id);
          await updateDoc(userRef, {
            nome: adminNome.trim(),
            nivelAcesso: "admin",
            igrejaId: targetId,
            unidadeId: newUnidadeId,
            ativo: true,
            dataAtualizacao: Timestamp.now()
          });
        } else {
          // Cria novo pré-cadastro
          const userRef = doc(db!, "usuarios", adminUserId);
          await setDoc(userRef, {
            telefone: adminTelefone,
            nome: adminNome.trim(),
            nivelAcesso: "admin",
            igrejaId: targetId,
            unidadeId: newUnidadeId,
            ativo: true,
            dataCriacao: Timestamp.now(),
            criadoPor: usuario?.uid || null,
          });
        }
      } else {
        // Edit flow for admin user
        if (originalAdmin) {
          const cleanNewPhone = adminTelefone.replace(/\D/g, "");
          const cleanOldPhone = originalAdmin.telefone.replace(/\D/g, "");
          
          if (cleanNewPhone === cleanOldPhone) {
            // Apenas atualiza o nome do administrador existente
            const userRef = doc(db!, "usuarios", originalAdmin.id);
            await updateDoc(userRef, {
              nome: adminNome.trim(),
              dataAtualizacao: Timestamp.now(),
            });
          } else {
            // O telefone mudou: verifica se o novo telefone já existe no banco
            const usuariosRef = collection(db!, "usuarios");
            const q = query(usuariosRef, where("telefone", "==", adminTelefone));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
              // Se já existe um usuário com esse novo número, atualiza ele e remove o antigo
              const existingUserDoc = snapshot.docs[0];
              const userRef = doc(db!, "usuarios", existingUserDoc.id);
              await updateDoc(userRef, {
                nome: adminNome.trim(),
                nivelAcesso: "admin",
                igrejaId: originalAdmin.igrejaId || igrejaId || parentIgrejaId || targetId,
                unidadeId: originalAdmin.unidadeId || unidadeId || null,
                ativo: true,
                dataAtualizacao: Timestamp.now()
              });

              // Deleta o registro antigo originalAdmin
              const oldAdminDocRef = doc(db!, "usuarios", originalAdmin.id);
              await deleteDoc(oldAdminDocRef);
            } else {
              // Se não existe, cria o novo documento pré-cadastrado e remove o originalAdmin antigo
              const cleanNewPhoneWithPrefix = `+55${cleanNewPhone}`;
              const newAdminDocRef = doc(db!, "usuarios", cleanNewPhoneWithPrefix);
              
              await setDoc(newAdminDocRef, {
                telefone: adminTelefone,
                nome: adminNome.trim(),
                nivelAcesso: "admin",
                igrejaId: originalAdmin.igrejaId || igrejaId || parentIgrejaId || targetId,
                unidadeId: originalAdmin.unidadeId || unidadeId || null,
                ativo: originalAdmin.ativo !== undefined ? originalAdmin.ativo : true,
                dataCriacao: originalAdmin.dataCriacao || Timestamp.now(),
                criadoPor: originalAdmin.criadoPor || usuario?.uid || null,
                dataAtualizacao: Timestamp.now(),
              });

              const oldAdminDocRef = doc(db!, "usuarios", originalAdmin.id);
              await deleteDoc(oldAdminDocRef);
            }
          }
        } else {
          // Se não havia administrador cadastrado anteriormente, mas o usuário digitou agora
          if (adminNome.trim() && adminTelefone.trim()) {
            const adminPhoneDigits = adminTelefone.replace(/\D/g, "");
            const adminUserId = `+55${adminPhoneDigits}`;
            
            // Verifica se o telefone já existe no banco
            const usuariosRef = collection(db!, "usuarios");
            const q = query(usuariosRef, where("telefone", "==", adminTelefone));
            const snapshot = await getDocs(q);
            
            let finalUnidadeId = unidadeId || null;
            if (!finalUnidadeId && igrejaId) {
              const unitsRef = collection(db!, "igrejas", igrejaId, "unidades");
              const qSub = query(unitsRef, where("tipo", "==", "sede"));
              const qSnap = await getDocs(qSub);
              if (!qSnap.empty) {
                finalUnidadeId = qSnap.docs[0].id;
              }
            }

            if (!snapshot.empty) {
              // Atualiza o existente
              const existingUserDoc = snapshot.docs[0];
              const userRef = doc(db!, "usuarios", existingUserDoc.id);
              await updateDoc(userRef, {
                nome: adminNome.trim(),
                nivelAcesso: "admin",
                igrejaId: igrejaId || parentIgrejaId || targetId,
                unidadeId: finalUnidadeId,
                ativo: true,
                dataAtualizacao: Timestamp.now()
              });
            } else {
              // Cria novo pré-cadastro
              const newAdminDocRef = doc(db!, "usuarios", adminUserId);
              await setDoc(newAdminDocRef, {
                telefone: adminTelefone,
                nome: adminNome.trim(),
                nivelAcesso: "admin",
                igrejaId: igrejaId || parentIgrejaId || targetId,
                unidadeId: finalUnidadeId,
                ativo: true,
                dataCriacao: Timestamp.now(),
                criadoPor: usuario?.uid || null,
              });
            }
          }
        }
      }

      toast.success(igrejaId || unidadeId ? "Igreja atualizada com sucesso!" : "Igreja criada com sucesso!");
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Erro ao salvar igreja:", error);
      toast.error("Erro ao salvar os dados da igreja.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pt-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-2">
      {/* Logo da Igreja */}
      <Collapsible open={activeSection === "logo"} onOpenChange={(open) => setActiveSection(open ? "logo" : null)} className="w-full">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">Logo da Igreja</CardTitle>
                  <CardDescription>Envie o logotipo ou foto identificativa da igreja</CardDescription>
                  {activeSection !== "logo" && fotoBase64 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Imagem de logo cadastrada
                    </p>
                  )}
                </div>
                {activeSection === "logo" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="flex justify-center pt-2">
              <FotoUpload
                fotoUrl={fotoBase64 || undefined}
                nome={nome}
                onFotoChange={setFotoBase64}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Dados Principais */}
      <Collapsible open={activeSection === "dados"} onOpenChange={(open) => setActiveSection(open ? "dados" : null)} className="w-full">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">Dados Principais</CardTitle>
                  <CardDescription>Informações básicas da igreja</CardDescription>
                  {activeSection !== "dados" && nome && (
                    <p className="text-xs text-muted-foreground">
                      Nome: <span className="font-semibold text-primary">{nome}</span>
                    </p>
                  )}
                </div>
                {activeSection === "dados" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Igreja *</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Igreja Missão Restaurar"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select value={tipo} onValueChange={(v) => setTipo(v as TipoIgreja)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPOS_IGREJA).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {tipo !== "sede" && igrejasExistentes.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="igrejaPai">Igreja Matriz</Label>
                  <Select value={igrejaPaiId} onValueChange={setIgrejaPaiId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a igreja matriz" />
                    </SelectTrigger>
                    <SelectContent>
                      {igrejasExistentes
                        .filter(i => i.tipo === "sede" || i.tipo === "congregacao")
                        .map((igreja) => (
                          <SelectItem key={igreja.id} value={igreja.id}>
                            {igreja.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="codIgreja">Código da Igreja</Label>
                  <Input
                    id="codIgreja"
                    value={codIgreja}
                    onChange={(e) => setCodIgreja(e.target.value)}
                    placeholder="Ex: IMR-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="convencao">Convenção</Label>
                  <Input
                    id="convencao"
                    value={convencao}
                    onChange={(e) => setConvencao(e.target.value)}
                    placeholder="Ex: CGADB"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ministerio">Ministério</Label>
                  <Input
                    id="ministerio"
                    value={ministerio}
                    onChange={(e) => setMinisterio(e.target.value)}
                    placeholder="Ex: Ministério Madureira"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dirigente">Dirigente/Pastor</Label>
                <Input
                  id="dirigente"
                  value={dirigente}
                  onChange={(e) => setDirigente(e.target.value)}
                  placeholder="Nome do pastor ou dirigente"
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Contato */}
      <Collapsible open={activeSection === "contato"} onOpenChange={(open) => setActiveSection(open ? "contato" : null)} className="w-full">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">Contato</CardTitle>
                  <CardDescription>Informações de contato da igreja</CardDescription>
                  {activeSection !== "contato" && (telefone || email) && (
                    <p className="text-xs text-muted-foreground">
                      {telefone && <span>Telefone: <span className="font-semibold text-primary">{telefone}</span></span>}
                      {telefone && email && <span className="mx-2">|</span>}
                      {email && <span>Email: <span className="font-semibold text-primary">{email}</span></span>}
                    </p>
                  )}
                </div>
                {activeSection === "contato" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={telefone}
                    onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@igreja.com"
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Endereço */}
      <Collapsible open={activeSection === "endereco"} onOpenChange={(open) => setActiveSection(open ? "endereco" : null)} className="w-full">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">Endereço</CardTitle>
                  <CardDescription>Localização da igreja</CardDescription>
                  {activeSection !== "endereco" && logradouro && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-primary">{logradouro}</span>, {numero || "s/n"} - {bairro || "N/A"}, {cidade || "N/A"}/{estado || "N/A"}
                    </p>
                  )}
                </div>
                {activeSection === "endereco" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={cep}
                    onChange={(e) => setCep(formatCep(e.target.value))}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-8"
                  onClick={buscarCep}
                  disabled={buscandoCep || cep.length < 9}
                >
                  {buscandoCep ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="ml-2">Buscar</span>
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="logradouro">Logradouro</Label>
                  <Input
                    id="logradouro"
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    placeholder="Rua, Avenida, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="123"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    placeholder="Apto, Bloco, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    placeholder="Bairro"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value.toUpperCase())}
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Administrador do Sistema */}
      <Collapsible open={activeSection === "admin"} onOpenChange={(open) => setActiveSection(open ? "admin" : null)} className="w-full">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors select-none">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">Administrador do Sistema</CardTitle>
                  <CardDescription>Dados do usuário administrativo da igreja</CardDescription>
                  {activeSection !== "admin" && adminNome && (
                    <p className="text-xs text-muted-foreground">
                      Admin: <span className="font-semibold text-primary">{adminNome}</span> ({adminTelefone})
                    </p>
                  )}
                </div>
                {activeSection === "admin" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adminNome">Nome do Administrador *</Label>
                  <Input
                    id="adminNome"
                    value={adminNome}
                    onChange={(e) => setAdminNome(e.target.value)}
                    placeholder="Nome do administrador"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminTelefone">Telefone (WhatsApp) *</Label>
                  <Input
                    id="adminTelefone"
                    value={adminTelefone}
                    onChange={(e) => setAdminTelefone(formatTelefone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Ações */}
      <div className="flex gap-4 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
