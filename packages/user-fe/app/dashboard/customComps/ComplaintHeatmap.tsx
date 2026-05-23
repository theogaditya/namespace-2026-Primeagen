"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Complaint,
  STATUS_CONFIG,
  getRelativeTime,
} from "./types";
import {
  MapPin,
  Loader2,
  AlertCircle,
  List,
  Map as MapIcon,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

// Import Leaflet CSS
import "leaflet/dist/leaflet.css";

// Map loading state component
function MapLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-[500px] bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
      <p className="text-gray-500 text-sm">Loading map...</p>
    </div>
  );
}

// Dynamically import map components (Leaflet requires window)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false, loading: () => <MapLoadingState /> }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

// Default center (Dhanbad, Jharkhand - India)
const DEFAULT_CENTER: [number, number] = [23.7957, 86.4304];
const DEFAULT_ZOOM = 12;

// Get marker color based on status
function getMarkerColor(status: string): string {
  const colors: Record<string, string> = {
    REGISTERED: "#3B82F6", // blue
    UNDER_PROCESSING: "#F59E0B", // amber
    FORWARDED: "#8B5CF6", // purple
    ON_HOLD: "#F97316", // orange
    COMPLETED: "#10B981", // green
    REJECTED: "#EF4444", // red
    ESCALATED_TO_MUNICIPAL_LEVEL: "#6366F1", // indigo
    ESCALATED_TO_STATE_LEVEL: "#EC4899", // rose
    DELETED: "#6B7280", // gray
  };
  return colors[status] || "#3B82F6";
}

// Create custom Leaflet marker icon
function createMarkerIcon(color: string) {
  if (typeof window === "undefined") return undefined;
  
  const L = require("leaflet");
  
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path fill="${color}" d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z"/>
      <circle fill="white" cx="16" cy="14" r="6"/>
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: "custom-marker",
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  });
}

// Popup complaint card
function PopupComplaintCard({
  complaint,
  onClick,
}: {
  complaint: Complaint;
  onClick: () => void;
}) {
  const statusConfig = STATUS_CONFIG[complaint.status];

  return (
    <div
      className="min-w-[250px] max-w-[300px] cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className={cn(
            "px-2 py-0.5 text-xs font-medium rounded-full",
            statusConfig.bgColor,
            statusConfig.color
          )}
        >
          {statusConfig.label}
        </span>
        <span className="text-xs text-gray-500">
          {getRelativeTime(complaint.submissionDate)}
        </span>
      </div>

      {/* Category */}
      <div className="flex items-center gap-1 text-xs text-blue-600 font-medium mb-1">
        <span>{complaint.category?.name || "General"}</span>
        {complaint.subCategory && (
          <>
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <span className="text-gray-600">{complaint.subCategory}</span>
          </>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-800 line-clamp-2 mb-2">
        {complaint.description}
      </p>

      {/* Location */}
      {complaint.location && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <MapPin className="w-3 h-3" />
          <span className="truncate">
            {complaint.location.locality || complaint.location.city},{" "}
            {complaint.location.district}
          </span>
        </div>
      )}

      {/* Click hint */}
      <div className="pt-2 border-t border-gray-100">
        <span className="text-xs text-blue-600 font-medium hover:underline">
          Click to view details →
        </span>
      </div>
    </div>
  );
}

