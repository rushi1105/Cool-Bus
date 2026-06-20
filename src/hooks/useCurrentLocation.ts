import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  errorMsg: string | null;
  loading: boolean;
}

export function useCurrentLocation() {
  const [locationState, setLocationState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    errorMsg: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    async function fetchLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (mounted) {
            setLocationState((prev) => ({
              ...prev,
              errorMsg: 'Permission to access location was denied',
              loading: false,
            }));
          }
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (mounted) {
          setLocationState({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            errorMsg: null,
            loading: false,
          });
        }
      } catch (err: any) {
        if (mounted) {
          setLocationState((prev) => ({
            ...prev,
            errorMsg: err.message || 'Error fetching location',
            loading: false,
          }));
        }
      }
    }

    fetchLocation();

    return () => {
      mounted = false;
    };
  }, []);

  return locationState;
}
