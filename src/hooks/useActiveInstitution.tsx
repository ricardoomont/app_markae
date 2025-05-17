
import { useSupabaseAuth } from "./useSupabaseAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Institution } from "@/types";

export function useActiveInstitution() {
  const { user } = useSupabaseAuth();
  
  // Buscar o perfil do usuário para obter o ID da instituição
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Primeiro, buscar o perfil básico
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profileError) throw profileError;

      // Tentativa de buscar o email
      let email = 'Email não disponível';
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          email = userData.user.email || 'Email não disponível';
        }
      } catch (error) {
        console.error("Erro ao buscar o email do usuário:", error);
      }
      
      // Combinar os dados
      return {
        ...profileData,
        email
      };
    },
    enabled: !!user?.id
  });
  
  // Buscar os detalhes da instituição
  const { data: institutionData, isLoading: isLoadingInstitution } = useQuery({
    queryKey: ['institution', profile?.institution_id],
    queryFn: async () => {
      if (!profile?.institution_id) return null;
      
      const { data, error } = await supabase
        .from('institutions')
        .select(`
          *,
          settings:institution_settings(*)
        `)
        .eq('id', profile.institution_id)
        .single();
        
      if (error) throw error;
      
      // Buscar os horários de aula da instituição
      const { data: classTimes, error: classTimesError } = await supabase
        .from('class_times')
        .select('*')
        .eq('institution_id', profile.institution_id);
      
      if (classTimesError) throw classTimesError;
      
      // Converter o formato dos dados para o formato esperado pela interface
      const institution: Institution = {
        id: data.id,
        name: data.name,
        logo: data.logo,
        active: data.active,
        settings: {
          classTimes: classTimes.map(ct => ({
            id: ct.id,
            name: ct.name,
            startTime: ct.start_time,
            endTime: ct.end_time,
            daysOfWeek: ct.days_of_week
          })),
          // Corrigir o tipo aqui usando type assertion para garantir que o valor seja do tipo esperado
          attendanceValidationMethod: (data.settings?.attendance_validation_method || 'qrcode') as "qrcode" | "geolocation" | "code" | "manual",
          attendanceWindowMinutes: data.settings?.attendance_window_minutes || 15
        }
      };
      
      return institution;
    },
    enabled: !!profile?.institution_id
  });
  
  // Buscar configurações da instituição - Não precisamos mais, já está incluído acima
  const isLoadingSettings = false;

  return {
    profile,
    institution: institutionData,
    institutionId: profile?.institution_id,
    isLoading: isLoadingProfile || isLoadingInstitution || isLoadingSettings,
    isAdmin: profile?.role === 'admin' || profile?.role === 'coordinator',
    isTeacher: profile?.role === 'teacher',
    isStudent: profile?.role === 'student',
  };
}
