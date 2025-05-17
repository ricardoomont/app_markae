
import { useEffect, useState } from "react";
import { useActiveInstitution } from "@/hooks/useActiveInstitution";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Users, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function Dashboard() {
  const navigate = useNavigate();
  const { institutionId, profile, isLoading, isAdmin, isTeacher } = useActiveInstitution();
  const [nextClasses, setNextClasses] = useState<any[]>([]);
  
  // Buscar estatísticas
  const { data: stats = { users: 0, classes: 0, subjects: 0 }, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboardStats', institutionId],
    queryFn: async () => {
      if (!institutionId) return { users: 0, classes: 0, subjects: 0 };
      
      // Contar usuários
      const { count: userCount, error: userError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institutionId);
      
      if (userError) console.error('Erro ao contar usuários:', userError);
      
      // Contar aulas
      const { count: classCount, error: classError } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institutionId);
      
      if (classError) console.error('Erro ao contar aulas:', classError);
      
      // Contar matérias
      const { count: subjectCount, error: subjectError } = await supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institutionId);
      
      if (subjectError) console.error('Erro ao contar matérias:', subjectError);
      
      return {
        users: userCount || 0,
        classes: classCount || 0,
        subjects: subjectCount || 0
      };
    },
    enabled: !!institutionId
  });
  
  // Buscar próximas aulas
  useEffect(() => {
    async function fetchNextClasses() {
      if (!institutionId) return;
      
      const today = new Date();
      const formattedDate = format(today, 'yyyy-MM-dd');
      
      try {
        const { data, error } = await supabase
          .from('classes')
          .select(`
            *,
            subject:subjects(name),
            teacher:profiles(name),
            classTime:class_times(name, start_time, end_time)
          `)
          .eq('institution_id', institutionId)
          .gte('date', formattedDate)
          .order('date', { ascending: true })
          .limit(3);
        
        if (error) throw error;
        setNextClasses(data || []);
      } catch (error) {
        console.error('Erro ao buscar próximas aulas:', error);
      }
    }
    
    fetchNextClasses();
  }, [institutionId]);
  
  const handleTakeAttendance = () => {
    // Mostrar mensagem de funcionalidade em desenvolvimento
    toast.info("Funcionalidade em desenvolvimento", {
      description: "Este recurso estará disponível em breve.",
      duration: 5000
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center">Carregando informações...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{isLoadingStats ? "..." : stats.users}</div>
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            {isAdmin && (
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={() => navigate("/users")}>
                  Gerenciar Usuários
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aulas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{isLoadingStats ? "..." : stats.classes}</div>
              <CalendarCheck className="h-6 w-6 text-muted-foreground" />
            </div>
            {(isAdmin || isTeacher) && (
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={() => navigate("/classes")}>
                  Gerenciar Aulas
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Matérias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{isLoadingStats ? "..." : stats.subjects}</div>
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            {isAdmin && (
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={() => navigate("/subjects")}>
                  Gerenciar Matérias
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximas Aulas</CardTitle>
            <CardDescription>Aulas agendadas para os próximos dias</CardDescription>
          </CardHeader>
          <CardContent>
            {nextClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma aula agendada.</p>
            ) : (
              <div className="space-y-3">
                {nextClasses.map((cls) => {
                  const classDate = new Date(cls.date);
                  
                  return (
                    <div key={cls.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">{cls.subject?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(classDate, 'dd/MM/yyyy')} • {cls.classTime?.start_time}
                        </p>
                      </div>
                      {isTeacher && cls.teacher?.id === profile?.id && (
                        <Button size="sm" onClick={handleTakeAttendance}>
                          Fazer Chamada
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Funcionalidades em desenvolvimento</CardTitle>
            <CardDescription>Recursos que estarão disponíveis em breve</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertTitle>Alerta de desenvolvimento</AlertTitle>
              <AlertDescription>
                Algumas funcionalidades desta aplicação ainda estão em desenvolvimento, como a "Fazer Chamada" no Dashboard.
                Pedimos desculpas por qualquer inconveniente.
              </AlertDescription>
            </Alert>
            
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                Enquanto isso, você pode acessar as seguintes funcionalidades funcionais:
              </p>
              <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                <li>Gerenciamento de usuários</li>
                <li>Gerenciamento de matérias</li>
                <li>Gerenciamento de aulas</li>
                <li>Configurações da instituição</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
