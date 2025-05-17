import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { isValidPassword } from "@/lib/auth-helpers";

interface FirstAccessPasswordChangeProps {
  userEmail: string;
  currentPassword: string;
}

export function FirstAccessPasswordChange({ userEmail, currentPassword }: FirstAccessPasswordChangeProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!isValidPassword(formData.password)) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (formData.password === currentPassword) {
      toast.error("A nova senha não pode ser igual à senha atual");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Iniciando processo de troca de senha...");
      
      // Primeiro fazer login com a senha atual
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword
      });

      if (signInError) {
        console.error("Erro ao autenticar:", signInError);
        throw new Error("Senha atual incorreta");
      }

      if (!signInData.user) {
        throw new Error("Usuário não encontrado");
      }

      console.log("Usuário autenticado, atualizando senha...");

      // Atualizar senha
      const { error: updatePasswordError } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (updatePasswordError) {
        console.error("Erro ao atualizar senha:", updatePasswordError);
        throw updatePasswordError;
      }

      console.log("Senha atualizada, atualizando perfil...");

      // Atualizar perfil
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          is_first_access: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', signInData.user.id);

      if (updateProfileError) {
        console.error("Erro ao atualizar perfil:", updateProfileError);
        throw updateProfileError;
      }

      console.log("Perfil atualizado com sucesso");
      toast.success("Senha alterada com sucesso! Por favor, faça login com sua nova senha.");
      
      // Fazer logout
      await supabase.auth.signOut();
      
      // Redirecionar para login após um breve delay
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error: any) {
      console.error("Erro completo:", error);
      toast.error(`Erro ao alterar senha: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Alterar Senha</CardTitle>
        <CardDescription>
          Por segurança, você precisa alterar sua senha no primeiro acesso.
          A senha atual é temporária e não poderá ser usada novamente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="pr-10"
                placeholder="Digite sua nova senha"
                required
                minLength={6}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                className="pr-10"
                placeholder="Confirme sua nova senha"
                required
                minLength={6}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Alterando...
              </>
            ) : (
              "Alterar Senha"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 