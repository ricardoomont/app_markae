import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveInstitution } from "@/hooks/useActiveInstitution";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { format } from "date-fns";
import { CalendarIcon, Plus, Pencil, Trash2, Power } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatabaseClass {
  id: string;
  institution_id: string;
  date: string;
  title: string | null;
  description: string | null;
  subject_id: string;
  teacher_id: string;
  class_time_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface Class extends DatabaseClass {
  subject?: {
    id: string;
    name: string;
  };
  teacher?: {
    id: string;
    name: string;
  };
  classTime?: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
  };
}

interface EditingClass {
  id: string;
  date: string;
  title: string;
  description: string;
  subject_id: string;
  teacher_id: string;
  class_time_id: string;
}

const ManageClasses = () => {
  const { institutionId, isLoading: isLoadingInstitution } = useActiveInstitution();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<EditingClass | null>(null);
  const [deletingClass, setDeletingClass] = useState<Class | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  const [newClass, setNewClass] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    title: "",
    description: "",
    subject_id: "",
    teacher_id: "",
    class_time_id: "",
  });

  // Carregar aulas
  const { data: classes = [], isLoading: isLoadingClasses, error: classesError } = useQuery({
    queryKey: ["classes", institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      
      const { data, error } = await supabase
        .from("classes")
        .select(`
          *,
          subject:subjects(*),
          teacher:profiles(*),
          classTime:class_times(*)
        `)
        .eq("institution_id", institutionId)
        .order("date", { ascending: false });
        
      if (error) throw error;
      return (data || []) as unknown as Class[];
    },
    enabled: !!institutionId,
  });

  // Carregar matérias
  const { data: subjects = [], isLoading: isLoadingSubjects } = useQuery({
    queryKey: ["subjects", institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("institution_id", institutionId)
        .eq("active", true);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!institutionId,
  });

  // Carregar professores
  const { data: teachers = [], isLoading: isLoadingTeachers } = useQuery({
    queryKey: ["teachers", institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("institution_id", institutionId)
        .eq("role", "teacher")
        .eq("active", true);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!institutionId,
  });

  // Carregar horários
  const { data: classTimes = [], isLoading: isLoadingClassTimes } = useQuery({
    queryKey: ["classTimes", institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      
      const { data, error } = await supabase
        .from("class_times")
        .select("*")
        .eq("institution_id", institutionId);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!institutionId,
  });

  // Mutations para ações nas aulas
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("classes")
        .update({ active } as DatabaseClass)
        .eq("id", id)
        .select();
        
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status da aula atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar status da aula: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", id);
        
      if (error) throw error;
    },
    onError: (error) => {
      toast.error(`Erro ao excluir aula: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EditingClass) => {
      const { error } = await supabase
        .from("classes")
        .update({
          date: data.date,
          title: data.title,
          description: data.description,
          subject_id: data.subject_id,
          teacher_id: data.teacher_id,
          class_time_id: data.class_time_id,
        })
        .eq("id", data.id);
        
      if (error) throw error;
    }
  });

  // Criar aula
  const createMutation = useMutation({
    mutationFn: async (data: typeof newClass) => {
      const { data: newClassData, error } = await supabase
        .from("classes")
        .insert({
          institution_id: institutionId,
          date: data.date,
          title: data.title,
          description: data.description,
          subject_id: data.subject_id,
          teacher_id: data.teacher_id,
          class_time_id: data.class_time_id,
        })
        .select()
        .abortSignal(AbortSignal.timeout(30000));
        
      if (error) throw error;
      return newClassData;
    },
    onSuccess: () => {
      toast.success("Aula criada com sucesso!");
      setNewClass({
        date: format(new Date(), "yyyy-MM-dd"),
        title: "",
        description: "",
        subject_id: "",
        teacher_id: "",
        class_time_id: "",
      });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (error) => {
      toast.error(`Erro ao criar aula: ${error.message}`);
    },
  });

  const handleDateChange = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate) {
      setNewClass({
        ...newClass,
        date: format(selectedDate, "yyyy-MM-dd"),
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.subject_id || !newClass.teacher_id || !newClass.class_time_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    createMutation.mutate(newClass);
  };

  if (isLoadingInstitution) {
    return <div className="flex justify-center p-8">Carregando informações da instituição...</div>;
  }

  if (classesError) {
    console.error("Erro ao carregar aulas:", classesError);
    return <div className="flex justify-center p-8 text-red-600">Erro ao carregar aulas. Por favor, tente novamente.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Gerenciar Aulas</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nova Aula
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Adicionar Aula</DialogTitle>
                <DialogDescription>
                  Preencha as informações para agendar uma nova aula.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">
                    Data
                  </Label>
                  <div className="col-span-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                          type="button"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "dd/MM/yyyy") : <span>Selecione uma data</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(selectedDate) => {
                            // Pequeno atraso para evitar problemas com eventos touch em dispositivos móveis
                            setTimeout(() => {
                              setDate(selectedDate);
                              if (selectedDate) {
                                setNewClass({
                                  ...newClass,
                                  date: format(selectedDate, "yyyy-MM-dd"),
                                });
                              }
                            }, 10);
                          }}
                          initialFocus
                          disabled={(date) => date < new Date("1900-01-01")} // Evitar datas muito antigas que podem causar problemas
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="subject" className="text-right">
                    Matéria
                  </Label>
                  <Select
                    value={newClass.subject_id}
                    onValueChange={(value) => setNewClass({ ...newClass, subject_id: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Selecione uma matéria" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingSubjects ? (
                        <div className="p-2 text-center">Carregando...</div>
                      ) : subjects.length === 0 ? (
                        <div className="p-2 text-center">Nenhuma matéria disponível</div>
                      ) : (
                        subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="teacher" className="text-right">
                    Professor
                  </Label>
                  <Select
                    value={newClass.teacher_id}
                    onValueChange={(value) => setNewClass({ ...newClass, teacher_id: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Selecione um professor" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingTeachers ? (
                        <div className="p-2 text-center">Carregando...</div>
                      ) : teachers.length === 0 ? (
                        <div className="p-2 text-center">Nenhum professor disponível</div>
                      ) : (
                        teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="classTime" className="text-right">
                    Horário
                  </Label>
                  <Select
                    value={newClass.class_time_id}
                    onValueChange={(value) => setNewClass({ ...newClass, class_time_id: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Selecione um horário" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingClassTimes ? (
                        <div className="p-2 text-center">Carregando...</div>
                      ) : classTimes.length === 0 ? (
                        <div className="p-2 text-center">Nenhum horário disponível</div>
                      ) : (
                        classTimes.map((classTime) => (
                          <SelectItem key={classTime.id} value={classTime.id}>
                            {classTime.name} ({classTime.start_time} - {classTime.end_time})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Título (opcional)
                  </Label>
                  <Input
                    id="title"
                    value={newClass.title}
                    onChange={(e) => setNewClass({ ...newClass, title: e.target.value })}
                    className="col-span-3"
                    placeholder="Ex: Revisão para avaliação"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Descrição (opcional)
                  </Label>
                  <Textarea
                    id="description"
                    value={newClass.description}
                    onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                    className="col-span-3"
                    placeholder="Detalhes sobre a aula..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoadingClasses ? (
        <div className="space-y-3">
          <Skeleton className="h-[125px] w-full rounded-lg" />
          <Skeleton className="h-[125px] w-full rounded-lg" />
          <Skeleton className="h-[125px] w-full rounded-lg" />
        </div>
      ) : classes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma Aula Cadastrada</CardTitle>
            <CardDescription>
              Você ainda não tem nenhuma aula cadastrada. Comece criando sua primeira aula!
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Para começar, clique no botão "Nova Aula" acima e preencha as informações necessárias.
              </p>
              <p className="text-muted-foreground">
                Você precisará selecionar:
              </p>
              <ul className="text-muted-foreground list-disc list-inside">
                <li>Data da aula</li>
                <li>Matéria</li>
                <li>Professor</li>
                <li>Horário</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Criar Primeira Aula
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid gap-4">
          {classes.map((cls) => (
            <Card key={cls.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className={cn(
                      !cls.active && "text-muted-foreground"
                    )}>{cls.subject?.name || "Sem matéria"}</CardTitle>
                    <CardDescription>
                      {format(new Date(`${cls.date}T12:00:00`), "dd/MM/yyyy")} • {cls.classTime?.name} ({cls.classTime?.start_time} - {cls.classTime?.end_time})
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground mr-4">
                      Professor: {cls.teacher?.name}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingClass({
                          id: cls.id,
                          date: cls.date,
                          title: cls.title || "",
                          description: cls.description || "",
                          subject_id: cls.subject_id,
                          teacher_id: cls.teacher_id,
                          class_time_id: cls.class_time_id,
                        });
                        setDate(new Date(cls.date));
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActiveMutation.mutate({ id: cls.id, active: !cls.active })}
                    >
                      <Power className={cn(
                        "h-4 w-4",
                        cls.active ? "text-green-500" : "text-muted-foreground"
                      )} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingClass(cls)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {cls.description && (
                <CardContent>
                  <p className={cn(
                    "text-sm",
                    cls.active ? "text-muted-foreground" : "text-muted-foreground/60"
                  )}>{cls.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Edição */}
      <Dialog 
        open={!!editingClass} 
        onOpenChange={(open) => {
          // Se estiver fechando o diálogo
          if (!open) {
            // Pequeno atraso antes de limpar o estado para evitar problemas de DOM no mobile
            setTimeout(() => {
              setEditingClass(null);
            }, 50);
          }
        }}
      >
        <DialogContent className="sm:max-w-[550px]">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!editingClass?.subject_id || !editingClass?.teacher_id || !editingClass?.class_time_id) {
              toast.error("Preencha todos os campos obrigatórios");
              return;
            }
            try {
              updateMutation.mutate(editingClass, {
                onSuccess: () => {
                  toast.success("Aula atualizada com sucesso!");
                  // Atraso maior para garantir que a atualização do estado tenha tempo de concluir
                  // e evitar problemas de DOM no mobile
                  setTimeout(() => {
                    // Primeiro, invalidamos os dados
                    queryClient.invalidateQueries({ queryKey: ["classes"] });
                    
                    // Depois, com um pequeno atraso adicional, fechamos o modal
                    setTimeout(() => {
                      setEditingClass(null);
                    }, 100);
                  }, 200);
                },
                onError: (error) => {
                  toast.error(`Erro ao atualizar aula: ${error.message}`);
                }
              });
            } catch (err) {
              console.error("Erro ao atualizar aula:", err);
              toast.error("Ocorreu um erro ao salvar. Por favor, tente novamente.");
            }
          }}>
            <DialogHeader>
              <DialogTitle>Editar Aula</DialogTitle>
              <DialogDescription>
                Altere as informações da aula.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-date" className="text-right">
                  Data
                </Label>
                <div className="col-span-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                        type="button"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "dd/MM/yyyy") : <span>Selecione uma data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                                              <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(selectedDate) => {
                            // Pequeno atraso para evitar problemas com eventos touch em dispositivos móveis
                            setTimeout(() => {
                              setDate(selectedDate);
                              if (selectedDate && editingClass) {
                                setEditingClass({
                                  ...editingClass,
                                  date: format(selectedDate, "yyyy-MM-dd"),
                                });
                              }
                            }, 10);
                          }}
                          initialFocus
                          disabled={(date) => date < new Date("1900-01-01")} // Evitar datas muito antigas que podem causar problemas
                        />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-subject" className="text-right">
                  Matéria
                </Label>
                <Select
                  value={editingClass?.subject_id}
                  onValueChange={(value) => editingClass && setEditingClass({ ...editingClass, subject_id: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione uma matéria" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-teacher" className="text-right">
                  Professor
                </Label>
                <Select
                  value={editingClass?.teacher_id}
                  onValueChange={(value) => editingClass && setEditingClass({ ...editingClass, teacher_id: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione um professor" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-classTime" className="text-right">
                  Horário
                </Label>
                <Select
                  value={editingClass?.class_time_id}
                  onValueChange={(value) => editingClass && setEditingClass({ ...editingClass, class_time_id: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione um horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {classTimes.map((classTime) => (
                      <SelectItem key={classTime.id} value={classTime.id}>
                        {classTime.name} ({classTime.start_time} - {classTime.end_time})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-title" className="text-right">
                  Título (opcional)
                </Label>
                <Input
                  id="edit-title"
                  value={editingClass?.title}
                  onChange={(e) => editingClass && setEditingClass({ ...editingClass, title: e.target.value })}
                  className="col-span-3"
                  placeholder="Ex: Revisão para avaliação"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Descrição (opcional)
                </Label>
                <Textarea
                  id="edit-description"
                  value={editingClass?.description}
                  onChange={(e) => editingClass && setEditingClass({ ...editingClass, description: e.target.value })}
                  className="col-span-3"
                  placeholder="Detalhes sobre a aula..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog 
        open={!!deletingClass} 
        onOpenChange={(open) => {
          // Se estiver fechando o diálogo
          if (!open) {
            // Pequeno atraso antes de limpar o estado para evitar problemas de DOM no mobile
            setTimeout(() => {
              setDeletingClass(null);
            }, 50);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a aula
              {deletingClass?.subject?.name && ` de ${deletingClass.subject.name}`} do dia {deletingClass && format(new Date(`${deletingClass.date}T12:00:00`), "dd/MM/yyyy")}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={() => {
                if (deletingClass) {
                  // Usar timeout para evitar problemas de DOM no mobile
                  setTimeout(() => {
                    deleteMutation.mutate(deletingClass.id, {
                      onSuccess: () => {
                        toast.success("Aula excluída com sucesso!");
                        // Atraso para garantir que a UI tenha tempo de atualizar
                        setTimeout(() => {
                          setDeletingClass(null);
                          queryClient.invalidateQueries({ queryKey: ["classes"] });
                        }, 100);
                      }
                    });
                  }, 10);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageClasses;
