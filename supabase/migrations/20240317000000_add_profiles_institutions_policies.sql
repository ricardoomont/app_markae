-- Remover políticas existentes
DROP POLICY IF EXISTS "Usuários podem ver seus próprios perfis" ON public.profiles;
DROP POLICY IF EXISTS "Administradores e coordenadores podem gerenciar perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver suas instituições" ON public.institutions;
DROP POLICY IF EXISTS "Administradores podem gerenciar instituições" ON public.institutions;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_modify_policy" ON public.profiles;
DROP POLICY IF EXISTS "institutions_select_policy" ON public.institutions;
DROP POLICY IF EXISTS "institutions_modify_policy" ON public.institutions;

-- Habilitar RLS para as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- Política básica para profiles: usuário vê seu próprio perfil
CREATE POLICY "view_own_profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

-- Política para admins/coords/teachers: podem ver perfis da mesma instituição
CREATE POLICY "view_institution_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles AS viewer
    WHERE viewer.id = auth.uid()
    AND viewer.institution_id = profiles.institution_id
    AND viewer.role IN ('admin', 'coordinator', 'teacher')
  )
);

-- Política para modificação de perfis por admins/coords
CREATE POLICY "modify_institution_profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles AS admin
    WHERE admin.id = auth.uid()
    AND admin.institution_id = profiles.institution_id
    AND admin.role IN ('admin', 'coordinator')
  )
);

-- Política para visualização de instituições
CREATE POLICY "view_own_institution"
ON public.institutions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.institution_id = institutions.id
  )
);

-- Política para modificação de instituições por admins
CREATE POLICY "modify_own_institution"
ON public.institutions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.institution_id = institutions.id
    AND profiles.role = 'admin'
  )
); 