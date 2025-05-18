import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, isWithinInterval, parseISO, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useActiveInstitution } from "@/hooks/useActiveInstitution";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin } from "lucide-react";

// Tipos
interface Class {
  id: string;
  date: string;
  subject: {
    id: string;
    name: string;
  };
  classTime: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
  };
}

interface GeolocationError {
  code: number;
  message: string;
}

interface ClassResponse {
  id: string;
  date: string;
  subject: {
    id: string;
    name: string;
  };
  classTime: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
  };
}

const ConfirmAttendance = () => {
  // Estados
  const [selectedClassId, setSelectedClassId] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [geoError, setGeoError] = useState<GeolocationError | null>(null);

  // Hooks
  const { user, loading: authLoading } = useSupabaseAuth();
  const { institution, isLoading: institutionLoading } = useActiveInstitution();

  // Debug: Verificar configurações da instituição
  console.log("[Debug] Configurações da instituição:", {
    settings: institution?.settings,
    validationMethod: institution?.settings?.attendance_validation_method,
    latitude: institution?.settings?.latitude,
    longitude: institution?.settings?.longitude,
    radius: institution?.settings?.geolocation_radius
  });

  // Buscar aulas do dia
  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ["today-classes", institution?.id],
    queryFn: async () => {
      try {
        console.log("[Query] Buscando aulas do dia...");
        const today = format(new Date(), "yyyy-MM-dd");
        
        interface DbClass {
          id: string;
          date: string;
          subject_id: string;
          class_time_id: string;
        }
        
        // Primeiro buscar as aulas do dia
        const { data: classesData, error: classesError } = await supabase
          .from("classes")
          .select("id, date, subject_id, class_time_id")
          .eq("date", today)
          .eq("institution_id", institution?.id)
          .eq("active", true)
          .returns<DbClass[]>();

        if (classesError) {
          console.error("[Query] Erro ao buscar aulas:", classesError);
          throw classesError;
        }

        if (!classesData?.length) {
          console.log("[Query] Nenhuma aula encontrada para hoje");
          return [];
        }

        // Depois buscar os detalhes de cada aula
        const classesWithDetails = await Promise.all(
          classesData.map(async (cls) => {
            // Buscar detalhes da matéria
            const { data: subjectData } = await supabase
              .from("subjects")
              .select("id, name")
              .eq("id", cls.subject_id)
              .single();

            // Buscar detalhes do horário
            const { data: classTimeData } = await supabase
              .from("class_times")
              .select("id, name, start_time, end_time")
              .eq("id", cls.class_time_id)
              .single();

            return {
              id: cls.id,
              date: cls.date,
              subject: subjectData || { id: "", name: "Matéria não encontrada" },
              classTime: classTimeData || { 
                id: "", 
                name: "Horário não encontrado",
                start_time: "00:00",
                end_time: "00:00"
              }
            };
          })
        );

        // Filtrar aulas pelo horário atual
        const now = new Date();
        console.log("[Query] Horário atual:", format(now, "HH:mm:ss"));
        
        const filteredClasses = classesWithDetails.filter(cls => {
          if (!cls.classTime?.start_time || !cls.classTime?.end_time) {
            console.log("[Query] Aula sem horário definido:", cls.id);
            return false;
          }
          
          const [startHour, startMinute] = cls.classTime.start_time.split(":").map(Number);
          const [endHour, endMinute] = cls.classTime.end_time.split(":").map(Number);
          
          const classDate = parseISO(cls.date);
          const startTime = setMinutes(setHours(classDate, startHour), startMinute);
          const endTime = setMinutes(setHours(classDate, endHour), endMinute);
          
          // Adicionar tolerância configurada
          const toleranceMinutes = institution?.settings?.attendance_window_minutes || 0;
          const endTimeWithTolerance = new Date(endTime.getTime() + toleranceMinutes * 60000);
          
          console.log("[Query] Janela de presença para aula", cls.id, ":", {
            inicio: format(startTime, "HH:mm:ss"),
            fim: format(endTime, "HH:mm:ss"),
            tolerancia: format(endTimeWithTolerance, "HH:mm:ss"),
            dentroDoHorario: isWithinInterval(now, {
              start: startTime,
              end: endTimeWithTolerance
            })
          });
          
          return isWithinInterval(now, {
            start: startTime,
            end: endTimeWithTolerance
          });
        });

        console.log("[Query] Aulas disponíveis:", filteredClasses);
        return filteredClasses;
      } catch (error) {
        console.error("[Query] Erro na query:", error);
        return [];
      }
    },
    enabled: !authLoading && !institutionLoading && !!user?.id && !!institution?.id,
    refetchInterval: 60000, // Atualizar a cada minuto
  });

  // Mutation para confirmar presença
  const { mutate: confirmPresence } = useMutation({
    mutationFn: async (data: { 
      classId: string;
      latitude: number;
      longitude: number;
      distance: number;
    }) => {
      console.log("[Mutation] Iniciando confirmação de presença:", data);

      const attendance = {
        class_id: data.classId,
        student_id: user?.id,
        status: "present",
        confirmed_at: new Date().toISOString(),
        latitude: data.latitude,
        longitude: data.longitude,
        distance_from_institution: data.distance
      };

      console.log("[Mutation] Dados a serem inseridos:", attendance);

      const { data: result, error } = await supabase
        .from("attendance")
        .insert(attendance)
        .select()
        .single();

      if (error) {
        console.error("[Mutation] Erro ao inserir presença:", error);
        throw error;
      }

      console.log("[Mutation] Presença registrada com sucesso:", result);
    },
    onSuccess: () => {
      toast.success("Presença confirmada com sucesso!");
      setSelectedClassId("");
    },
    onError: (error: Error) => {
      console.error("[Mutation] Erro ao confirmar presença:", error);
      toast.error("Erro ao confirmar presença. Tente novamente.");
    }
  });

  // Função para calcular distância entre dois pontos (Haversine)
  const calculateDistance = (coords: { lat: number; lon: number }, target: { lat: string; lon: string }) => {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = (coords.lat * Math.PI) / 180;
    const φ2 = (parseFloat(target.lat) * Math.PI) / 180;
    const Δφ = ((parseFloat(target.lat) - coords.lat) * Math.PI) / 180;
    const Δλ = ((parseFloat(target.lon) - coords.lon) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
              
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Handler para confirmar presença
  const handleConfirmAttendance = async () => {
    try {
      setIsConfirming(true);
      setGeoError(null);

      // Validações básicas
      if (!selectedClassId) {
        toast.error("Selecione uma aula");
        return;
      }

      if (!user?.id) {
        toast.error("Usuário não identificado");
        return;
      }

      // Validar configurações de geolocalização
      if (!institution?.settings?.attendance_validation_method) {
        toast.error("Método de validação de presença não configurado");
        return;
      }

      if (institution.settings.attendance_validation_method !== "geolocation") {
        toast.error("Método de validação de presença incorreto");
        return;
      }

      if (!institution.settings.latitude || !institution.settings.longitude) {
        toast.error("Localização da instituição não configurada");
        return;
      }

      // Verificar se já confirmou presença
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("class_id", selectedClassId)
        .eq("student_id", user.id)
        .single();

      if (existing) {
        toast.error("Você já confirmou presença nesta aula");
        return;
      }

      // Obter localização do usuário
      console.log("[Geo] Solicitando localização...");
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocalização não suportada"));
          return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;
      console.log("[Geo] Posição obtida:", { latitude, longitude });
      console.log("[Geo] Posição da instituição:", {
        latitude: institution.settings.latitude,
        longitude: institution.settings.longitude
      });

      // Calcular distância
      const distance = calculateDistance(
        { lat: latitude, lon: longitude },
        { lat: institution.settings.latitude, lon: institution.settings.longitude }
      );

      console.log("[Geo] Distância calculada:", Math.round(distance), "metros");
      console.log("[Geo] Raio máximo permitido:", institution.settings.geolocation_radius, "metros");

      // Validar distância
      const maxRadius = institution.settings.geolocation_radius || 100;
      if (distance > maxRadius) {
        toast.error(`Você está muito distante da instituição (${Math.round(distance)}m)`);
        return;
      }

      // Confirmar presença
      await confirmPresence({ classId: selectedClassId, latitude, longitude, distance });

    } catch (error: any) {
      console.error("[Handler] Erro:", error);
      
      if (error instanceof GeolocationPositionError) {
        const messages = {
          1: "Permissão de localização negada",
          2: "Localização indisponível",
          3: "Tempo limite excedido"
        };
        
        setGeoError({
          code: error.code,
          message: messages[error.code as keyof typeof messages] || error.message
        });
        
        toast.error(messages[error.code as keyof typeof messages] || "Erro ao obter localização");
      } else {
        toast.error(error.message || "Erro ao confirmar presença");
      }
    } finally {
      setIsConfirming(false);
    }
  };

  // Loading states
  if (authLoading || institutionLoading) {
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

  // Not authenticated
  if (!user?.id) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você precisa estar autenticado para registrar presença
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => window.location.href = '/login'}
              className="w-full"
            >
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                {classes.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    Nenhuma aula disponível no momento
                  </SelectItem>
                ) : (
                  classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.subject?.name} - {cls.classTime?.name} ({cls.classTime?.start_time} - {cls.classTime?.end_time})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {classes.length === 0 && !loadingClasses && (
              <p className="text-sm text-muted-foreground">
                Não há aulas disponíveis para confirmação de presença no momento.
                Verifique se você está dentro do horário da aula.
              </p>
            )}
          </div>

          {geoError && (
            <div className="text-sm text-red-500">
              Erro de localização: {geoError.message}
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleConfirmAttendance}
            disabled={!selectedClassId || isConfirming || classes.length === 0}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmAttendance;
