import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { useActiveInstitution } from "@/hooks/useActiveInstitution";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  institution_id: string;
  created_at: string;
  updated_at: string;
  avatar_url: string;
  is_first_access: boolean;
}

const ManageUsers = () => {
  const { institutionId, institution, isLoading: isLoadingInstitution } = useActiveInstitution();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "student",
    active: true,
  });

  // Carregar usuários
  const { data: users = [], isLoading } = useQuery<Profile[]>({
    queryKey: ["users", institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      
      try {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .eq("institution_id", institutionId)
          .order("name")
          .returns<Profile[]>();
          
        if (profilesError) {
          console.error("Erro ao carregar perfis:", profilesError);
          toast.error("Erro ao carregar usuários. Por favor, tente novamente.");
          return [];
        }

        return profiles || [];
        
      } catch (error: any) {
        console.error("Erro ao carregar usuários:", error);
        toast.error("Erro ao carregar usuários. Por favor, tente novamente.");
        return [];
      }
    },
    enabled: !!institutionId,
    retry: 1,
    retryDelay: 1000,
  });

  // Criar usuário
  const createUserMutation = useMutation({
    mutationFn: async (data: typeof newUser) => {
      console.log("Iniciando createUserMutation com dados:", data);

      if (!institution?.settings?.default_temporary_password) {
        console.error("Senha temporária não configurada:", {
          institution,
          settings: institution?.settings,
        });
        throw new Error("Configure uma senha temporária padrão nas configurações da instituição antes de criar novos usuários.");
      }

      console.log("Senha temporária encontrada:", institution.settings.default_temporary_password);
      
      console.log("Chamando supabaseAdmin.auth.admin.createUser");
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: institution.settings.default_temporary_password,
        email_confirm: true,
        user_metadata: {
          name: data.name,
          role: data.role,
        }
      });

      if (authError) {
        console.error("Erro ao criar usuário no Auth:", authError);
        throw authError;
      }

      console.log("Usuário criado no Auth com sucesso:", authData);
      
      // Usar supabaseAdmin para ignorar as políticas RLS
      console.log("Criando perfil do usuário na tabela profiles");
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authData.user.id,
          name: data.name,
          role: data.role,
          institution_id: institutionId,
          active: data.active,
          is_first_access: true
        });

      if (profileError) {
        console.error("Erro ao criar perfil:", profileError);
        throw profileError;
      }

      console.log("Perfil do usuário criado com sucesso");
      return authData;
    },
    onSuccess: () => {
      toast.success("Usuário criado com sucesso! Um email será enviado com as instruções de acesso.");
      setNewUser({
        name: "",
        email: "",
        role: "student",
        active: true,
      });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["users", institutionId] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar usuário: ${error.message}`);
    },
  });

  // Atualizar usuário
  const updateUserMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Iniciando atualização do usuário com dados:", data);

      // Atualizar o perfil do usuário usando supabaseAdmin para ignorar RLS
      const { data: updatedData, error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          name: data.name,
          role: data.role,
          active: data.active,
        })
        .eq("id", data.id)
        .select();
        
      if (profileError) {
        console.error("Erro ao atualizar perfil:", profileError);
        throw profileError;
      }

      // Atualizar os metadados do usuário no Auth
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        data.id,
        {
          user_metadata: {
            name: data.name,
            role: data.role,
          }
        }
      );

      if (authError) {
        console.error("Erro ao atualizar metadados do usuário:", authError);
        throw authError;
      }
      
      console.log("Usuário atualizado com sucesso:", updatedData);
      return updatedData;
    },
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["users", institutionId] });
    },
    onError: (error: any) => {
      console.error("Erro completo ao atualizar usuário:", error);
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
    },
  });

  // Adicionar mutation para exclusão
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      // Excluir o usuário usando o cliente admin
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);

      if (deleteError) {
        console.error('Erro ao excluir usuário:', deleteError);
        throw deleteError;
      }

      return { success: true };
    },
    onSuccess: () => {
      toast.success("Usuário excluído com sucesso!");
      setDeletingUser(null);
      queryClient.invalidateQueries({ queryKey: ["users", institutionId] });
    },
    onError: (error: any) => {
      console.error('Erro ao excluir usuário:', error);
      toast.error(`Erro ao excluir usuário: ${error.message}`);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Função handleCreate executada");
    
    if (!newUser.name || !newUser.role) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    console.log("Verificando institution e senha temporária:", {
      institution: institution,
      hasSettings: !!institution?.settings,
      defaultTempPassword: institution?.settings?.default_temporary_password,
    });
    
    createUserMutation.mutate(newUser);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Função handleUpdate executada");
    
    if (!editingUser?.name || !editingUser?.role) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    console.log("Dados do usuário para atualização:", editingUser);
    updateUserMutation.mutate(editingUser);
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
  };

  const formatRole = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "coordinator":
        return "Coordenador";
      case "teacher":
        return "Professor";
      case "student":
        return "Aluno";
      default:
        return role;
    }
  };

  if (isLoadingInstitution) {
    return <div className="flex justify-center p-8">Carregando informações da instituição...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Gerenciar Usuários</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={(e) => {
              console.log("Formulário submetido!");
              handleCreate(e);
            }}>
              <DialogHeader>
                <DialogTitle>Adicionar Usuário</DialogTitle>
                <DialogDescription>
                  Preencha as informações para criar um novo usuário.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Função
                  </Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Selecione uma função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="teacher">Professor</SelectItem>
                      <SelectItem value="student">Aluno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="active" className="text-right">
                    Ativo
                  </Label>
                  <div className="col-span-3">
                    <Switch
                      id="active"
                      checked={newUser.active}
                      onCheckedChange={(checked) =>
                        setNewUser({ ...newUser, active: checked })
                      }
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createUserMutation.isPending}
                  onClick={(e) => {
                    console.log("Botão de criação clicado!");
                    if (!createUserMutation.isPending) {
                      // O evento de submit do formulário já deveria lidar com isso,
                      // mas vamos garantir com uma chamada extra
                      // e.preventDefault(); - Não prevenir o padrão aqui para permitir o submit do form
                    }
                  }}
                >
                  {createUserMutation.isPending ? "Criando..." : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
          <CardDescription>
            Gerencie os usuários da sua instituição
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nenhum usuário encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Senha Atualizada</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email || "Não disponível"}</TableCell>
                    <TableCell>{formatRole(user.role)}</TableCell>
                    <TableCell>
                      <div
                        className={cn(
                          "flex items-center gap-2",
                          user.active
                            ? "text-green-600"
                            : "text-muted-foreground"
                        )}
                      >
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            user.active
                              ? "bg-green-600"
                              : "bg-muted-foreground"
                          )}
                        />
                        {user.active ? "Ativo" : "Inativo"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className={cn(
                          "flex items-center gap-2",
                          !user.is_first_access
                            ? "text-green-600"
                            : "text-yellow-600"
                        )}
                      >
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            !user.is_first_access
                              ? "bg-green-600"
                              : "bg-yellow-600"
                          )}
                        />
                        {!user.is_first_access ? "Sim" : "Não"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeletingUser(user)}
                          >
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de edição */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent>
            <form onSubmit={(e) => {
              console.log("Formulário de edição submetido!");
              handleUpdate(e);
            }}>
              <DialogHeader>
                <DialogTitle>Editar Usuário</DialogTitle>
                <DialogDescription>
                  Atualize as informações do usuário.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Nome</Label>
                  <Input
                    id="edit-name"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-role">Função</Label>
                  <Select
                    value={editingUser.role}
                    onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="coordinator">Coordenador</SelectItem>
                      <SelectItem value="teacher">Professor</SelectItem>
                      <SelectItem value="student">Aluno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-active"
                    checked={editingUser.active}
                    onCheckedChange={(checked) => setEditingUser({ ...editingUser, active: checked })}
                  />
                  <Label htmlFor="edit-active">Usuário Ativo</Label>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={updateUserMutation.isPending}
                  onClick={(e) => {
                    console.log("Botão Salvar Alterações clicado!");
                    // Não prevenir o evento padrão para que o formulário seja submetido normalmente
                  }}
                >
                  {updateUserMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o usuário{" "}
              {deletingUser?.name} e todos os seus dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingUser && deleteUserMutation.mutate(deletingUser.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageUsers;
