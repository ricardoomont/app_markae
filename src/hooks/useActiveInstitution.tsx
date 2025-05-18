import { useSupabaseAuth } from "./useSupabaseAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Institution } from "@/types";

type ValidationMethod = "qrcode" | "geolocation" | "code" | "manual";

interface DbInstitutionSettings {
  attendance_validation_method: string;
  attendance_window_minutes: number;
  created_at: string;
  id: string;
  institution_id: string;
  primary_color: string;
  updated_at: string;
  latitude: number | null;
  longitude: number | null;
  geolocation_radius: number | null;
  default_temporary_password?: string;
}

interface DbProfile {
  id: string;
  name: string;
  role: string;
  active: boolean;
  institution_id: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
  email: string | null;
}

interface DbClassTime {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: string[];
  active: boolean;
}

interface InstitutionSettings {
  attendance_validation_method: ValidationMethod;
  attendance_window_minutes: number;
  created_at: string;
  id: string;
  institution_id: string;
  primary_color: string;
  updated_at: string;
  latitude: number;
  longitude: number;
  geolocation_radius: number;
  classTimes: Array<{
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    daysOfWeek: number[];
  }>;
}

export function useActiveInstitution() {
  const { user } = useSupabaseAuth();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['activeInstitution', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      try {
        // 1. Primeiro buscar o perfil do usuário
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .eq('active', true)
          .single()
          .returns<DbProfile>();
          
        if (profileError) {
          console.error("Erro ao buscar perfil:", profileError);
          throw profileError;
        }

        if (!profileData || !profileData.institution_id) {
          console.error("Usuário não encontrado, inativo ou sem instituição");
          return null;
        }

        // 2. Depois buscar a instituição
        const { data: institutionData, error: institutionError } = await supabase
          .from('institutions')
          .select('*')
          .eq('id', profileData.institution_id)
          .single();

        if (institutionError) {
          console.error("Erro ao buscar instituição:", institutionError);
          throw institutionError;
        }

        // 3. Buscar configurações da instituição
        const { data: settingsData, error: settingsError } = await supabase
          .from('institution_settings')
          .select('*')
          .eq('institution_id', profileData.institution_id)
          .single()
          .returns<DbInstitutionSettings>();

        if (settingsError) {
          console.error("Erro ao buscar configurações:", settingsError);
          throw settingsError;
        }

        // 4. Buscar horários de aula
        const { data: classTimesData, error: classTimesError } = await supabase
          .from('class_times')
          .select('*')
          .eq('institution_id', profileData.institution_id)
          .eq('active', true)
          .returns<DbClassTime[]>();

        if (classTimesError) {
          console.error("Erro ao buscar horários:", classTimesError);
          throw classTimesError;
        }

        // Tentativa de buscar o email
        let email = profileData.email || 'Email não disponível';
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user) {
            email = userData.user.email || profileData.email || 'Email não disponível';
          }
        } catch (error) {
          console.error("Erro ao buscar o email do usuário:", error);
        }

        // Formatar os dados no formato esperado
        const profile = {
          ...profileData,
          email
        };

        const settings: InstitutionSettings = {
          attendance_validation_method: (settingsData.attendance_validation_method || 'qrcode') as ValidationMethod,
          attendance_window_minutes: settingsData.attendance_window_minutes || 15,
          created_at: settingsData.created_at,
          id: settingsData.id,
          institution_id: settingsData.institution_id,
          primary_color: settingsData.primary_color,
          updated_at: settingsData.updated_at,
          geolocation_radius: settingsData.geolocation_radius || 100,
          latitude: Number(settingsData.latitude || 0),
          longitude: Number(settingsData.longitude || 0),
          classTimes: (classTimesData || []).map(ct => ({
            id: ct.id,
            name: ct.name,
            startTime: ct.start_time,
            endTime: ct.end_time,
            daysOfWeek: ct.days_of_week.map(Number)
          }))
        };

        const institution: Institution = {
          id: institutionData.id,
          name: institutionData.name,
          logo: institutionData.logo || undefined,
          active: institutionData.active || false,
          settings
        };
        
        return {
          profile,
          institution
        };
      } catch (error) {
        console.error("Erro ao buscar dados da instituição:", error);
        throw error;
      }
    },
    enabled: !!user?.id,
    retry: 1,
    retryDelay: 1000
  });
  
  return {
    profile: data?.profile,
    institution: data?.institution,
    institutionId: data?.profile?.institution_id,
    isLoading,
    error,
    isAdmin: data?.profile?.role === 'admin' || data?.profile?.role === 'coordinator',
    isTeacher: data?.profile?.role === 'teacher',
    isStudent: data?.profile?.role === 'student',
  };
}
