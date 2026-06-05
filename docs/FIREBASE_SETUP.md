# Guia de Configuração do Firebase

## 1. Criar Projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em **"Adicionar projeto"**
3. Digite o nome: `gestao-membros-igreja`
4. Desative o Google Analytics (opcional) e clique em **"Criar projeto"**

---

## 2. Configurar Autenticação por Telefone (SMS)

1. No menu lateral, clique em **"Authentication"**
2. Clique em **"Começar"**
3. Na aba **"Sign-in method"**, clique em **"Telefone"**
4. Ative o toggle e clique em **"Salvar"**

### Adicionar números de teste (desenvolvimento)
1. Role para baixo até **"Números de telefone para teste"**
2. Adicione: `+55 11 999999999` com código `123456`
3. Clique em **"Adicionar"**

---

## 3. Criar Banco de Dados Firestore

1. No menu lateral, clique em **"Firestore Database"**
2. Clique em **"Criar banco de dados"**
3. Selecione **"Iniciar no modo de teste"** (ajustaremos depois)
4. Escolha a região: **"southamerica-east1 (São Paulo)"**
5. Clique em **"Ativar"**

---

## 4. Configurar Regras de Segurança do Firestore

### OPÇÃO A: Regras para DESENVOLVIMENTO (use primeiro para testar)

1. No Firestore, clique na aba **"Regras"**
2. Substitua o conteúdo por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ATENÇÃO: Regras permissivas apenas para desenvolvimento!
    // Trocar para regras de produção antes de publicar
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Clique em **"Publicar"**

