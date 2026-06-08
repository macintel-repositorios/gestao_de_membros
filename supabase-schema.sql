-- Script de criação do Schema do Banco de Dados no Supabase

-- 1. Tabela de Igrejas (Matrizes)
CREATE TABLE IF NOT EXISTS igrejas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    convencao TEXT,
    ministerio TEXT,
    dirigente TEXT,
    telefone TEXT,
    email TEXT,
    cnpj TEXT,
    foto_url TEXT,
    cep TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    ativa BOOLEAN DEFAULT true
);

-- 2. Tabela de Unidades (Sedes locais, Congregações, Subcongregações)
CREATE TABLE IF NOT EXISTS unidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID REFERENCES igrejas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('sede', 'congregacao', 'subcongregacao', 'ponto_evangelistico')),
    unidade_pai_id UUID REFERENCES unidades(id) ON DELETE SET NULL,
    dirigente TEXT,
    telefone TEXT,
    cep TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT,
    foto_url TEXT,
    eh_hospedeira BOOLEAN DEFAULT false,
    regional_setor_id UUID, -- Será vinculada por chave estrangeira depois da criação da tabela correspondente
    ativa BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabela de Regionais e Setores
CREATE TABLE IF NOT EXISTS regionais_setores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID REFERENCES igrejas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('regional', 'setor')),
    numero INTEGER NOT NULL,
    nome TEXT NOT NULL,
    hospedeira_id UUID REFERENCES unidades(id) ON DELETE SET NULL,
    dirigente TEXT,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Adicionar chave estrangeira de regional_setor_id na tabela unidades
ALTER TABLE unidades DROP CONSTRAINT IF EXISTS fk_unidades_regional_setor;
ALTER TABLE unidades 
ADD CONSTRAINT fk_unidades_regional_setor 
FOREIGN KEY (regional_setor_id) REFERENCES regionais_setores(id) ON DELETE SET NULL;

