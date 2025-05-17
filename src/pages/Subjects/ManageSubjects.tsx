
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveInstitution } from "@/hooks/useActiveInstitution";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash, Check, X } from "lucide-react";

const ManageSubjects = () => {
  const { institutionId, isLoading: isLoadingInstitution } = useActiveInstitution();
  const queryClient = useQueryClient();
  
  const [open, setOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [newSubject, setNewSubject] = useState({
    name: "",
    description: "",
  });

  // Carregar disciplinas
  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ["subjects", institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("institution_id", institutionId)
        .order("name");
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!institutionId,
  });

  // Criar disciplina
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const { error } = await supabase
        .from("subjects")
        .insert({
          name: data.name,
          description: data.description,
          institution_id: institutionId,
        });
        
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Disciplina criada com sucesso!");
      setNewSubject({ name: "", description: "" });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (error) => {
      toast.error(`Erro ao criar disciplina: ${error.message}`);
    },
  });

  // Atualizar disciplina
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; description: string }) => {
      const { error } = await supabase
        .from("subjects")
        .update({
          name: data.name,
          description: data.description,
        })
        .eq("id", data.id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Disciplina atualizada com sucesso!");
      setEditingSubject(null);
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar disciplina: ${error.message}`);
    },
  });

  // Ativar/desativar disciplina
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("subjects")
        .update({ active: !active })
        .eq("id", id);
        
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(`Disciplina ${variables.active ? "desativada" : "ativada"} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (error) => {
      toast.error(`Erro ao alterar status da disciplina: ${error.message}`);
    },
  });

  // Deletar disciplina
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Disciplina excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (error) => {
      toast.error(`Erro ao excluir disciplina: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newSubject);
  };

  const handleSaveEdit = () => {
    if (editingSubject) {
      updateMutation.mutate(editingSubject);
    }
  };

  if (isLoadingInstitution) {
    return <div className="flex justify-center p-8">Carregando informações da instituição...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Gerenciar Disciplinas</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nova Disciplina
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Adicionar Disciplina</DialogTitle>
                <DialogDescription>
                  Preencha as informações para criar uma nova disciplina.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="name"
                    value={newSubject.name}
                    onChange={(e) =>
                      setNewSubject({ ...newSubject, name: e.target.value })
                    }
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="description" className="text-right">
                    Descrição
                  </Label>
                  <Textarea
                    id="description"
                    value={newSubject.description}
                    onChange={(e) =>
                      setNewSubject({ ...newSubject, description: e.target.value })
                    }
                    className="col-span-3"
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

      <div className="rounded-md border">
        {isLoading ? (
          <div className="p-4">
            <Skeleton className="h-8 w-full mb-4" />
            <Skeleton className="h-8 w-full mb-4" />
            <Skeleton className="h-8 w-full mb-4" />
          </div>
        ) : subjects.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Nenhuma disciplina cadastrada. Clique em "Nova Disciplina" para adicionar.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((subject) => (
                <TableRow key={subject.id}>
                  {editingSubject && editingSubject.id === subject.id ? (
                    <>
                      <TableCell>
                        <Input
                          value={editingSubject.name}
                          onChange={(e) =>
                            setEditingSubject({
                              ...editingSubject,
                              name: e.target.value,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editingSubject.description || ""}
                          onChange={(e) =>
                            setEditingSubject({
                              ...editingSubject,
                              description: e.target.value,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            subject.active
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {subject.active ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleSaveEdit}
                            disabled={updateMutation.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingSubject(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{subject.name}</TableCell>
                      <TableCell>{subject.description || "—"}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            subject.active
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {subject.active ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingSubject({ ...subject })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={subject.active ? "ghost" : "ghost"}
                            size="icon"
                            onClick={() => toggleActiveMutation.mutate({ id: subject.id, active: subject.active })}
                            disabled={toggleActiveMutation.isPending}
                          >
                            {subject.active ? (
                              <X className="h-4 w-4" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm("Tem certeza que deseja excluir esta disciplina?")) {
                                deleteMutation.mutate(subject.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default ManageSubjects;