// Locality group card (for complaints without coords)
function LocalityGroupCard({
  locality,
  complaints,
  onComplaintClick,
}: {
  locality: string;
  complaints: Complaint[];
  onComplaintClick: (complaint: Complaint) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-gray-900">{locality}</span>
          <span className="text-sm text-gray-500">
            ({complaints.length} complaint{complaints.length !== 1 ? "s" : ""})
          </span>
        </div>
        <ChevronRight
          className={cn(
            "w-4 h-4 text-gray-400 transition-transform",
            isExpanded && "rotate-90"
          )}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100">
          {complaints.slice(0, 5).map((complaint) => (
            <div
              key={complaint.id}
              onClick={() => onComplaintClick(complaint)}
              className="px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900 line-clamp-1">
                  {complaint.category?.name} - {complaint.subCategory}
                </span>
                <span
                  className={cn(
                    "px-1.5 py-0.5 text-xs font-medium rounded shrink-0",
                    STATUS_CONFIG[complaint.status].bgColor,
                    STATUS_CONFIG[complaint.status].color
                  )}
                >
                  {STATUS_CONFIG[complaint.status].label}
                </span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">
                {complaint.description}
              </p>
            </div>
          ))}
          {complaints.length > 5 && (
            <div className="px-4 py-2 text-center text-xs text-gray-500 bg-gray-50">
              +{complaints.length - 5} more complaints
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Map markers component with Leaflet icons
function MapMarkers({
  complaints,
  onComplaintClick,
}: {
  complaints: Complaint[];
  onComplaintClick: (complaint: Complaint) => void;
}) {
  const [icons, setIcons] = useState<Record<string, any>>({});

  useEffect(() => {
    // Create icons for each status
    const statuses = [
      "REGISTERED",
      "UNDER_PROCESSING",
      "FORWARDED",
      "ON_HOLD",
      "COMPLETED",
      "REJECTED",
      "ESCALATED_TO_MUNICIPAL_LEVEL",
      "ESCALATED_TO_STATE_LEVEL",
      "DELETED",
    ];

    const newIcons: Record<string, any> = {};
    statuses.forEach((status) => {
      const color = getMarkerColor(status);
      newIcons[status] = createMarkerIcon(color);
    });
    setIcons(newIcons);
  }, []);

  if (Object.keys(icons).length === 0) return null;

  return (
    <>
      {complaints.map((complaint) => {
        if (!complaint.location?.latitude || !complaint.location?.longitude) {
          return null;
        }

        const icon = icons[complaint.status] || icons["REGISTERED"];

        return (
          <Marker
            key={complaint.id}
            position={[complaint.location.latitude, complaint.location.longitude]}
            icon={icon}
          >
            <Popup>
              <PopupComplaintCard
                complaint={complaint}
                onClick={() => onComplaintClick(complaint)}
              />
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

interface ComplaintHeatmapProps {
  authToken: string | null;
  onComplaintClick: (complaint: Complaint) => void;
}

export function ComplaintHeatmap({
  authToken,
  onComplaintClick,
}: ComplaintHeatmapProps) {
  const [complaintsWithCoords, setComplaintsWithCoords] = useState<Complaint[]>([]);
  const [complaintsWithLocalityOnly, setComplaintsWithLocalityOnly] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [isClient, setIsClient] = useState(false);

  // Check if we're on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch heatmap data
  const fetchHeatmapData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/complaint/feed/heatmap?limit=500", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch heatmap data");
      }

      const data = await response.json();
      
      if (data.success) {
        setComplaintsWithCoords(data.data?.withCoordinates || []);
        setComplaintsWithLocalityOnly(data.data?.withLocalityOnly || []);
        
        // Center map on first complaint with coords
        if (data.data?.withCoordinates?.length > 0) {
          const first = data.data.withCoordinates[0];
          if (first.location?.latitude && first.location?.longitude) {
            setMapCenter([first.location.latitude, first.location.longitude]);
          }
        }
      }
    } catch (err) {
      console.error("Heatmap fetch error:", err);
      setError("Failed to load heatmap data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchHeatmapData();
  }, [fetchHeatmapData]);

  // Group complaints by locality (for locality-only complaints)
  const localityGroups = useMemo(() => {
    const groups: Record<string, Complaint[]> = {};
    
    complaintsWithLocalityOnly.forEach((complaint) => {
      const locality = complaint.location?.locality || complaint.location?.city || "Unknown";
      if (!groups[locality]) {
        groups[locality] = [];
      }
      groups[locality].push(complaint);
    });

    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [complaintsWithLocalityOnly]);

  // Loading state - data loading
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500">Loading heatmap data...</p>
      </div>
    );
  }

  // Fetch error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Error Loading Data
        </h3>
        <p className="text-gray-500 text-center max-w-md mb-4">{error}</p>
        <button
          onClick={fetchHeatmapData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  const totalComplaints = complaintsWithCoords.length + complaintsWithLocalityOnly.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col"
    >
      {/* Header with stats and view toggle */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="font-semibold text-gray-900">{totalComplaints}</span>
            <span className="text-gray-500"> complaints on map</span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
              {complaintsWithCoords.length} with GPS
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full" />
              {complaintsWithLocalityOnly.length} locality only
            </span>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("map")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              viewMode === "map"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <MapIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Map</span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              viewMode === "list"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {/* Map View - Leaflet */}
      {viewMode === "map" && (
        <div className="relative">
          {isClient ? (
            <MapContainer
              center={mapCenter}
              zoom={DEFAULT_ZOOM}
              style={{ height: "500px", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapMarkers
                complaints={complaintsWithCoords}
                onComplaintClick={onComplaintClick}
              />
            </MapContainer>
          ) : (
            <MapLoadingState />
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs" style={{ zIndex: 1000 }}>
            <div className="font-medium text-gray-700 mb-2">Status Legend</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Registered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Processing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>Rejected</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List View - Locality Groups */}
      {viewMode === "list" && (
        <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
          {/* Complaints with coordinates */}
          {complaintsWithCoords.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                GPS Located ({complaintsWithCoords.length})
              </h3>
              <div className="space-y-2">
                {complaintsWithCoords.slice(0, 10).map((complaint) => (
                  <div
                    key={complaint.id}
                    onClick={() => onComplaintClick(complaint)}
                    className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {complaint.category?.name} - {complaint.subCategory}
                      </span>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 text-xs font-medium rounded shrink-0",
                          STATUS_CONFIG[complaint.status].bgColor,
                          STATUS_CONFIG[complaint.status].color
                        )}
                      >
                        {STATUS_CONFIG[complaint.status].label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-1 mb-1">
                      {complaint.description}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />
                      <span>
                        {complaint.location?.locality}, {complaint.location?.district}
                      </span>
                    </div>
                  </div>
                ))}
                {complaintsWithCoords.length > 10 && (
                  <div className="text-center text-sm text-gray-500 py-2">
                    +{complaintsWithCoords.length - 10} more with GPS
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Complaints grouped by locality */}
          {localityGroups.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <List className="w-4 h-4 text-gray-500" />
                By Locality ({complaintsWithLocalityOnly.length})
              </h3>
              <div className="space-y-2">
                {localityGroups.map(([locality, complaints]) => (
                  <LocalityGroupCard
                    key={locality}
                    locality={locality}
                    complaints={complaints}
                    onComplaintClick={onComplaintClick}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {totalComplaints === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapIcon className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No complaints with location data</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
