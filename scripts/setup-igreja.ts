/**
 * Script para configurar a estrutura inicial do multi-tenant
 * 
 * INSTRUÇÕES:
 * 1. Execute este script uma única vez para criar a igreja e o admin inicial
 * 2. Execute com: npx tsx scripts/setup-igreja.ts
 */

import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";

// Configuração do Firebase
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyBoebknqDbr51x26vaKTeTGRvnNZz5J6xc",
  authDomain: "gestao-membros-igreja.firebaseapp.com",
  projectId: "gestao-membros-igreja",
  storageBucket: "gestao-membros-igreja.firebasestorage.app",
  messagingSenderId: "700414236640",
  appId: "1:700414236640:web:823001c849f20043a3fd85"
};

// ============================================
// DADOS DA IGREJA
// ============================================

const IGREJA_ID = "igreja-missao-restaurar";

const DADOS_IGREJA = {
  nome: "ADBras Santo Eduardo",
  endereco: "Rua Ivo Temporim, 27",
  cidade: "São Paulo",
  estado: "SP",
  cep: "03904-090",
  telefone: "(11) 99999-9999",
  email: "contato@suaigreja.com",
  latitude: -23.5783396,
  longitude: -46.5211709,
};

// UID do admin - pegue do Firebase Authentication (não do Firestore)
// Vá em Firebase Console > Authentication > Users e copie o UID
const ADMIN_UID = "paupeU6JenXxXdQfBn7iR5oJanH2";
const ADMIN_TELEFONE = "(11) 99925-7272";
const ADMIN_NOME = "Administrador";

// ============================================

async function setup(): Promise<void> {
  console.log("Iniciando configuração...\n");

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  try {
    // 1. Criar documento da igreja
    console.log("1. Criando documento da igreja...");
    await setDoc(doc(db, "igrejas", IGREJA_ID), {
      ...DADOS_IGREJA,
      dataCadastro: Timestamp.now(),
      ativo: true,
    });
    console.log(`   Igreja criada com ID: ${IGREJA_ID}`);

    // 2. Criar/Atualizar usuário admin
    console.log("\n2. Configurando usuário admin...");
    await setDoc(doc(db, "usuarios", ADMIN_UID), {
      telefone: ADMIN_TELEFONE,
      nome: ADMIN_NOME,
      nivelAcesso: "admin",
      igrejaId: IGREJA_ID,
      ativo: true,
      dataCriacao: Timestamp.now(),
    });
    console.log(`   Admin criado/atualizado com UID: ${ADMIN_UID}`);

    console.log("\n Configuração concluída com sucesso!");
    console.log("\nPróximos passos:");
    console.log("1. Faça login no sistema com o número do admin");
    console.log("2. Todos os dados serão salvos em:");
    console.log(`   /igrejas/${IGREJA_ID}/membros`);
    console.log(`   /igrejas/${IGREJA_ID}/grupos`);
    console.log(`   /igrejas/${IGREJA_ID}/acompanhamentos`);

  } catch (error) {
    console.error("Erro durante a configuração:", error);
  }

  process.exit(0);
}

setup();
