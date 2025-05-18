import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveInstitution } from "@/hooks/useActiveInstitution";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarIcon, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

type AttendanceRecord = 'present' | 'absent' | 'late' | 'excused';

const TakeAttendance = () => {
  const { classId: classIdParam } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { institutionId, profile } = useActiveInstitution();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(classIdParam || null);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});

  // Carregar aulas do professor
  const { data: teacherClasses = [], isLoading: isLoadingClasses, error: classesError } = useQuery({
    queryKey: ["teacherClasses", profile?.id, institutionId],
    queryFn: async () => {
      if (!profile?.id || !institutionId) {
        console.log("Debug - Dados do perfil:", { profileId: profile?.id, institutionId });
        return [];
      }
      
      const today = new Date();
      const formattedDate = format(today, "yyyy-MM-dd");
      
      console.log("Debug - Fazendo consulta com:", { 
        teacherId: profile.id, 
        institutionId,
        role: profile.role 
      });

      // Primeiro vamos verificar se existem aulas na tabela
      const { data: allClasses, error: countError } = await supabase
        .from("classes")
        .select("*");
      
      console.log("Debug - Total de aulas na tabela:", allClasses?.length || 0);

      // Agora fazemos a consulta filtrada
      const { data, error } = await supabase
        .from("classes")
        .select(`
          id, 
          date, 
          title,
          subject:subjects(name),
          classTime:class_times(name, start_time, end_time),
          teacher_id,
          institution_id
        `)
        .eq("teacher_id", profile.id)
        .eq("institution_id", institutionId)
        .order("date", { ascending: false })
        .limit(20);
        
      console.log("Debug - Resultado da consulta filtrada:", { 
        error: error?.message,
        totalResults: data?.length || 0,
        firstResult: data?.[0],
        teacherId: profile.id,
        institutionId
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id && !!institutionId,
  });

  // Carregar alunos da instituição
  const { data: students = [] } = useQuery({
    queryKey: ["students", institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("institution_id", institutionId)
        .eq("role", "student")
        .eq("active", true)
        .order("name");
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!institutionId,
  });

  // Carregar registros de presença existentes
  const { data: existingAttendance = [] } = useQuery({
    queryKey: ["attendance", selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return [];
      
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("class_id", selectedClassId);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClassId
  });

  // Efeito para preencher os registros de presença existentes quando os dados são carregados
  useEffect(() => {
    if (existingAttendance && existingAttendance.length > 0) {
      const records: Record<string, AttendanceRecord> = {};
      existingAttendance.forEach(record => {
        if (record.student_id) {
          records[record.student_id] = record.status as AttendanceRecord;
        }
      });
      setAttendanceRecords(records);
    }
  }, [existingAttendance]);

  // Salvar registros de presença
  const saveAttendanceMutation = useMutation({
    mutationFn: async (data: { classId: string, records: Record<string, AttendanceRecord> }) => {
      const { classId, records } = data;
      
      // Transformar o objeto de registros em um array para upsert
      const attendanceRecords = Object.entries(records).map(([studentId, status]) => ({
        class_id: classId,
        student_id: studentId,
        status,
        confirmed_by: profile?.id,
        confirmed_at: new Date().toISOString()
      }));
      
      // Atualizar ou inserir novos registros
      const { data: result, error } = await supabase
        .from("attendance")
        .upsert(attendanceRecords, {
          onConflict: 'class_id,student_id',
          ignoreDuplicates: false
        })
        .select();
        
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success("Presenças registradas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (error) => {
      toast.error(`Erro ao salvar presenças: ${error.message}`);
    },
  });

  const handleSave = () => {
    if (!selectedClassId) {
      toast.error("Selecione uma aula para registrar presenças");
      return;
    }
    
    if (Object.keys(attendanceRecords).length === 0) {
      toast.error("Nenhuma presença foi marcada");
      return;
    }
    
    saveAttendanceMutation.mutate({
      classId: selectedClassId,
      records: attendanceRecords
    });
  };

  const handleAttendance = (studentId: string, status: AttendanceRecord) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  // Quando uma classe é selecionada no dropdown
  useEffect(() => {
    if (classIdParam && classIdParam !== selectedClassId) {
      setSelectedClassId(classIdParam);
    }
  }, [classIdParam]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Registrar Presenças</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecione a Aula</CardTitle>
          <CardDescription>
            Escolha a aula para registrar presenças
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedClassId || ""}
            onValueChange={setSelectedClassId}
            disabled={isLoadingClasses}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoadingClasses ? "Carregando aulas..." : "Selecione uma aula"} />
            </SelectTrigger>
            <SelectContent>
              {classesError ? (
                <SelectItem value="error" disabled>
                  Erro ao carregar aulas. Tente novamente.
                </SelectItem>
              ) : teacherClasses.length === 0 ? (
                <SelectItem value="empty" disabled>
                  Nenhuma aula encontrada
                </SelectItem>
              ) : (
                teacherClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {format(new Date(`${cls.date}T12:00:00`), "dd/MM/yyyy")} - {cls.subject?.name || "Sem matéria"} ({cls.classTime?.name || "Horário não definido"})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {classesError && (
            <p className="text-sm text-red-500 mt-2">
              Erro ao carregar aulas: {classesError.message}
            </p>
          )}
        </CardContent>
      </Card>

      {selectedClassId && (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Alunos</CardTitle>
            <CardDescription>
              Marque a presença dos alunos para esta aula
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {students.map((student) => (
                <div key={student.id} className="flex items-center justify-between border-b pb-2">
                  <span>{student.name}</span>
                  <div className="flex space-x-2">
                    <Button
                      variant={attendanceRecords[student.id] === 'present' ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleAttendance(student.id, 'present')}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Presente
                    </Button>
                    <Button
                      variant={attendanceRecords[student.id] === 'absent' ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleAttendance(student.id, 'absent')}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Ausente
                    </Button>
                    <Button
                      variant={attendanceRecords[student.id] === 'late' ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleAttendance(student.id, 'late')}
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Atrasado
                    </Button>
                  </div>
                </div>
              ))}
              
              {students.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhum aluno encontrado para esta instituição
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button 
              onClick={handleSave}
              disabled={saveAttendanceMutation.isPending || Object.keys(attendanceRecords).length === 0}
            >
              {saveAttendanceMutation.isPending ? "Salvando..." : "Salvar Presenças"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default TakeAttendance;
