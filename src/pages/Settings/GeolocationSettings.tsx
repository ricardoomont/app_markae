import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActiveInstitution } from "@/hooks/useActiveInstitution";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin } from "lucide-react";

const GeolocationSettings = () => {
  const { institutionId } = useActiveInstitution();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Buscar configurações atuais
  const { data: settings } = useQuery({
    queryKey: ["geolocation-settings", institutionId],
    queryFn: async () => {
      if (!institutionId) return null;

      const { data, error } = await supabase
        .from("institution_settings")
        .select("*")
        .eq("institution_id", institutionId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!institutionId,
  });

  // Mutation para atualizar configurações
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: {
      latitude: number;
      longitude: number;
      geolocation_radius: number;
    }) => {
      if (!institutionId) throw new Error("Instituição não encontrada");

      const { error } = await supabase
        .from("institution_settings")
        .update({
          latitude: data.latitude,
          longitude: data.longitude,
          geolocation_radius: data.geolocation_radius,
        })
        .eq("institution_id", institutionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações atualizadas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["geolocation-settings"] });
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar configurações: ${error.message}`);
    },
  });

  const getCurrentLocation = () => {
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateSettingsMutation.mutate({
          latitude,
          longitude,
          geolocation_radius: settings?.geolocation_radius || 100,
        });
        setIsLoading(false);
      },
      (error) => {
        toast.error(`Erro ao obter localização: ${error.message}`);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  };

  const handleRadiusChange = (value: string) => {
    const radius = parseInt(value, 10);
    if (isNaN(radius)) return;

    updateSettingsMutation.mutate({
      latitude: settings?.latitude || 0,
      longitude: settings?.longitude || 0,
      geolocation_radius: radius,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações de Geolocalização</CardTitle>
        <CardDescription>
          Configure a localização da instituição e o raio de tolerância para confirmação de presença
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Localização Atual</h3>
              {settings?.latitude && settings?.longitude ? (
                <p className="text-sm text-muted-foreground">
                  Latitude: {settings.latitude.toFixed(6)}, Longitude:{" "}
                  {settings.longitude.toFixed(6)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma localização definida
                </p>
              )}
            </div>
            <Button
              onClick={getCurrentLocation}
              disabled={isLoading || updateSettingsMutation.isPending}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Obtendo...
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  Usar Localização Atual
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="radius">Raio de Tolerância (metros)</Label>
          <Input
            id="radius"
            type="number"
            value={settings?.geolocation_radius || 100}
            onChange={(e) => handleRadiusChange(e.target.value)}
            min={10}
            max={1000}
          />
          <p className="text-sm text-muted-foreground">
            Distância máxima permitida para confirmação de presença
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default GeolocationSettings; 