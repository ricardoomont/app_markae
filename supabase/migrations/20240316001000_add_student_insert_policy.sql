-- Adicionar política para permitir que alunos insiram seus próprios registros de presença
CREATE POLICY "Students can insert their own attendance"
ON public.attendance
FOR INSERT
TO public
WITH CHECK (
  -- Verifica se o usuário é um aluno
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'student'
  )
  -- Garante que o aluno só pode inserir presença para si mesmo
  AND student_id = auth.uid()
); 