### OPÇÃO B: Regras para PRODUÇÃO (use quando estiver pronto)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Função para verificar se usuário está autenticado
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Função para verificar nível de acesso
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.nivelAcesso;
    }
    
    function isAdmin() {
      return isAuthenticated() && getUserRole() == 'admin';
    }
    
    function isLider() {
      return isAuthenticated() && (getUserRole() == 'admin' || getUserRole() == 'lider');
    }
    
    function isObreiro() {
      return isAuthenticated() && (getUserRole() == 'admin' || getUserRole() == 'lider' || getUserRole() == 'obreiro');
    }
    
    // Coleção de Users (controle de acesso) - permite criar próprio perfil
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isAdmin() || request.auth.uid == userId;
      allow delete: if isAdmin();
    }
    
    // Coleção de Membros
    match /membros/{membroId} {
      allow read: if isObreiro();
      allow create: if isLider();
      allow update: if isLider();
      allow delete: if isAdmin();
    }
    
    // Coleção de Grupos
    match /grupos/{grupoId} {
      allow read: if isObreiro();
      allow create: if isLider();
      allow update: if isLider();
      allow delete: if isAdmin();
    }
    
    // Configurações da Igreja
    match /configuracoes/{configId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

---

## 5. Criar Índices do Firestore

1. Na aba **"Índices"**, clique em **"Adicionar índice"**
2. Crie os seguintes índices:

### Índice 1 - Membros por tipo
- Coleção: `membros`
- Campos:
  - `tipoMembro` (Crescente)
  - `nome` (Crescente)

### Índice 2 - Membros por cargo
- Coleção: `membros`
- Campos:
  - `cargo` (Crescente)
  - `nome` (Crescente)

### Índice 3 - Membros por bairro
- Coleção: `membros`
- Campos:
  - `endereco.bairro` (Crescente)
  - `nome` (Crescente)

---

## 6. Obter Credenciais do Projeto

1. Clique no ícone de **engrenagem** (configurações) ao lado de "Visão geral do projeto"
2. Clique em **"Configurações do projeto"**
3. Role até **"Seus aplicativos"** e clique em **"Web"** (ícone `</>`)
4. Registre o app com o nome: `gestao-membros-web`
5. Copie as credenciais que aparecem:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "gestao-membros-igreja.firebaseapp.com",
  projectId: "gestao-membros-igreja",
  storageBucket: "gestao-membros-igreja.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## 7. Configurar Variáveis de Ambiente

No v0, clique no menu **Settings** (canto superior direito) > **Vars** e adicione:

| Variável | Valor |
|----------|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Seu apiKey |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Seu authDomain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Seu projectId |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Seu storageBucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Seu messagingSenderId |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Seu appId |

---

## 8. Configurar Google Maps API

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione o existente
3. Vá em **"APIs e Serviços"** > **"Biblioteca"**
4. Ative as seguintes APIs:
   - **Maps JavaScript API**
   - **Geocoding API**
5. Vá em **"Credenciais"** > **"Criar credenciais"** > **"Chave de API"**
6. Copie a chave e adicione nas variáveis de ambiente:

| Variável | Valor |
|----------|-------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Sua chave da API |

---

## 9. Criar Primeiro Usuário Admin

Após configurar tudo, você precisa criar o primeiro administrador manualmente no Firestore:

1. No Firestore, clique em **"Iniciar coleção"**
2. ID da coleção: `usuarios`
3. ID do documento: (use o UID do primeiro usuário que fizer login)
4. Adicione os campos:

```
nome: "Seu Nome"
telefone: "+5511999999999"
nivelAcesso: "admin"
criadoEm: (timestamp atual)
```

**Dica:** Faça login primeiro pelo sistema, depois copie o UID que aparece no console do navegador e use para criar o documento.

---

## 10. Estrutura das Coleções

### Coleção: `membros`
```javascript
{
  nome: "João Silva",
  telefone: "+5511999999999",
  email: "joao@email.com",
  tipoMembro: "membro", // visitante, congregado, membro, obreiro, lider
  cargo: "diacono", // pastor, evangelista, presbitero, diacono, auxiliar, outro, nenhum
  dataNascimento: Timestamp,
  dataConversao: Timestamp,
  dataBatismo: Timestamp,
  endereco: {
    cep: "01310-100",
    logradouro: "Avenida Paulista",
    numero: "1000",
    complemento: "Apto 101",
    bairro: "Bela Vista",
    cidade: "São Paulo",
    estado: "SP"
  },
  coordenadas: {
    lat: -23.5505,
    lng: -46.6333
  },
  observacoes: "Texto livre",
  foto: "url_da_foto",
  ativo: true,
  criadoEm: Timestamp,
  atualizadoEm: Timestamp,
  criadoPor: "uid_do_usuario"
}
```

### Coleção: `grupos`
```javascript
{
  nome: "Grupo de Estudos - Zona Sul",
  tipo: "estudo", // estudo, visita, acompanhamento
  descricao: "Grupo para estudos bíblicos",
  lider: {
    id: "membro_id",
    nome: "Maria Santos"
  },
  membros: ["membro_id_1", "membro_id_2"],
  linkWhatsApp: "https://chat.whatsapp.com/...",
  ativo: true,
  criadoEm: Timestamp,
  criadoPor: "uid_do_usuario"
}
```

### Coleção: `usuarios`
```javascript
{
  nome: "Admin Igreja",
  telefone: "+5511999999999",
  nivelAcesso: "admin", // admin, lider, obreiro
  membroVinculado: "membro_id", // opcional
  ativo: true,
  criadoEm: Timestamp,
  ultimoAcesso: Timestamp
}
```

---

## Checklist Final

- [ ] Projeto Firebase criado
- [ ] Autenticação por telefone ativada
- [ ] Firestore criado na região São Paulo
- [ ] Regras de segurança configuradas
- [ ] Índices criados
- [ ] App web registrado
- [ ] Variáveis de ambiente configuradas no v0
- [ ] Google Maps API ativada
- [ ] Primeiro usuário admin criado

---

## Suporte

Se tiver problemas:
1. Verifique se todas as variáveis de ambiente estão corretas
2. Confirme que as APIs do Google Maps estão ativadas
3. Teste com número de telefone de teste primeiro
4. Verifique o console do navegador para erros
