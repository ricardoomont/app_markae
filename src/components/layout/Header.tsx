import { 
  LogOut, 
  Settings, 
  User, 
  Menu,
  Home,
  CheckSquare,
  Calendar,
  BookOpen,
  Users
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useActiveInstitution } from "@/hooks/useActiveInstitution";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

function NavItem({ icon: Icon, to, children, onNavigate }: { 
  icon: React.ElementType;
  to: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="w-full justify-start text-sidebar-foreground hover:text-sidebar-foreground/80" 
      onClick={() => {
        navigate(to);
        onNavigate?.();
      }}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span>{children}</span>
      </div>
    </Button>
  );
}

export function Header() {
  const { user, signOut } = useSupabaseAuth();
  const { profile, institution, isLoading } = useActiveInstitution();
  const { isMobile } = useSidebar();
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
          
        if (!error && data) {
          setUserRole(data.role);
        }
      }
    };
    
    fetchUserRole();
  }, [user]);

  // Função para formatar o papel do usuário em português
  const formatRole = (role?: string | null) => {
    const roles: Record<string, string> = {
      admin: "Administrador",
      coordinator: "Coordenador",
      teacher: "Professor",
      student: "Aluno"
    };
    return roles[role || ""] || "Usuário";
  };

  const isAdmin = userRole === "admin";
  const isCoordinator = userRole === "coordinator";
  const isTeacher = userRole === "teacher";

  const showUsersMenu = isAdmin || isCoordinator;
  const showSubjectsMenu = isAdmin || isCoordinator;
  const showClassesMenu = isAdmin || isCoordinator || isTeacher;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-6">
        {/* Logo e Nome da Instituição */}
        <div className="flex flex-1 items-center gap-2 md:gap-4">
          {isMobile && (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="mr-2 border border-input"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="left" 
                className="w-[300px] p-0 bg-sidebar text-sidebar-foreground"
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-center h-16 border-b border-sidebar-border">
                    <h2 className="text-lg font-bold text-sidebar-foreground">MarKae</h2>
                  </div>
                  
                  <div className="flex-1 overflow-auto">
                    <div className="space-y-1 p-6">
                      <NavItem icon={Home} to="/dashboard" onNavigate={() => setIsOpen(false)}>
                        Dashboard
                      </NavItem>
                      
                      {userRole === 'student' ? (
                        <NavItem icon={CheckSquare} to="/attendance/confirm" onNavigate={() => setIsOpen(false)}>
                          Confirmar Presença
                        </NavItem>
                      ) : (
                        <NavItem icon={CheckSquare} to="/attendance" onNavigate={() => setIsOpen(false)}>
                          Presenças
                        </NavItem>
                      )}
                      
                      {showClassesMenu && (
                        <NavItem icon={Calendar} to="/classes" onNavigate={() => setIsOpen(false)}>
                          Aulas
                        </NavItem>
                      )}

                      {showSubjectsMenu && (
                        <NavItem icon={BookOpen} to="/subjects" onNavigate={() => setIsOpen(false)}>
                          Matérias
                        </NavItem>
                      )}
                      
                      {showUsersMenu && (
                        <NavItem icon={Users} to="/users" onNavigate={() => setIsOpen(false)}>
                          Usuários
                        </NavItem>
                      )}

                      {isAdmin && (
                        <>
                          <Separator className="my-2 bg-sidebar-border" />
                          <NavItem icon={Settings} to="/settings" onNavigate={() => setIsOpen(false)}>
                            Configurações
                          </NavItem>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-sidebar-border p-6">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start text-sidebar-foreground hover:text-sidebar-foreground/80" 
                      onClick={() => {
                        setIsOpen(false);
                        signOut();
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      <span>Sair</span>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
          <Link 
            to="/dashboard" 
            className="flex items-center gap-2 transition-colors hover:opacity-80"
          >
            <span className="font-bold text-xl text-primary">MarKae</span>
          </Link>
          {institution?.name && (
            <>
              <span className="hidden md:inline-block text-muted-foreground/60">|</span>
              <span className={cn(
                "text-sm text-muted-foreground truncate max-w-[200px]",
                "hidden md:inline-block"
              )}>
                {institution.name}
              </span>
            </>
          )}
        </div>

        {/* Menu do Usuário */}
        <div className="flex items-center gap-4 pr-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative flex items-center gap-2 h-9 w-9 rounded-full md:h-auto md:w-auto md:px-4 md:py-2"
              >
                {isLoading ? (
                  <Skeleton className="h-8 w-8 rounded-full" />
                ) : (
                  <>
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={profile?.avatar_url} 
                        alt={profile?.name || user?.email} 
                      />
                      <AvatarFallback>
                        {profile?.name?.charAt(0) || user?.email?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline-block text-sm font-medium">
                      {profile?.name}
                    </span>
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold">
                    {profile?.name || "Usuário"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Perfil: {formatRole(userRole)}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex w-full items-center cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex w-full items-center cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => signOut()}
                className="cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
