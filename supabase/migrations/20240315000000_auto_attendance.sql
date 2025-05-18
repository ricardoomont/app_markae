-- Função para marcar faltas automaticamente
CREATE OR REPLACE FUNCTION public.mark_automatic_absences()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    class_record RECORD;
    student_record RECORD;
    attendance_window_minutes INTEGER;
    current_ts TIMESTAMP;
BEGIN
    -- Obter o horário atual
    current_ts := NOW();

    -- Para cada aula do dia que já passou do horário de tolerância
    FOR class_record IN 
        SELECT 
            c.id as class_id,
            c.institution_id,
            ct.start_time,
            c.date,
            inst_settings.attendance_window_minutes
        FROM public.classes c
        JOIN public.class_times ct ON c.class_time_id = ct.id
        JOIN public.institution_settings inst_settings ON c.institution_id = inst_settings.institution_id
        WHERE 
            c.date = CURRENT_DATE
            AND (c.date || ' ' || ct.start_time)::timestamp + 
                (COALESCE(inst_settings.attendance_window_minutes, 15) || ' minutes')::interval < current_ts
    LOOP
        -- Para cada aluno da instituição
        FOR student_record IN 
            SELECT id as student_id
            FROM public.profiles
            WHERE 
                institution_id = class_record.institution_id
                AND role = 'student'
                AND active = true
        LOOP
            -- Verificar se já existe registro de presença
            IF NOT EXISTS (
                SELECT 1 
                FROM public.attendance 
                WHERE 
                    class_id = class_record.class_id
                    AND student_id = student_record.student_id
            ) THEN
                -- Inserir falta
                INSERT INTO public.attendance (
                    class_id,
                    student_id,
                    status,
                    confirmed_at,
                    confirmed_by,
                    notes
                ) VALUES (
                    class_record.class_id,
                    student_record.student_id,
                    'absent',
                    current_ts,
                    NULL,
                    'Falta marcada automaticamente'
                );
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

-- Criar uma função para ser chamada via webhook
CREATE OR REPLACE FUNCTION public.http_mark_automatic_absences()
RETURNS json
LANGUAGE plpgsql
AS $$
BEGIN
    -- Executar a função de marcação
    PERFORM public.mark_automatic_absences();
    
    -- Retornar sucesso
    RETURN json_build_object(
        'success', true,
        'message', 'Faltas marcadas automaticamente',
        'timestamp', NOW()
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, retornar a mensagem
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'timestamp', NOW()
        );
END;
$$;

-- Criar um gatilho para executar a função quando uma aula é criada/atualizada
CREATE OR REPLACE FUNCTION public.trigger_schedule_automatic_absence()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Agendar a execução da função para depois do horário de tolerância
    PERFORM pg_sleep(
        EXTRACT(EPOCH FROM 
            ((NEW.date || ' ' || (SELECT start_time FROM public.class_times WHERE id = NEW.class_time_id))::timestamp +
            (COALESCE((SELECT attendance_window_minutes FROM public.institution_settings WHERE institution_id = NEW.institution_id), 15) || ' minutes')::interval) - 
            NOW()
        )
    );
    
    -- Executar a marcação
    PERFORM public.mark_automatic_absences();
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER schedule_automatic_absence
    AFTER INSERT OR UPDATE ON public.classes
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_schedule_automatic_absence();

-- Criar índices para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_classes_date ON public.classes (date);
CREATE INDEX IF NOT EXISTS idx_classes_class_time ON public.classes (class_time_id);
CREATE INDEX IF NOT EXISTS idx_class_times_start_time ON public.class_times (start_time);

-- Adicionar comentários para documentação
COMMENT ON FUNCTION public.mark_automatic_absences() IS 'Função para marcar faltas automaticamente para alunos que não confirmaram presença após o horário de tolerância';
COMMENT ON FUNCTION public.http_mark_automatic_absences() IS 'Endpoint HTTP para executar a marcação automática de faltas via webhook';
COMMENT ON FUNCTION public.trigger_schedule_automatic_absence() IS 'Gatilho para agendar a marcação automática de faltas quando uma aula é criada/atualizada'; 