-- 4. Tabela de Usuários (Administradores/Operadores) vinculados ao Supabase Auth
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT UNIQUE NOT NULL,
    nivel_acesso TEXT NOT NULL CHECK (nivel_acesso IN ('full', 'admin', 'lider', 'user')),
    igreja_id UUID REFERENCES igrejas(id) ON DELETE SET NULL,
    unidade_id UUID REFERENCES unidades(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Tabela de Membros
CREATE TABLE IF NOT EXISTS membros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID REFERENCES igrejas(id) ON DELETE CASCADE,
    unidade_id UUID REFERENCES unidades(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    foto_url TEXT,
    data_nascimento DATE,
    estado_civil TEXT,
    data_batismo DATE,
    cargo TEXT,
    situacao TEXT DEFAULT 'ativo',
    tipo TEXT NOT NULL CHECK (tipo IN ('visitante', 'congregado', 'membro', 'obreiro', 'lider')),
    sexo TEXT,
    cep TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    cargo_descricao TEXT,
    nome_conjuge TEXT,
    conjuge_id UUID,
    tem_funcao_igreja BOOLEAN DEFAULT false,
    funcoes JSONB,
    funcao_descricao TEXT,
    departamentos JSONB,
    departamento_descricao TEXT,
    eh_lider BOOLEAN DEFAULT false,
    lider_de TEXT,
    grupo_id UUID,
    data_conversao DATE,
    observacoes TEXT,
    criado_por UUID,
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Tabela de Visitantes
CREATE TABLE IF NOT EXISTS visitantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID REFERENCES igrejas(id) ON DELETE CASCADE,
    unidade_id UUID REFERENCES unidades(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    data_nascimento DATE,
    data_visita DATE NOT NULL,
    acompanhantes JSONB,
    ja_recebeu_jesus BOOLEAN DEFAULT false,
    pertence_igreja BOOLEAN DEFAULT false,
    qual_igreja TEXT,
    primeira_visita BOOLEAN DEFAULT true,
    convidado_por TEXT,
    pedido_oracao TEXT,
    observacoes TEXT,
    convertido_para_membro BOOLEAN DEFAULT false,
    membro_id UUID,
    ativo BOOLEAN DEFAULT true,
    criado_por UUID,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Tabela de Grupos
CREATE TABLE IF NOT EXISTS grupos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID REFERENCES igrejas(id) ON DELETE CASCADE,
    unidade_id UUID REFERENCES unidades(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL,
    lider_uid UUID,
    membros_ids JSONB,
    link_whatsapp TEXT,
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Tabela de Acompanhamentos
CREATE TABLE IF NOT EXISTS acompanhamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID REFERENCES igrejas(id) ON DELETE CASCADE,
    unidade_id UUID REFERENCES unidades(id) ON DELETE CASCADE,
    membro_id UUID REFERENCES membros(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    data TIMESTAMP WITH TIME ZONE NOT NULL,
    responsavel_uid UUID,
    descricao TEXT NOT NULL,
    dados_hospital JSONB,
    proximo_contato TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. Tabela de Famílias
CREATE TABLE IF NOT EXISTS familias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID REFERENCES igrejas(id) ON DELETE CASCADE,
    unidade_id UUID REFERENCES unidades(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    responsavel_1_id UUID REFERENCES membros(id) ON DELETE CASCADE,
    responsavel_2_id UUID REFERENCES membros(id) ON DELETE SET NULL,
    dependentes JSONB,
    observacoes TEXT,
    criado_por UUID,
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ativar Row Level Security (RLS)
ALTER TABLE igrejas ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE regionais_setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE acompanhamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE familias ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para capturar a igreja do usuário logado de forma segura
CREATE OR REPLACE FUNCTION public.get_current_igreja_id()
RETURNS UUID AS $$
  SELECT igreja_id FROM public.usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Criar políticas seguras de acesso multi-igrejas

-- Igrejas
DROP POLICY IF EXISTS "Permitir inserção pública de igrejas" ON igrejas;
DROP POLICY IF EXISTS "Permitir leitura pública de igrejas" ON igrejas;
DROP POLICY IF EXISTS "Permitir alteração apenas da própria igreja" ON igrejas;
CREATE POLICY "Permitir inserção pública de igrejas" ON igrejas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leitura pública de igrejas" ON igrejas FOR SELECT USING (true);
CREATE POLICY "Permitir alteração apenas da própria igreja" ON igrejas 
FOR UPDATE TO authenticated 
USING (id = public.get_current_igreja_id()) 
WITH CHECK (id = public.get_current_igreja_id());

-- Unidades
DROP POLICY IF EXISTS "Permitir inserção pública de unidades" ON unidades;
DROP POLICY IF EXISTS "Permitir leitura pública de unidades" ON unidades;
DROP POLICY IF EXISTS "Permitir alteração apenas das unidades da própria igreja" ON unidades;
CREATE POLICY "Permitir inserção pública de unidades" ON unidades FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leitura pública de unidades" ON unidades FOR SELECT USING (true);
CREATE POLICY "Permitir alteração apenas das unidades da própria igreja" ON unidades 
FOR UPDATE TO authenticated 
USING (igreja_id = public.get_current_igreja_id()) 
WITH CHECK (igreja_id = public.get_current_igreja_id());

-- Regionais
DROP POLICY IF EXISTS "Permitir inserção pública de regionais" ON regionais_setores;
DROP POLICY IF EXISTS "Permitir leitura pública de regionais" ON regionais_setores;
DROP POLICY IF EXISTS "Permitir alteração apenas das regionais da própria igreja" ON regionais_setores;
CREATE POLICY "Permitir inserção pública de regionais" ON regionais_setores FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leitura pública de regionais" ON regionais_setores FOR SELECT USING (true);
CREATE POLICY "Permitir alteração apenas das regionais da própria igreja" ON regionais_setores 
FOR UPDATE TO authenticated 
USING (igreja_id = public.get_current_igreja_id()) 
WITH CHECK (igreja_id = public.get_current_igreja_id());

-- Usuários
DROP POLICY IF EXISTS "Permitir inserção pública de usuarios" ON usuarios;
DROP POLICY IF EXISTS "Permitir leitura e alteração de usuarios da própria igreja" ON usuarios;
CREATE POLICY "Permitir inserção pública de usuarios" ON usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leitura e alteração de usuarios da própria igreja" ON usuarios 
FOR ALL TO authenticated 
USING (igreja_id = public.get_current_igreja_id()) 
WITH CHECK (igreja_id = public.get_current_igreja_id());

-- Membros
DROP POLICY IF EXISTS "Permitir leitura e alteração de membros da própria igreja" ON membros;
CREATE POLICY "Permitir leitura e alteração de membros da própria igreja" ON membros 
FOR ALL TO authenticated 
USING (igreja_id = public.get_current_igreja_id()) 
WITH CHECK (igreja_id = public.get_current_igreja_id());

-- Visitantes
DROP POLICY IF EXISTS "Permitir leitura e alteração de visitantes da própria igreja" ON visitantes;
CREATE POLICY "Permitir leitura e alteração de visitantes da própria igreja" ON visitantes 
FOR ALL TO authenticated 
USING (igreja_id = public.get_current_igreja_id()) 
WITH CHECK (igreja_id = public.get_current_igreja_id());

-- Grupos
DROP POLICY IF EXISTS "Permitir leitura e alteração de grupos da própria igreja" ON grupos;
CREATE POLICY "Permitir leitura e alteração de grupos da própria igreja" ON grupos 
FOR ALL TO authenticated 
USING (igreja_id = public.get_current_igreja_id()) 
WITH CHECK (igreja_id = public.get_current_igreja_id());

-- Acompanhamentos
DROP POLICY IF EXISTS "Permitir leitura e alteração de acompanhamentos da própria igreja" ON acompanhamentos;
CREATE POLICY "Permitir leitura e alteração de acompanhamentos da própria igreja" ON acompanhamentos 
FOR ALL TO authenticated 
USING (igreja_id = public.get_current_igreja_id()) 
WITH CHECK (igreja_id = public.get_current_igreja_id());

-- Famílias
DROP POLICY IF EXISTS "Permitir leitura e alteração de familias da própria igreja" ON familias;
CREATE POLICY "Permitir leitura e alteração de familias da própria igreja" ON familias 
FOR ALL TO authenticated 
USING (igreja_id = public.get_current_igreja_id()) 
WITH CHECK (igreja_id = public.get_current_igreja_id());
