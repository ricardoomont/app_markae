import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FirstAccessPasswordChange } from "@/components/auth/FirstAccessPasswordChange";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/admin";

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("Verificando primeiro acesso...");

      // Primeiro buscar o perfil do usuário
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("email", formData.email)
        .single();

      if (profileError) {
        if (profileError.code === "PGRST116") {
          throw new Error("Usuário não encontrado");
        }
        throw profileError;
      }

      // Se for primeiro acesso
      if (profileData.is_first_access) {
        console.log("Primeiro acesso detectado, buscando configurações da instituição...");

        // Buscar configurações da instituição
        const { data: institutionSettings, error: institutionError } = await supabaseAdmin
          .from("institution_settings")
          .select("default_temporary_password")
          .eq("institution_id", profileData.institution_id)
          .single();

        if (institutionError) {
          console.error("Erro ao buscar configurações da instituição:", institutionError);
          throw new Error("Erro ao buscar configurações da instituição");
        }

        if (!institutionSettings) {
          throw new Error("Configurações da instituição não encontradas");
        }

        console.log("Dados da instituição:", institutionSettings);

        const temporaryPassword = institutionSettings.default_temporary_password;
        
        if (!temporaryPassword) {
          throw new Error("Senha temporária não configurada para esta instituição");
        }

        if (formData.password !== temporaryPassword) {
          throw new Error("Senha temporária incorreta");
        }

        console.log("Senha temporária válida, redirecionando para troca...");
        setUserEmail(formData.email);
        setIsFirstAccess(true);
        return;
      }

      console.log("Login normal, autenticando...");

      // Se não for primeiro acesso, fazer login normal
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        throw signInError;
      }

      console.log("Login bem sucedido, redirecionando...");
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");

    } catch (error: any) {
      console.error("Erro:", error);
      toast.error(`Erro ao fazer login: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Se for primeiro acesso, mostrar tela de troca de senha
  if (isFirstAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <FirstAccessPasswordChange 
          userEmail={userEmail}
          currentPassword={formData.password}
        />
      </div>
    );
  }

  // Tela de login normal
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-4">
        <Card className="w-full">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <div className="text-primary text-3xl font-bold">MarKae</div>
            </div>
            <CardTitle className="text-2xl">Bem-vindo</CardTitle>
            <CardDescription>
              Gerencie presenças e acompanhe seus alunos
            </CardDescription>
          </CardHeader>

          <Tabs value="login">
            <TabsList className="grid grid-cols-3 mx-4">
              <TabsTrigger value="login">Login</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleSubmit} className="space-y-4">
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="email@exemplo.com" 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Senha</Label>
                    </div>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        autoComplete="current-password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Login;
