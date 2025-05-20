import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveInstitution } from "@/hooks/useActiveInstitution";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Clock, Edit, Save, X, MapPin } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import type { InstitutionSettings } from "@/types";

type ClassTimeType = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  isEditing?: boolean;
};

interface CustomInstitutionSettings extends Omit<InstitutionSettings, 'created_at' | 'updated_at'> {
  created_at?: string;
  updated_at?: string;
}

interface InstitutionData {
  id: string;
  name: string;
  logo: string;
  active: boolean;
  settings: CustomInstitutionSettings;
}

const InstitutionSettings = () => {
  const { institution, isLoading: isLoadingInstitutionHook, institutionId } = useActiveInstitution();
  const queryClient = useQueryClient();
  
  // Buscar todos os horários de aula diretamente para garantir dados atualizados
  const { data: classTimes = [], isLoading: isLoadingClassTimes } = useQuery({
    queryKey: ['classTimes', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      
      const { data, error } = await supabase
        .from('class_times')
        .select('*')
        .eq('institution_id', institutionId);
        
      if (error) {
        console.error('Erro ao carregar horários:', error);
        return [];
      }
      
      // Formatar os horários para o formato esperado pelo componente
      return (data || []).map(ct => ({
        id: ct.id,
        name: ct.name,
        startTime: ct.start_time,
        endTime: ct.end_time,
        daysOfWeek: ct.days_of_week || [],
        isEditing: false
      }));
    },
    enabled: !!institutionId
  });
  
  // Buscar configurações da instituição diretamente
  const { data: directSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['institution_settings_direct', institutionId],
    queryFn: async () => {
      if (!institutionId) return null;
      
      const { data, error } = await supabase
        .from('institution_settings')
        .select('*')
        .eq('institution_id', institutionId)
        .single();
        
      if (error) {
        console.error('Erro ao buscar configurações diretamente:', error);
        return null;
      }
      
      console.log("Configurações buscadas diretamente:", data);
      return data as any; // Usar 'as any' para evitar erros de tipagem
    },
    enabled: !!institutionId
  });
  
  const [institutionData, setInstitutionData] = useState<InstitutionData | null>(null);
  const [localClassTimes, setLocalClassTimes] = useState<ClassTimeType[]>([]);
  const [newClassTime, setNewClassTime] = useState<Partial<ClassTimeType>>({
    name: "",
    startTime: "",
    endTime: "",
    daysOfWeek: [4], // Default to Thursday
  });
  const [isSaving, setIsSaving] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string>("");

  // Adicionar log para debug dos dados recebidos
  useEffect(() => {
    if (institution?.settings) {
      console.log("Dados de configurações carregados:", institution.settings);
    }
  }, [institution]);

  // Inicializar dados quando o componente for carregado
  useEffect(() => {
    if (institution) {
      setInstitutionData({
        id: institution.id,
        name: institution.name,
        logo: institution.logo || "",
        active: institution.active || false,
        settings: {
          id: institution.settings?.id || "",
          institution_id: institution.id,
          primary_color: institution.settings?.primary_color || "#000000",
          attendance_validation_method: (institution.settings?.attendance_validation_method || "qrcode") as 'qrcode' | 'geolocation' | 'code' | 'manual',
          attendance_window_minutes: institution.settings?.attendance_window_minutes || 15,
          default_temporary_password: institution.settings?.default_temporary_password || "",
          latitude: institution.settings?.latitude || null,
          longitude: institution.settings?.longitude || null,
          geolocation_radius: institution.settings?.geolocation_radius || 100,
        },
      });
    }
  }, [institution]);

  // Atualizar a senha temporária quando os dados diretos forem carregados
  useEffect(() => {
    if (directSettings) {
      const password = (directSettings as any).default_temporary_password || "";
      console.log("Senha temporária carregada do banco:", password);
      setTemporaryPassword(password);
    }
  }, [directSettings]);

  // Atualizar os horários locais quando os dados são carregados
  useEffect(() => {
    if (classTimes && Array.isArray(classTimes)) {
      setLocalClassTimes(classTimes);
    }
  }, [classTimes]);

  // Atualizar instituição
  const updateInstitutionMutation = useMutation({
    mutationFn: async (data: InstitutionData) => {
      if (!data || !data.id || !data.settings) {
        throw new Error("Dados da instituição inválidos ou incompletos");
      }
      
      // Atualizar instituição
      const { error: institutionError } = await supabase
        .from('institutions')
        .update({
          name: data.name || '',
          logo: data.logo || null,
          active: data.active || false,
        })
        .eq('id', data.id);
      
      if (institutionError) {
        console.error('Erro ao atualizar instituição:', institutionError);
        throw institutionError;
      }
      
      // Atualizar configurações da instituição
      const { error: settingsError } = await supabase
        .from('institution_settings')
        .update({
          attendance_validation_method: (data.settings.attendance_validation_method || 'qrcode') as 'qrcode' | 'geolocation' | 'code' | 'manual',
          attendance_window_minutes: data.settings.attendance_window_minutes || 15,
          default_temporary_password: data.settings.default_temporary_password,
          latitude: data.settings.latitude,
          longitude: data.settings.longitude,
          geolocation_radius: data.settings.geolocation_radius,
        })
        .eq('institution_id', data.id);
        
      if (settingsError) {
        console.error('Erro ao atualizar configurações:', settingsError);
        throw settingsError;
      }
      
      return true;
    },
    onSuccess: () => {
      toast.success("Configurações da instituição atualizadas com sucesso");
      queryClient.invalidateQueries({ queryKey: ['institution', institutionId] });
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar instituição: ${error.message}`);
    },
  });

  // Adicionar horário de aula
  const addClassTimeMutation = useMutation({
    mutationFn: async (data: Partial<ClassTimeType>) => {
      if (!institutionId) throw new Error("ID da instituição não disponível");
      if (!data.name || !data.startTime || !data.endTime || !data.daysOfWeek || data.daysOfWeek.length === 0) {
        throw new Error("Preencha todos os campos do horário");
      }
      
      const { data: newTime, error } = await supabase
        .from('class_times')
        .insert({
          institution_id: institutionId,
          name: data.name,
          start_time: data.startTime,
          end_time: data.endTime,
          days_of_week: data.daysOfWeek,
          active: true,
        })
        .select()
        .single();
        
      if (error) throw error;
      return newTime;
    },
    onSuccess: (newTime) => {
      toast.success("Horário adicionado com sucesso");
      setNewClassTime({
        name: "",
        startTime: "",
        endTime: "",
        daysOfWeek: [4], // Default to Thursday
      });
      
      // Adicionar o novo horário à lista local
      if (newTime) {
        const formattedTime: ClassTimeType = {
          id: newTime.id,
          name: newTime.name,
          startTime: newTime.start_time,
          endTime: newTime.end_time,
          daysOfWeek: newTime.days_of_week,
        };
        
        setLocalClassTimes(prev => [...prev, formattedTime]);
      }
      
      queryClient.invalidateQueries({ queryKey: ['classTimes', institutionId] });
    },
    onError: (error) => {
      toast.error(`Erro ao adicionar horário: ${error.message}`);
    },
  });

  // Atualizar horário de aula
  const updateClassTimeMutation = useMutation({
    mutationFn: async (data: ClassTimeType) => {
      const { error } = await supabase
        .from('class_times')
        .update({
          name: data.name,
          start_time: data.startTime,
          end_time: data.endTime,
          days_of_week: data.daysOfWeek,
        })
        .eq('id', data.id);
      
      if (error) throw error;
      return data;
    },
    onSuccess: (updatedTime) => {
      toast.success("Horário atualizado com sucesso");
      setLocalClassTimes(prev => 
        prev.map(ct => 
          ct.id === updatedTime.id 
            ? { ...updatedTime, isEditing: false }
            : ct
        )
      );
      queryClient.invalidateQueries({ queryKey: ['classTimes', institutionId] });
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar horário: ${error.message}`);
    },
  });

  // Remover horário de aula
  const removeClassTimeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('class_times')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      toast.success("Horário removido com sucesso");
      setLocalClassTimes(prev => prev.filter(ct => ct.id !== id));
      queryClient.invalidateQueries({ queryKey: ['classTimes', institutionId] });
    },
    onError: (error) => {
      toast.error(`Erro ao remover horário: ${error.message}`);
    },
  });

  const handleSave = () => {
    if (!institutionData) return;
    setIsSaving(true);

    try {
      updateInstitutionMutation.mutate(institutionData, {
        onSuccess: () => {
          setIsSaving(false);
          toast.success("Configurações da instituição atualizadas com sucesso");
          // Atraso pequeno para garantir que todas as atualizações do estado sejam aplicadas
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['institution', institutionId] });
          }, 100);
        },
        onError: (error) => {
          setIsSaving(false);
          toast.error(`Erro ao atualizar instituição: ${error.message}`);
        },
        onSettled: () => {
          setIsSaving(false);
        }
      });
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
      toast.error("Ocorreu um erro ao salvar. Por favor, tente novamente.");
      setIsSaving(false);
    }
  };

  const addClassTime = () => {
    addClassTimeMutation.mutate(newClassTime);
  };

  const removeClassTime = (id: string) => {
    removeClassTimeMutation.mutate(id);
  };

  const startEditingClassTime = (id: string) => {
    setLocalClassTimes(prev => 
      prev.map(ct => 
        ct.id === id 
          ? { ...ct, isEditing: true }
          : ct
      )
    );
  };

  const cancelEditingClassTime = (id: string) => {
    setLocalClassTimes(prev => 
      prev.map(ct => 
        ct.id === id 
          ? { ...ct, isEditing: false }
          : ct
      )
    );
  };

  const updateClassTimeField = (id: string, field: string, value: any) => {
    setLocalClassTimes(prev => 
      prev.map(ct => 
        ct.id === id 
          ? { ...ct, [field]: value }
          : ct
      )
    );
  };

  const saveClassTimeChanges = (classTime: ClassTimeType) => {
    updateClassTimeMutation.mutate(classTime);
  };

  const handleDayToggle = (day: number) => {
    if (!newClassTime.daysOfWeek) {
      setNewClassTime({
        ...newClassTime,
        daysOfWeek: [day],
      });
      return;
    }

    if (newClassTime.daysOfWeek.includes(day)) {
      setNewClassTime({
        ...newClassTime,
        daysOfWeek: newClassTime.daysOfWeek.filter(d => d !== day),
      });
    } else {
      setNewClassTime({
        ...newClassTime,
        daysOfWeek: [...newClassTime.daysOfWeek, day],
      });
    }
  };

  const handleDayToggleForClassTime = (classTime: ClassTimeType, day: number) => {
    let newDays;
    
    if (classTime.daysOfWeek.includes(day)) {
      newDays = classTime.daysOfWeek.filter(d => d !== day);
    } else {
      newDays = [...classTime.daysOfWeek, day];
    }
    
    updateClassTimeField(classTime.id, 'daysOfWeek', newDays);
  };

  const getDayName = (day: number) => {
    const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    return days[day];
  };

  const isLoading = isLoadingInstitutionHook || isLoadingClassTimes || isLoadingSettings;

  if (isLoadingInstitutionHook) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Configurações da Instituição</h1>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Carregando...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!institutionData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Configurações da Instituição</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Erro</CardTitle>
            <CardDescription>
              Não foi possível carregar as configurações da instituição.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()}>
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Configurações da Instituição</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
          <CardDescription>
            Configure os dados básicos da sua instituição
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Instituição</Label>
            <Input
              id="name"
              value={institutionData.name}
              onChange={(e) =>
                setInstitutionData({
                  ...institutionData,
                  name: e.target.value,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo">URL do Logo (opcional)</Label>
            <Input
              id="logo"
              value={institutionData.logo}
              onChange={(e) =>
                setInstitutionData({
                  ...institutionData,
                  logo: e.target.value,
                })
              }
              placeholder="https://exemplo.com/logo.png"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={institutionData.active}
              onCheckedChange={(checked) =>
                setInstitutionData({
                  ...institutionData,
                  active: checked,
                })
              }
            />
            <Label htmlFor="active">Instituição Ativa</Label>
          </div>
          <Button 
            onClick={() => {
              setIsSaving(true);
              updateInstitutionMutation.mutate(
                {
                  ...institutionData,
                  settings: institutionData.settings // manter as configurações atuais
                },
                {
                  onSettled: () => setIsSaving(false)
                }
              );
            }} 
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? "Salvando..." : "Salvar Informações Básicas"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações de Presença</CardTitle>
          <CardDescription>
            Configure como deseja gerenciar as presenças
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Método de Validação de Presença</Label>
            <RadioGroup
              value={institutionData.settings.attendance_validation_method}
              onValueChange={(value) =>
                setInstitutionData({
                  ...institutionData,
                  settings: {
                    ...institutionData.settings,
                    attendance_validation_method: value as 'qrcode' | 'geolocation' | 'code' | 'manual',
                  },
                })
              }
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="geolocation"
                  id="geolocation"
                />
                <Label htmlFor="geolocation">Localização (Geofencing)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="window">Janela de Tolerância (minutos)</Label>
            <Input
              id="window"
              type="number"
              min="0"
              max="60"
              value={institutionData.settings.attendance_window_minutes}
              onChange={(e) =>
                setInstitutionData({
                  ...institutionData,
                  settings: {
                    ...institutionData.settings,
                    attendance_window_minutes: parseInt(e.target.value) || 0,
                  },
                })
              }
            />
            <p className="text-sm text-muted-foreground">
              Tempo de tolerância para o aluno confirmar presença após o início da aula.
            </p>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium">Configurações de Geolocalização</h3>
            
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="0.000001"
                value={institutionData.settings.latitude || ""}
                onChange={(e) =>
                  setInstitutionData({
                    ...institutionData,
                    settings: {
                      ...institutionData.settings,
                      latitude: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="0.000001"
                value={institutionData.settings.longitude || ""}
                onChange={(e) =>
                  setInstitutionData({
                    ...institutionData,
                    settings: {
                      ...institutionData.settings,
                      longitude: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="radius">Raio de Tolerância (metros)</Label>
              <Input
                id="radius"
                type="number"
                min="10"
                max="1000"
                value={institutionData.settings.geolocation_radius || ""}
                onChange={(e) =>
                  setInstitutionData({
                    ...institutionData,
                    settings: {
                      ...institutionData.settings,
                      geolocation_radius: parseInt(e.target.value) || 0,
                    },
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                Distância máxima permitida da instituição para confirmar presença.
              </p>
            </div>

            <Button 
              variant="secondary" 
              className="w-full"
              onClick={() => {
                if ("geolocation" in navigator) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      setInstitutionData({
                        ...institutionData,
                        settings: {
                          ...institutionData.settings,
                          latitude: position.coords.latitude,
                          longitude: position.coords.longitude,
                        },
                      });
                      toast.success("Localização atual definida com sucesso!");
                    },
                    (error) => {
                      toast.error("Erro ao obter localização: " + error.message);
                    }
                  );
                } else {
                  toast.error("Seu navegador não suporta geolocalização");
                }
              }}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Usar Localização Atual
            </Button>

            <Button 
              onClick={() => {
                setIsSaving(true);
                updateInstitutionMutation.mutate(
                  {
                    ...institutionData,
                    settings: {
                      ...institutionData.settings,
                      attendance_validation_method: 'geolocation'
                    }
                  },
                  {
                    onSettled: () => setIsSaving(false)
                  }
                );
              }} 
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? "Salvando..." : "Salvar Configurações de Presença"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações de Usuários</CardTitle>
          <CardDescription>
            Configure as opções relacionadas aos usuários
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultPassword">Senha Temporária Padrão</Label>
            <Input
              id="defaultPassword"
              type="text"
              value={temporaryPassword}
              onChange={(e) => {
                console.log("Novo valor da senha temporária:", e.target.value);
                setTemporaryPassword(e.target.value);
              }}
              placeholder="Digite a senha temporária padrão"
            />
            <p className="text-sm text-gray-500 mt-1">
              {directSettings ? 
                `Valor atual no banco: "${(directSettings as any).default_temporary_password || '(vazio)'}"` : 
                "Carregando valor do banco..."}
            </p>
            <p className="text-sm text-muted-foreground">
              Esta senha será usada como padrão para todos os novos usuários criados.
              Eles poderão alterá-la no primeiro acesso.
            </p>
          </div>
          <Button 
            onClick={() => {
              try {
                setIsSaving(true);
                
                // Usar o estado temporaryPassword
                const passwordToSave = temporaryPassword;
                
                console.log("Salvando senha temporária:", passwordToSave);
                
                updateInstitutionMutation.mutate(
                  {
                    ...institutionData,
                    settings: {
                      ...institutionData.settings,
                      default_temporary_password: passwordToSave
                    }
                  },
                  {
                    onSuccess: () => {
                      toast.success("Configurações de usuários salvas com sucesso");
                      setTimeout(() => {
                        queryClient.invalidateQueries({ queryKey: ['institution_settings_direct', institutionId] });
                      }, 100);
                    },
                    onSettled: () => setIsSaving(false)
                  }
                );
              } catch (err) {
                console.error("Erro ao salvar configurações de usuários:", err);
                toast.error("Ocorreu um erro ao salvar. Por favor, tente novamente.");
                setIsSaving(false);
              }
            }} 
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? "Salvando..." : "Salvar Configurações de Usuários"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horários de Aulas</CardTitle>
          <CardDescription>
            Configure os horários disponíveis para aulas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {localClassTimes.length > 0 ? (
            <div className="space-y-4">
              {localClassTimes.map((classTime) => (
                <div
                  key={classTime.id}
                  className="border rounded-md p-3"
                >
                  {classTime.isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`name-${classTime.id}`}>Nome</Label>
                          <Input
                            id={`name-${classTime.id}`}
                            value={classTime.name}
                            onChange={(e) => updateClassTimeField(classTime.id, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Dias da Semana</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                              <Button
                                key={day}
                                type="button"
                                size="sm"
                                variant={
                                  classTime.daysOfWeek?.includes(day)
                                    ? "default"
                                    : "outline"
                                }
                                onClick={() => handleDayToggleForClassTime(classTime, day)}
                                className="text-xs"
                              >
                                {getDayName(day).slice(0, 3)}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`startTime-${classTime.id}`}>Hora de Início</Label>
                          <Input
                            id={`startTime-${classTime.id}`}
                            type="time"
                            value={classTime.startTime}
                            onChange={(e) => updateClassTimeField(classTime.id, 'startTime', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`endTime-${classTime.id}`}>Hora de Término</Label>
                          <Input
                            id={`endTime-${classTime.id}`}
                            type="time"
                            value={classTime.endTime}
                            onChange={(e) => updateClassTimeField(classTime.id, 'endTime', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelEditingClassTime(classTime.id)}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveClassTimeChanges(classTime)}
                        >
                          <Save className="mr-1 h-4 w-4" />
                          Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{classTime.name}</p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>
                            {classTime.startTime} - {classTime.endTime}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {classTime.daysOfWeek.map((day) => (
                            <Badge key={day} variant="outline">
                              {getDayName(day)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditingClassTime(classTime.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeClassTime(classTime.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Nenhum horário configurado
            </div>
          )}

          <Separator className="my-4" />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Adicionar Novo Horário</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="classTimeName">Nome</Label>
                <Input
                  id="classTimeName"
                  placeholder="Ex: Primeira Aula"
                  value={newClassTime.name}
                  onChange={(e) =>
                    setNewClassTime({ ...newClassTime, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Dias da Semana</Label>
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                    <Button
                      key={day}
                      type="button"
                      size="sm"
                      variant={
                        newClassTime.daysOfWeek?.includes(day)
                          ? "default"
                          : "outline"
                      }
                      onClick={() => handleDayToggle(day)}
                      className="text-xs"
                    >
                      {getDayName(day).slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Hora de Início</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={newClassTime.startTime}
                  onChange={(e) =>
                    setNewClassTime({ ...newClassTime, startTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Hora de Término</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={newClassTime.endTime}
                  onChange={(e) =>
                    setNewClassTime({ ...newClassTime, endTime: e.target.value })
                  }
                />
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={addClassTime} 
              className="mt-2"
              disabled={addClassTimeMutation.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              {addClassTimeMutation.isPending ? "Adicionando..." : "Adicionar Horário"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstitutionSettings;
