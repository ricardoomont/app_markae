-- Habilitar RLS para a tabela attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Política para permitir que alunos registrem sua própria presença
CREATE POLICY "Alunos podem registrar sua própria presença"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (
  -- Verifica se o usuário é um aluno
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'student'
  )
  -- Verifica se o registro é para o próprio aluno
  AND student_id = auth.uid()
  -- Verifica se a aula está ativa
  AND EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = class_id
    AND active = true
  )
);

-- Política para permitir que professores gerenciem presenças de suas aulas
CREATE POLICY "Professores podem gerenciar presenças de suas aulas"
ON public.attendance
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.classes c
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE c.id = attendance.class_id
    AND c.teacher_id = p.id
    AND p.role = 'teacher'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.classes c
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE c.id = attendance.class_id
    AND c.teacher_id = p.id
    AND p.role = 'teacher'
  )
);

-- Política para permitir que administradores e coordenadores gerenciem todas as presenças
CREATE POLICY "Administradores e coordenadores podem gerenciar todas as presenças"
ON public.attendance
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'coordinator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'coordinator')
  )
);

-- Política para permitir que alunos vejam suas próprias presenças
CREATE POLICY "Alunos podem ver suas próprias presenças"
ON public.attendance
FOR SELECT
TO authenticated
USING (
  student_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'student'
  )
); 