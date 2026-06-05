"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Membro, Igreja, TIPOS_MEMBRO, CARGOS_MEMBRO, CORES_TIPO } from "@/lib/types";

interface GoogleMapProps {
  membros: Membro[];
  igreja?: Igreja;
  onMemberClick?: (membro: Membro) => void;
  selectedMemberId?: string | null;
  centerMemberId?: string | null;
  radius?: number | null; // in km
  onMembersInRadius?: (membros: Membro[]) => void;
}

export function GoogleMap({
  membros,
  igreja,
  onMemberClick,
  selectedMemberId,
  centerMemberId,
  radius,
  onMembersInRadius,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const igrejaMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
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

        // Default center (São Paulo)
        const defaultCenter = { lat: -23.5505, lng: -46.6333 };

        // Calculate center - prioritize church as "marco zero"
        let center = defaultCenter;
        if (igreja?.coordenadas) {
          center = { lat: igreja.coordenadas.lat, lng: igreja.coordenadas.lng };
        } else if (membros.length > 0) {
          const avgLat =
            membros.reduce((sum, m) => sum + m.coordenadas.lat, 0) /
            membros.length;
          const avgLng =
            membros.reduce((sum, m) => sum + m.coordenadas.lng, 0) /
            membros.length;
          center = { lat: avgLat, lng: avgLng };
        }

        googleMapRef.current = new google.maps.Map(mapRef.current, {
          center,
          zoom: 12,
          mapId: "GESTAO_MEMBROS_MAP",
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        setIsLoaded(true);
      } catch (error) {
        console.error("Erro ao carregar Google Maps:", error);
      }
    };

    initMap();
  }, []);

  // Create marker element
  const createMarkerElement = useCallback(
    (membro: Membro, isSelected: boolean, isCenter: boolean) => {
      const markerDiv = document.createElement("div");
      markerDiv.className = "marker-container";

      const color = CORES_TIPO[membro.tipo];
      const size = isCenter ? 48 : isSelected ? 44 : 36;
      const borderWidth = isCenter ? 4 : isSelected ? 3 : 2;

      // Se o membro tem foto, mostra a foto no marcador
      if (membro.fotoUrl) {
        markerDiv.innerHTML = `
        <div style="
          width: ${size}px;
          height: ${size}px;
          border: ${borderWidth}px solid ${color};
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          transition: transform 0.2s ease;
          transform: ${isSelected || isCenter ? "scale(1.15)" : "scale(1)"};
          overflow: hidden;
          background-color: ${color};
        ">
          <img 
            src="${membro.fotoUrl}" 
            alt="${membro.nome}"
            style="
              width: 100%;
              height: 100%;
              object-fit: cover;
            "
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          />
          <span style="
            display: none;
            width: 100%;
            height: 100%;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: ${isCenter ? 16 : isSelected ? 14 : 12}px;
            font-weight: bold;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          ">
            ${membro.nome.charAt(0).toUpperCase()}
          </span>
        </div>
      `;
      } else {
        // Sem foto, mostra inicial
        markerDiv.innerHTML = `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${color};
          border: ${borderWidth}px solid ${isCenter ? "#000" : isSelected ? "#fff" : "rgba(255,255,255,0.8)"};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          transition: transform 0.2s ease;
          transform: ${isSelected || isCenter ? "scale(1.15)" : "scale(1)"};
        ">
          <span style="
            color: white;
            font-size: ${isCenter ? 16 : isSelected ? 14 : 12}px;
            font-weight: bold;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          ">
            ${membro.nome.charAt(0).toUpperCase()}
          </span>
        </div>
      `;
      }

      return markerDiv;
    },
    []
  );

  // Update markers
  useEffect(() => {
    if (!isLoaded || !googleMapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => (marker.map = null));
    markersRef.current = [];

    // Add markers for each member
    membros.forEach((membro) => {
      const isSelected = selectedMemberId === membro.id;
      const isCenter = centerMemberId === membro.id;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: googleMapRef.current!,
        position: { lat: membro.coordenadas.lat, lng: membro.coordenadas.lng },
        content: createMarkerElement(membro, isSelected, isCenter),
        title: membro.nome,
      });

      marker.addListener("click", () => {
        if (onMemberClick) {
          onMemberClick(membro);
        }
      });

      markersRef.current.push(marker);
    });
  }, [
    membros,
    isLoaded,
    selectedMemberId,
    centerMemberId,
    onMemberClick,
    createMarkerElement,
  ]);

  // Handle church marker (marco zero)
  useEffect(() => {
    if (!isLoaded || !googleMapRef.current) return;

    // Remove existing church marker
    if (igrejaMarkerRef.current) {
      igrejaMarkerRef.current.map = null;
      igrejaMarkerRef.current = null;
    }

    if (!igreja?.coordenadas) return;

    // Create church marker element
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
        cursor: pointer;
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

    igrejaMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
      map: googleMapRef.current,
      position: { lat: igreja.coordenadas.lat, lng: igreja.coordenadas.lng },
      content: markerDiv,
      title: igreja.nome || "Igreja",
      zIndex: 1000, // Ensure church marker is on top
    });
  }, [igreja, isLoaded]);

  // Handle radius circle
  useEffect(() => {
    if (!isLoaded || !googleMapRef.current) return;

    // Remove existing circle
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }

    if (!centerMemberId || !radius) return;

    const centerMember = membros.find((m) => m.id === centerMemberId);
    if (!centerMember) return;

    // Create circle
    circleRef.current = new google.maps.Circle({
      strokeColor: "#0d9488",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#0d9488",
      fillOpacity: 0.15,
      map: googleMapRef.current,
      center: {
        lat: centerMember.coordenadas.lat,
        lng: centerMember.coordenadas.lng,
      },
      radius: radius * 1000, // Convert km to meters
    });

    // Center map on circle
    googleMapRef.current.fitBounds(circleRef.current.getBounds()!);

    // Calculate members within radius
    if (onMembersInRadius) {
      const membersInRadius = membros.filter((m) => {
        if (m.id === centerMemberId) return false;

        const distance = calculateDistance(
          centerMember.coordenadas.lat,
          centerMember.coordenadas.lng,
          m.coordenadas.lat,
          m.coordenadas.lng
        );

        return distance <= radius;
      });

      onMembersInRadius(membersInRadius);
    }
  }, [centerMemberId, radius, membros, isLoaded, onMembersInRadius]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full rounded-lg" />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 rounded-lg bg-background/95 p-4 shadow-lg backdrop-blur">
        <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Legenda
        </p>
        <div className="flex flex-col gap-2">
          {/* Church marker */}
          {igreja && (
            <div className="flex items-center gap-2 pb-2 mb-2 border-b">
              <div
                className="h-5 w-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)" }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 7v5"/>
                  <path d="M10 9h4"/>
                </svg>
              </div>
              <span className="text-xs font-medium">Igreja (Marco Zero)</span>
            </div>
          )}
          {Object.entries(TIPOS_MEMBRO).map(([tipo, label]) => (
            <div key={tipo} className="flex items-center gap-2">
              <div
                className="h-5 w-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
                style={{ backgroundColor: CORES_TIPO[tipo as keyof typeof CORES_TIPO] }}
              >
                <span className="text-[8px] font-bold text-white">
                  {label.charAt(0)}
                </span>
              </div>
              <span className="text-xs font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
