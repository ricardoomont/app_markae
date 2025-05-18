-- Desativar o trigger de marcação automática de faltas
ALTER TABLE public.classes DISABLE TRIGGER schedule_automatic_absence;

-- Comentário para documentação
COMMENT ON TABLE public.classes IS 'Trigger de marcação automática de faltas temporariamente desativado para resolver problemas de timeout.'; 