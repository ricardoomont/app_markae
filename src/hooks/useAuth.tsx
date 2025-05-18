import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, UserRole } from "@/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

interface ProfileData {
  id: string;
  name: string;
  role: string;
  avatar_url: string;
  active: boolean;
  institution_id: string;
  is_first_access?: boolean;
  created_at: string;
  updated_at: string;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      if (!mounted) return;
      
      try {
        console.log("Inicializando autenticação...");
        setLoading(true);
        
        // Buscar sessão atual
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          console.log("Sessão encontrada, buscando perfil do usuário...");
          await fetchUser(session.user.id);
        } else {
          console.log("Nenhuma sessão encontrada");
          setUser(null);
        }
      } catch (error) {
        console.error("Erro na inicialização da autenticação:", error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    // Inicializar autenticação
    initializeAuth();

    // Escutar mudanças na autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      console.log("Mudança no estado de autenticação:", _event);
      setLoading(true);
      
      try {
        if (session?.user) {
          console.log("Novo usuário autenticado, atualizando perfil...");
          await fetchUser(session.user.id);
        } else {
          console.log("Usuário desconectado");
          setUser(null);
        }
      } catch (error) {
        console.error("Erro ao atualizar usuário:", error);
        setUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUser = async (userId: string) => {
    try {
      console.log("Buscando perfil do usuário:", userId);

      // Buscar dados do perfil
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Erro ao buscar perfil:", profileError);
        throw profileError;
      }

      if (!profileData) {
        console.log("Nenhum perfil encontrado");
        setUser(null);
        return;
      }

      // Buscar dados do usuário autenticado para obter o email
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error("Erro ao buscar dados do usuário:", authError);
        throw authError;
      }

      console.log("Perfil encontrado:", profileData);
      console.log("Dados de autenticação:", authUser);
      
      // Mapear os dados do perfil para o tipo User
      const profile = profileData as ProfileData;
      const userData: User = {
        id: profile.id,
        name: profile.name,
        email: authUser?.email || '',
        role: profile.role as UserRole,
        avatar: profile.avatar_url,
        active: profile.active,
        institutionId: profile.institution_id,
        isFirstAccess: profile.is_first_access || false
      };

      setUser(userData);
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 