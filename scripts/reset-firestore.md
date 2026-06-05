# Como Resetar o Banco de Dados Firestore

## Opção 1: Via Firebase Console (Recomendado)

1. Acesse o [Firebase Console](https://console.firebase.google.com)
2. Selecione seu projeto: **gestao-membros-igreja**
3. Vá em **Firestore Database**
4. Para cada coleção, clique nos três pontos (...) e selecione **Delete collection**

### Coleções para deletar:
- `igrejas` (e todas as subcoleções: membros, unidades, grupos, acompanhamentos)
- `usuarios`

## Opção 2: Via Firebase CLI

```bash
# Instale o Firebase CLI se ainda não tiver
npm install -g firebase-tools

# Faça login
firebase login

# Delete as coleções (substitua PROJECT_ID pelo ID do seu projeto)
firebase firestore:delete --all-collections --project gestao-membros-igreja
```

## Opção 3: Script Node.js

Crie um arquivo `reset-db.js` e execute com Node:

```javascript
const admin = require('firebase-admin');

// Inicialize com suas credenciais
admin.initializeApp({
  credential: admin.credential.cert('./serviceAccountKey.json')
});

const db = admin.firestore();

async function deleteCollection(collectionPath) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(500);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db, query, resolve) {
  const snapshot = await query.get();

  if (snapshot.size === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

async function resetDatabase() {
  console.log('Deletando coleção usuarios...');
  await deleteCollection('usuarios');
  
  console.log('Deletando coleção igrejas...');
  await deleteCollection('igrejas');
  
  console.log('Banco resetado com sucesso!');
  process.exit(0);
}

resetDatabase();
```

## Após Resetar

1. O primeiro usuário que fizer login será direcionado para cadastrar sua igreja
2. Esse usuário terá acesso `full` automaticamente
3. A igreja criada terá uma unidade padrão (sede) criada automaticamente
4. Todos os membros cadastrados serão vinculados a essa igreja

## Estrutura do Banco Após Setup

```
/usuarios/{userId}
  - nome: string
  - telefone: string
  - igrejaId: string (referência à igreja)
  - unidadeId: string (referência à unidade)
  - nivelAcesso: "full" | "admin" | "lider" | "obreiro" | "user"
  - ativo: boolean
  - dataCriacao: timestamp

/igrejas/{igrejaId}
  - nome: string
  - tipo: "sede" | "congregacao" | "subcongregacao" | "missao" | "outro"
  - dirigente: string
  - convencao: string
  - ministerio: string
  - igrejaPaiId: string (para congregações/subcongregações)
  - endereco: object
  - telefone: string
  - email: string
  - cnpj: string
  - ativa: boolean
  - dataCadastro: timestamp

/igrejas/{igrejaId}/unidades/{unidadeId}
  - nome: string
  - tipo: "sede" | "congregacao" | "subcongregacao"
  - endereco: object
  - dataCriacao: timestamp

/igrejas/{igrejaId}/membros/{membroId}
  - nome: string
  - tipo: string
  - unidadeId: string
  - ... outros campos

/igrejas/{igrejaId}/grupos/{grupoId}
  - nome: string
  - ... outros campos

/igrejas/{igrejaId}/acompanhamentos/{acompId}
  - ... campos
```
