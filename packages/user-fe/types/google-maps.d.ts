// Google Maps types
declare global {
  interface Window {
    google: {
      maps: {
        Map: new (
          element: HTMLElement,
          options: {
            center: { lat: number; lng: number };
            zoom: number;
            mapId?: string;
            disableDefaultUI?: boolean;
            zoomControl?: boolean;
            mapTypeControl?: boolean;
            streetViewControl?: boolean;
            fullscreenControl?: boolean;
          }
        ) => google.maps.Map;
      };
    };
  }
}

declare namespace google.maps {
  interface Map {
    setCenter(latlng: { lat: number; lng: number }): void;
    setZoom(zoom: number): void;
    panTo(latlng: { lat: number; lng: number }): void;
    getZoom(): number | undefined;
    addListener(event: string, handler: (...args: unknown[]) => void): void;
  }

  namespace marker {
    class AdvancedMarkerElement {
      position: { lat: number; lng: number } | null;
      map: google.maps.Map | null;
      content: HTMLElement | null;
      constructor(options: {
        position?: { lat: number; lng: number };
        map?: google.maps.Map;
        content?: HTMLElement;
        title?: string;
      });
    }
  }
}

export {};
