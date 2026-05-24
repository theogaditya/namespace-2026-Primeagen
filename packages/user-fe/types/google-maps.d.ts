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
            disableDefaultUI?: boolean;
            zoomControl?: boolean;
            mapTypeControl?: boolean;
            streetViewControl?: boolean;
            fullscreenControl?: boolean;
          }
        ) => google.maps.Map;
        Marker: new (options: {
          position: { lat: number; lng: number };
          map: google.maps.Map;
          title?: string;
        }) => google.maps.Marker;
      };
    };
  }
}

declare namespace google.maps {
  interface Map {
    setCenter(latlng: { lat: number; lng: number }): void;
    setZoom(zoom: number): void;
  }
  
  interface Marker {
    setPosition(latlng: { lat: number; lng: number }): void;
    setMap(map: Map | null): void;
  }
}

export {};
