-- Remover políticas antigas da tabela attendance
DROP POLICY IF EXISTS "Alunos podem registrar sua própria presença" ON public.attendance;
DROP POLICY IF EXISTS "Professores podem gerenciar presenças de suas aulas" ON public.attendance;
DROP POLICY IF EXISTS "Administradores e coordenadores podem gerenciar todas as presenças" ON public.attendance;
DROP POLICY IF EXISTS "Alunos podem ver suas próprias presenças" ON public.attendance; 