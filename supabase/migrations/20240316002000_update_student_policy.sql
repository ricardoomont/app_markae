-- Remover todas as políticas antigas
DROP POLICY IF EXISTS "Students can insert their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Enable insert for students" ON public.attendance;
DROP POLICY IF EXISTS "Alunos podem registrar sua própria presença" ON public.attendance;

-- Criar uma nova política mais clara
CREATE POLICY "students_can_confirm_attendance"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (
  -- Verifica se o usuário é um aluno
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'student'
  )
  -- Garante que o aluno só pode inserir presença para si mesmo
  AND student_id = auth.uid()
  -- Verifica se a aula está ativa e dentro do horário permitido
  AND EXISTS (
    SELECT 1 FROM classes c
    JOIN class_times ct ON c.class_time_id = ct.id
    JOIN institution_settings ist ON c.institution_id = ist.institution_id
    WHERE c.id = class_id
    AND c.active = true
    AND c.date = CURRENT_DATE
    AND (c.date || ' ' || ct.start_time)::timestamp <= CURRENT_TIMESTAMP
    AND (c.date || ' ' || ct.end_time)::timestamp + 
        (COALESCE(ist.attendance_window_minutes, 15) || ' minutes')::interval >= CURRENT_TIMESTAMP
  )
); 