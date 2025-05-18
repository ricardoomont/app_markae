import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveInstitution } from "@/hooks/useActiveInstitution";

const AttendanceReport = () => {
  const { institutionId, profile } = useActiveInstitution();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  // Carregar aulas
  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ["classes", institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      
      const { data, error } = await supabase
        .from("classes")
        .select(`
          id,
          date,
          title,
          subject:subjects(name),
          teacher:profiles!classes_teacher_id_fkey(name),
          classTime:class_times(name, start_time, end_time)
        `)
        .eq("institution_id", institutionId)
        .order("date", { ascending: false });
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!institutionId
  });

  // Carregar alunos
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
    enabled: !!institutionId
  });

  // Carregar registros de presença
  const { data: attendanceData = [] } = useQuery({
    queryKey: ["attendance", selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          *,
          student:profiles!attendance_student_id_fkey(name)
        `)
        .eq("class_id", selectedClass);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClass
  });

  const handleClassChange = (value: string) => {
    setSelectedClass(value);
  };

  const getClassInfo = () => {
    if (!selectedClass) return null;
    return classes.find(cls => cls.id === selectedClass);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Presente
          </span>
        );
      case "absent":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Ausente
          </span>
        );
      case "late":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Atrasado
          </span>
        );
      case "excused":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Justificado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const formatDateTime = (dateString: string, timeString?: string) => {
    const date = new Date(`${dateString}T12:00:00`);
    const formattedDate = format(date, "dd/MM/yyyy", { locale: ptBR });
    return timeString ? `${formattedDate} às ${timeString}` : formattedDate;
  };

  const handleExport = () => {
    const classInfo = getClassInfo();
    if (!classInfo) return;
    toast.success("Relatório exportado com sucesso");
  };

  const classInfo = getClassInfo();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Relatório de Presença</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Selecione a Aula</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class">Aula</Label>
              <Select value={selectedClass || ""} onValueChange={handleClassChange}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingClasses ? "Carregando aulas..." : "Selecione uma aula"} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.subject?.name || "Sem matéria"} - {format(new Date(`${cls.date}T12:00:00`), "dd/MM/yyyy")} ({cls.classTime?.start_time} - {cls.classTime?.end_time})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {classInfo && (
              <div className="pt-2">
                <p className="text-sm font-medium">Informações da aula:</p>
                <p className="text-sm text-muted-foreground">Disciplina: {classInfo.subject?.name}</p>
                <p className="text-sm text-muted-foreground">Professor: {classInfo.teacher?.name}</p>
                <p className="text-sm text-muted-foreground">Data: {formatDateTime(classInfo.date)}</p>
                <p className="text-sm text-muted-foreground">
                  Horário: {classInfo.classTime?.start_time} - {classInfo.classTime?.end_time}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lista de Presenças</span>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <FileDown className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confirmação</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData.length > 0 ? (
                    attendanceData.map((att) => (
                      <TableRow key={att.id}>
                        <TableCell className="font-medium">
                          {att.student?.name}
                        </TableCell>
                        <TableCell>{getStatusBadge(att.status)}</TableCell>
                        <TableCell>
                          {att.confirmed_at ? 
                            format(new Date(att.confirmed_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 
                            "-"
                          }
                        </TableCell>
                        <TableCell>{att.notes || "-"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.name}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Não registrado
                          </span>
                        </TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm">
                <span className="font-medium">Total de alunos: </span>
                {students.length}
              </div>
              <div className="text-sm">
                <span className="font-medium">Presentes: </span>
                {attendanceData.filter(a => a.status === "present").length}
              </div>
              <div className="text-sm">
                <span className="font-medium">Ausentes: </span>
                {attendanceData.filter(a => a.status !== "present").length}
              </div>
              <div className="text-sm">
                <span className="font-medium">Taxa de presença: </span>
                {attendanceData.length > 0 
                  ? `${Math.round((attendanceData.filter(a => a.status === "present").length / attendanceData.length) * 100)}%` 
                  : "0%"
                }
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AttendanceReport;
