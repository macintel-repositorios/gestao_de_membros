"use client";

import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Church,
  MapPin,
  Phone,
  Mail,
  User,
  Building2,
  Flag,
  Edit,
} from "lucide-react";
import { Igreja } from "@/lib/types";

interface IgrejaViewProps {
  igreja: Igreja;
  onEdit?: () => void;
}

export function IgrejaView({ igreja, onEdit }: IgrejaViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Verifica se tem coordenadas válidas
  const temCoordenadas = igreja.coordenadas && 
    typeof igreja.coordenadas.lat === "number" && 
    typeof igreja.coordenadas.lng === "number";

  useEffect(() => {
    if (!temCoordenadas) {
      setMapError(true);
      return;
    }

    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        version: "weekly",
        libraries: ["marker"],
      });

      try {
        const google = await loader.load();
        await google.maps.importLibrary("marker");

        if (!mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: igreja.coordenadas,
          zoom: 16,
          mapId: "IGREJA_MAP",
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: true,
          fullscreenControl: true,
        });

        // Create custom marker for church
        const markerDiv = document.createElement("div");
        markerDiv.innerHTML = `
          <div style="
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
            border: 4px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          ">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m18 7 4 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9l4-2"/>
              <path d="M14 22v-4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v4"/>
              <path d="M18 22V5l-6-3-6 3v17"/>
              <path d="M12 7v5"/>
              <path d="M10 9h4"/>
            </svg>
          </div>
        `;

        new google.maps.marker.AdvancedMarkerElement({
          map,
          position: igreja.coordenadas,
          content: markerDiv,
          title: igreja.nome,
        });

        setMapLoaded(true);
      } catch (error) {
        console.error("Erro ao carregar mapa:", error);
        setMapError(true);
      }
    };

    initMap();
  }, [igreja.coordenadas, igreja.nome, temCoordenadas]);

  const formatPhone = (phone?: string) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  const formatCep = (cep?: string) => {
    if (!cep) return null;
    const digits = cep.replace(/\D/g, "");
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
  };

  const enderecoCompleto = igreja.endereco ? [
    igreja.endereco.logradouro,
    igreja.endereco.numero,
    igreja.endereco.complemento,
    igreja.endereco.bairro,
    igreja.endereco.cidade,
    igreja.endereco.estado,
    formatCep(igreja.endereco.cep),
  ]
    .filter(Boolean)
    .join(", ") : "Endereço não cadastrado";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Church Info Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Church className="h-5 w-5" />
            Informações
          </CardTitle>
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Photo and Name */}
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={igreja.fotoUrl} alt={igreja.nome} />
              <AvatarFallback className="bg-teal-100 text-teal-700 text-2xl">
                <Church className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold">{igreja.nome}</h2>
              <div className="mt-1 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Badge variant="secondary">{igreja.convencao}</Badge>
                <Badge variant="outline">{igreja.sede}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Details */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Dirigente</p>
                <p className="font-medium">{igreja.dirigente}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Convenção</p>
                <p className="font-medium">{igreja.convencao}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Flag className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sede</p>
                <p className="font-medium">{igreja.sede}</p>
              </div>
            </div>

            {igreja.telefone && (
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                  <p className="font-medium">{formatPhone(igreja.telefone)}</p>
                </div>
              </div>
            )}

            {igreja.email && (
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="font-medium">{igreja.email}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Endereço</p>
                <p className="font-medium">{enderecoCompleto}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Localização (Marco Zero)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {temCoordenadas ? (
            <>
              <div
                ref={mapRef}
                className="h-80 w-full overflow-hidden rounded-lg bg-muted lg:h-96"
              />
              <p className="mt-3 text-center text-sm text-muted-foreground">
                Coordenadas: {igreja.coordenadas!.lat.toFixed(6)},{" "}
                {igreja.coordenadas!.lng.toFixed(6)}
              </p>
            </>
          ) : (
            <div className="flex h-80 flex-col items-center justify-center rounded-lg bg-muted lg:h-96">
              <MapPin className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-center text-muted-foreground">
                Localização não definida
              </p>
              <p className="text-center text-sm text-muted-foreground">
                Edite a igreja para adicionar as coordenadas
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
