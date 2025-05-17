import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { FirstAccessPasswordChange } from "@/components/auth/FirstAccessPasswordChange";
import { toast } from "sonner";

export function ProtectedFirstAccessRoute() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("Iniciando verificação de primeiro acesso...");
        
        // Verificar sessão atual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Erro ao obter sessão:", sessionError);
          throw sessionError;
        }

        if (!session) {
          console.log("Sessão não encontrada, redirecionando para login");
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        console.log("Sessão encontrada, verificando perfil do usuário...");

        // Primeiro buscar o perfil do usuário
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("*, institution_id")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          console.error("Erro ao buscar perfil:", profileError);
          throw profileError;
        }

        if (!profileData) {
          console.error("Perfil não encontrado");
          throw new Error("Perfil não encontrado");
        }

        console.log("Perfil encontrado:", profileData);

        // Verificar se é primeiro acesso
        if (!profileData.is_first_access) {
          console.log("Não é primeiro acesso, redirecionando para dashboard");
          setIsAuthenticated(true);
          setIsFirstAccess(false);
          setIsLoading(false);
          return;
        }

        // Buscar configurações da instituição
        console.log("Buscando configurações da instituição...");
        const { data: institutionData, error: institutionError } = await supabaseAdmin
          .from("institutions")
          .select("settings")
          .eq("id", profileData.institution_id)
          .single();

        if (institutionError) {
          console.error("Erro ao buscar instituição:", institutionError);
          throw institutionError;
        }

        if (!institutionData) {
          console.error("Instituição não encontrada");
          throw new Error("Instituição não encontrada");
        }

        console.log("Dados da instituição:", institutionData);

        // Configurar senha temporária
        const defaultTemp = institutionData.settings?.defaultTemporaryPassword;
        if (!defaultTemp) {
          console.error("Senha temporária não configurada na instituição");
          throw new Error("Senha temporária não configurada na instituição");
        }

        console.log("Configurando senha temporária para troca");
        setTemporaryPassword(defaultTemp);
        setIsAuthenticated(true);
        setIsFirstAccess(true);
        
      } catch (error: any) {
        console.error("Erro na verificação de primeiro acesso:", error);
        toast.error(`Erro ao verificar acesso: ${error.message}`);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2">Verificando acesso...</div>
          <div className="text-sm text-muted-foreground">Aguarde um momento</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    toast.error("Você precisa estar autenticado para acessar esta página");
    return <Navigate to="/login" replace />;
  }

  if (!isFirstAccess) {
    toast.info("Você já alterou sua senha");
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <FirstAccessPasswordChange defaultTemporaryPassword={temporaryPassword} />
    </div>
  );
} 