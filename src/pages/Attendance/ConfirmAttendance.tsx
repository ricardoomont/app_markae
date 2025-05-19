import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useActiveInstitution } from "@/hooks/useActiveInstitution";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Tipo para erro de geolocalização
type GeoError = {
  code: number;
  message: string;
};

// Versão corrigida usando o hook adequado para autenticação
const ConfirmAttendance = () => {
  // Hooks de autenticação e instituição
  const auth = useSupabaseAuth();
  const { institution, isLoading: institutionLoading } = useActiveInstitution();
  
  // Estados locais
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState(null);
  const [geoError, setGeoError] = useState<GeoError | null>(null);
  
  // Carregar aulas disponíveis quando o componente montar
  useEffect(() => {
    // Só carrega se o usuário estiver autenticado e a instituição carregada
    if (!auth.loading && auth.user && institution?.id && !loadingClasses) {
      handleLoadClasses();
    }
  }, [auth.loading, auth.user, institution?.id]);
  
  // Função para calcular distância entre dois pontos (Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
              
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // distância em metros
  };
  
  // Função para carregar aulas
  const handleLoadClasses = async () => {
    try {
      if (!auth.user?.id) {
        setError("Usuário não identificado");
        return;
      }
      
      setLoadingClasses(true);
      setError(null);
      
      const today = format(new Date(), "yyyy-MM-dd");
      const currentTime = new Date();
      
      console.log("Buscando aulas para a data:", today);
      
      // Primeiro, buscar as configurações da instituição para obter a janela de tolerância
      const { data: settings, error: settingsError } = await supabase
        .from("institution_settings")
        .select("attendance_window_minutes")
        .eq("institution_id", institution.id)
        .single();
        
      if (settingsError) {
        console.error("Erro ao buscar configurações:", settingsError);
        throw settingsError;
      }
      
      // Usar a janela de tolerância das configurações ou o padrão de 15 minutos
      const attendanceWindowMinutes = settings?.attendance_window_minutes || 15;
      console.log("Janela de tolerância:", attendanceWindowMinutes, "minutos");
      
      // Buscar aulas disponíveis para hoje seguindo as mesmas regras da política RLS
      const { data, error: queryError } = await supabase
        .from("classes")
        .select(`
          id, 
          date, 
          active,
          subject_id,
          class_time_id,
          subjects(id, name),
          class_times(id, name, start_time, end_time)
        `)
        .eq("date", today)
        .eq("active", true);
      
      if (queryError) throw queryError;
      
      console.log("Aulas encontradas:", data);
      
      if (data && data.length > 0) {
        // Filtrar aulas disponíveis usando a mesma lógica da política RLS
        const availableClasses = data
          .filter(cls => {
            // Verificar se class_times existe
            if (!cls.class_times || !cls.active) return false;
            
            // Extrair horários
            const startTimeParts = cls.class_times.start_time.split(':');
            const endTimeParts = cls.class_times.end_time.split(':');
            
            // Criar objetos Date para hoje com esses horários
            const startTime = new Date(currentTime);
            startTime.setHours(parseInt(startTimeParts[0], 10), parseInt(startTimeParts[1], 10), 0);
            
            const endTime = new Date(currentTime);
            endTime.setHours(parseInt(endTimeParts[0], 10), parseInt(endTimeParts[1], 10), 0);
            
            // Adicionar a janela de tolerância ao horário de término
            const endTimePlusTolerance = new Date(endTime);
            endTimePlusTolerance.setMinutes(endTimePlusTolerance.getMinutes() + attendanceWindowMinutes);
            
            // Verificar se o horário atual está entre o início e fim da aula (sem tolerância)
            // O aluno só pode confirmar presença durante a aula
            const isWithinTimeWindow = currentTime >= startTime && currentTime <= endTime;
            
            return isWithinTimeWindow;
          })
          .map(cls => ({
            id: cls.id,
            date: cls.date,
            subject: cls.subjects,
            class_time: cls.class_times,
            // Adicionar informações sobre a janela de tempo para debug
            timeWindow: {
              startTime: cls.class_times.start_time,
              endTime: cls.class_times.end_time,
              endTimePlusTolerance: new Date(new Date().setHours(
                parseInt(cls.class_times.end_time.split(':')[0], 10),
                parseInt(cls.class_times.end_time.split(':')[1], 10) + attendanceWindowMinutes
              )).toLocaleTimeString()
            }
          }));
          
        // Buscar aulas que o aluno já confirmou presença hoje
        const { data: existingAttendance, error: attendanceError } = await supabase
          .from("attendance")
          .select("class_id")
          .eq("student_id", auth.user.id)
          .in("class_id", availableClasses.map(cls => cls.id));
        
        if (attendanceError) {
          console.error("Erro ao verificar presenças existentes:", attendanceError);
        }
        
        // Filtrar aulas para remover aquelas que o aluno já confirmou presença
        const classesWithoutAttendance = existingAttendance && existingAttendance.length > 0
          ? availableClasses.filter(cls => !existingAttendance.some(att => att.class_id === cls.id))
          : availableClasses;
        
        console.log("Aulas disponíveis sem presença:", classesWithoutAttendance);
        console.log("Aulas com presença já confirmada:", 
          availableClasses.length - classesWithoutAttendance.length);
        
        setClasses(classesWithoutAttendance);
        
        if (classesWithoutAttendance.length === 0) {
          if (existingAttendance && existingAttendance.length > 0) {
            setError("Você já confirmou presença em todas as aulas disponíveis para hoje");
          } else {
            setError("Não há aulas disponíveis dentro da janela de tempo permitida");
          }
        }
      } else {
        console.log("Nenhuma aula encontrada para hoje");
        setClasses([]);
        setError("Não há aulas disponíveis para hoje");
      }
    } catch (err) {
      console.error("Erro ao buscar aulas:", err);
      setError("Falha ao carregar aulas: " + (err.message || "Erro desconhecido"));
    } finally {
      setLoadingClasses(false);
    }
  };
  
  // Função para confirmar presença
  const handleConfirmAttendance = async () => {
    if (!selectedClassId) {
      toast.error("Selecione uma aula primeiro");
      return;
    }
    
    try {
      setIsConfirming(true);
      setGeoError(null);
      
      // Verificar se já confirmou presença
      const { data: existing, error: queryError } = await supabase
        .from("attendance")
        .select("id, confirmed_at")
        .eq("class_id", selectedClassId)
        .eq("student_id", auth.user.id)
        .maybeSingle();
      
      if (queryError) throw queryError;
      
      if (existing) {
        // Formatar a data para exibição
        const confirmedDate = new Date(existing.confirmed_at);
        const formattedDate = format(confirmedDate, "dd/MM/yyyy 'às' HH:mm");
        
        toast.error(`Você já confirmou presença nesta aula em ${formattedDate}`);
        setIsConfirming(false);
        return;
      }
      
      // VERIFICAÇÃO ESPECIAL para diagnosticar problemas com a política RLS
      // Verificar diretamente no banco de dados se o registro atenderia às condições da política
      const { data: classInfo, error: classError } = await supabase
        .from("classes")
        .select(`
          id,
          date,
          active,
          institution_id,
          class_time_id,
          class_times (
            id,
            name,
            start_time,
            end_time
          )
        `)
        .eq("id", selectedClassId)
        .single();
        
      if (classError) {
        toast.error("Erro ao verificar informações da aula: " + classError.message);
        setIsConfirming(false);
        return;
      }
      
      // Verificar dados do usuário
      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", auth.user.id)
        .single();
        
      if (profileError) {
        toast.error("Erro ao verificar perfil do usuário: " + profileError.message);
        setIsConfirming(false);
        return;
      }
      
      // Verificar configurações da instituição
      const { data: instSettings, error: settingsError } = await supabase
        .from("institution_settings")
        .select("attendance_window_minutes")
        .eq("institution_id", classInfo.institution_id)
        .single();
        
      if (settingsError) {
        toast.error("Erro ao verificar configurações da instituição: " + settingsError.message);
        setIsConfirming(false);
        return;
      }
      
      // Log completo de diagnóstico
      console.log("Diagnóstico completo:", {
        user: {
          id: auth.user.id,
          role: userProfile.role
        },
        class: {
          id: classInfo.id,
          date: classInfo.date,
          current_date: format(new Date(), "yyyy-MM-dd"),
          match_date: classInfo.date === format(new Date(), "yyyy-MM-dd"),
          active: classInfo.active,
          class_time: classInfo.class_times
        },
        time_window: {
          now: new Date().toISOString(),
          current_timestamp: new Date(),
          start_time: `${classInfo.date} ${classInfo.class_times.start_time}`,
          end_time: `${classInfo.date} ${classInfo.class_times.end_time}`,
          window_minutes: instSettings.attendance_window_minutes || 15
        },
        conditions: {
          is_student: userProfile.role === 'student',
          is_own_record: auth.user.id === auth.user.id, // Sempre true
          is_active: classInfo.active,
          is_today: classInfo.date === format(new Date(), "yyyy-MM-dd")
          // As verificações de tempo são mais complexas e serão feitas abaixo
        }
      });
      
      // Verificar condições de tempo manualmente
      const now = new Date();
      const classDate = classInfo.date;
      const startTimeParts = classInfo.class_times.start_time.split(':');
      const endTimeParts = classInfo.class_times.end_time.split(':');
      
      // Criar timestamps para comparação
      const startDateTime = new Date(`${classDate}T${classInfo.class_times.start_time}`);
      const endDateTime = new Date(`${classDate}T${classInfo.class_times.end_time}`);
      
      // Adicionar a janela de tolerância
      const windowMinutes = instSettings.attendance_window_minutes || 15;
      const endDateTimePlusTolerance = new Date(endDateTime);
      endDateTimePlusTolerance.setMinutes(endDateTimePlusTolerance.getMinutes() + windowMinutes);
      
      const isAfterStart = now >= startDateTime;
      const isBeforeEnd = now <= endDateTime;
      const isWithinTimeWindow = isAfterStart && isBeforeEnd;
      
      console.log("Verificação de tempo:", {
        now: now.toISOString(),
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        isAfterStart,
        isBeforeEnd,
        isWithinTimeWindow
      });
      
      // Se não atender alguma condição da política, exibir mensagem específica
      if (userProfile.role !== 'student') {
        toast.error("Apenas alunos podem confirmar presença.");
        setIsConfirming(false);
        return;
      }
      
      if (!classInfo.active) {
        toast.error("Esta aula não está ativa.");
        setIsConfirming(false);
        return;
      }
      
      if (classInfo.date !== format(new Date(), "yyyy-MM-dd")) {
        toast.error("A confirmação de presença só é possível na data da aula.");
        setIsConfirming(false);
        return;
      }
      
      if (!isAfterStart) {
        toast.error(`A aula só começa às ${classInfo.class_times.start_time}.`);
        setIsConfirming(false);
        return;
      }
      
      if (!isBeforeEnd) {
        toast.error(`A aula já terminou. Não é possível confirmar presença após o término da aula.`);
        setIsConfirming(false);
        return;
      }
      
      // Verificar configurações da instituição
      if (!institution.settings) {
        toast.error("Configurações da instituição não disponíveis");
        setIsConfirming(false);
        return;
      }
      
      // Verificar se instituição usa geolocalização
      if (institution.settings.attendance_validation_method !== 'geolocation') {
        toast.error("Esta instituição não utiliza validação por geolocalização");
        setIsConfirming(false);
        return;
      }
      
      // Verificar se instituição tem coordenadas configuradas
      if (!institution.settings.latitude || !institution.settings.longitude) {
        toast.error("Localização da instituição não configurada");
        setIsConfirming(false);
        return;
      }
      
      // Obter localização do usuário
      if (!navigator.geolocation) {
        setGeoError({
          code: 0,
          message: "Seu navegador não suporta geolocalização"
        });
        setIsConfirming(false);
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            
            // Calcular distância entre usuário e instituição
            const distance = calculateDistance(
              latitude,
              longitude,
              institution.settings.latitude,
              institution.settings.longitude
            );
            
            // Verificar se está dentro do raio permitido
            const allowedRadius = institution.settings.geolocation_radius || 100; // padrão 100m
            
            if (distance > allowedRadius) {
              const distanceKm = (distance / 1000).toFixed(2);
              toast.error(`Você está a ${distanceKm}km da instituição, fora do raio permitido de ${allowedRadius/1000}km`);
              setIsConfirming(false);
              return;
            }
            
            // Registrar presença
            const attendance = {
              class_id: selectedClassId,
              student_id: auth.user.id,
              status: "present",
              confirmed_at: new Date().toISOString(),
              latitude,
              longitude,
              distance_from_institution: distance
            };
            
            console.log("Tentando registrar presença:", attendance);
            
            // Usando a Função RPC do Supabase para contornar problemas de RLS
            // Isso envia a requisição para uma função no servidor que faz a inserção
            const { data: insertResult, error: insertError } = await supabase
              .rpc('register_student_attendance', {
                p_class_id: selectedClassId,
                p_student_id: auth.user.id,
                p_latitude: latitude,
                p_longitude: longitude,
                p_distance: distance
              });
              
            if (insertError) {
              console.error("Erro ao registrar presença via RPC:", insertError);
              
              // Tentar inserção direta como fallback
              const { error: directInsertError } = await supabase
                .from("attendance")
                .insert(attendance);
                
              if (directInsertError) {
                throw directInsertError;
              }
            }
            
            toast.success("Presença confirmada com sucesso!");
            setSelectedClassId("");
            setIsConfirming(false);
            
            // Recarregar as aulas
            handleLoadClasses();
          } catch (err) {
            console.error("Erro ao processar localização:", err);
            toast.error("Falha ao confirmar presença: " + (err.message || "Erro desconhecido"));
            setIsConfirming(false);
          }
        },
        (error) => {
          console.error("Erro de geolocalização:", error);
          let errorMessage = "Erro ao obter sua localização";
          
          switch (error.code) {
            case 1: // PERMISSION_DENIED
              errorMessage = "Você negou o acesso à sua localização. Permita o acesso para confirmar presença.";
              break;
            case 2: // POSITION_UNAVAILABLE
              errorMessage = "Sua localização atual não está disponível.";
              break;
            case 3: // TIMEOUT
              errorMessage = "Tempo de espera excedido ao buscar sua localização.";
              break;
          }
          
          setGeoError({
            code: error.code,
            message: errorMessage
          });
          
          toast.error(errorMessage);
          setIsConfirming(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } catch (err) {
      console.error("Erro ao confirmar presença:", err);
      toast.error("Falha ao confirmar presença: " + (err.message || "Erro desconhecido"));
      setIsConfirming(false);
    }
  };
  
  // Tela de carregamento
  if (auth.loading || institutionLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Carregando...</CardTitle>
            <CardDescription>Verificando suas informações</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Se não houver usuário autenticado
  if (!auth.user) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você precisa estar autenticado para acessar esta página.
              Por favor, faça login novamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full"
              onClick={() => window.location.href = "/login"}
            >
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Interface principal
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Confirmar Presença</CardTitle>
          <CardDescription>
            Selecione a aula e confirme sua presença
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status da aplicação */}
          <div className="bg-muted p-2 rounded text-xs">
            <p>Usuário: {auth.user.email}</p>
            <p>ID do Usuário: {auth.user.id}</p>
            <p>Data atual: {format(new Date(), "yyyy-MM-dd")}</p>
            <p>Hora atual: {format(new Date(), "HH:mm:ss")}</p>
            <p>Aulas disponíveis: {classes.length}</p>
            {error && <p className="text-red-500">Erro: {error}</p>}
          </div>
          
          {/* Alerta de erro de geolocalização */}
          {geoError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{geoError.message}</AlertDescription>
            </Alert>
          )}
          
          {/* Debug para aulas disponíveis */}
          {classes.length > 0 && (
            <div className="bg-blue-50 p-2 rounded text-xs">
              <p className="font-semibold">Detalhes das aulas disponíveis:</p>
              {classes.map((cls: any) => (
                <div key={cls.id} className="mt-1 border-t pt-1">
                  <p>ID: {cls.id}</p>
                  <p>Matéria: {cls.subject?.name}</p>
                  <p>Horário: {cls.class_time?.start_time} - {cls.class_time?.end_time}</p>
                  <p>Janela de tempo: até {cls.timeWindow?.endTimePlusTolerance}</p>
                </div>
              ))}
            </div>
          )}
          
          {/* Seleção de aula */}
          <div className="space-y-2">
            <Select
              value={selectedClassId}
              onValueChange={setSelectedClassId}
              disabled={loadingClasses || isConfirming}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingClasses ? "Carregando aulas..." : "Selecione uma aula"} />
              </SelectTrigger>
              <SelectContent>
                {loadingClasses ? (
                  <SelectItem value="loading" disabled>Carregando...</SelectItem>
                ) : classes.length === 0 ? (
                  <SelectItem value="empty" disabled>Nenhuma aula disponível</SelectItem>
                ) : (
                  classes.map((cls: any) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.subject?.name || "Sem nome"} - {cls.class_time?.name || "Sem horário"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          {/* Botão para confirmar presença */}
          <Button
            className="w-full"
            onClick={handleConfirmAttendance}
            disabled={!selectedClassId || isConfirming}
          >
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirmando...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Confirmar Presença
              </>
            )}
          </Button>
          
          {/* Botão para recarregar aulas */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleLoadClasses}
            disabled={loadingClasses}
          >
            Recarregar aulas
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmAttendance;
