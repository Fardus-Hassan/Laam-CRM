'use client';

import * as React from 'react';

import { FormField } from '@/components/form/form-field';
import { FormSelect } from '@/components/form/form-select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  pathaoCourierApi,
  type PathaoPlace,
} from '@/features/orders/api/pathao-courier-api';
import type { PathaoLocation } from '@/features/orders/lib/create-order-types';

type PathaoLocationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: PathaoLocation | null;
  onConfirm: (location: PathaoLocation) => void;
};

export function PathaoLocationDialog({
  open,
  onOpenChange,
  value,
  onConfirm,
}: PathaoLocationDialogProps) {
  const [cities, setCities] = React.useState<PathaoPlace[]>([]);
  const [zones, setZones] = React.useState<PathaoPlace[]>([]);
  const [areas, setAreas] = React.useState<PathaoPlace[]>([]);
  const [cityId, setCityId] = React.useState('');
  const [zoneId, setZoneId] = React.useState('');
  const [areaId, setAreaId] = React.useState('');
  const [loadingCities, setLoadingCities] = React.useState(false);
  const [loadingZones, setLoadingZones] = React.useState(false);
  const [loadingAreas, setLoadingAreas] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /** Apply saved location names once while cascading city → zone → area loads. */
  const pendingMatchRef = React.useRef<PathaoLocation | null>(null);

  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;
    pendingMatchRef.current = value;
    setError(null);
    setZones([]);
    setAreas([]);
    setZoneId('');
    setAreaId('');
    setLoadingCities(true);

    void pathaoCourierApi
      .listCities()
      .then((list) => {
        if (cancelled) return;
        setCities(list);
        const match = pendingMatchRef.current;
        const matchedCity = match
          ? list.find((c) =>
              match.cityId
                ? Number(c.id) === match.cityId
                : c.name.toLowerCase() === match.city.toLowerCase(),
            )
          : undefined;
        setCityId(matchedCity?.id ?? list[0]?.id ?? '');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCities([]);
        setCityId('');
        setError(
          err instanceof Error ? err.message : 'Failed to load Pathao cities',
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, value]);

  React.useEffect(() => {
    if (!open || !cityId) {
      setZones([]);
      setZoneId('');
      return;
    }

    let cancelled = false;
    setLoadingZones(true);
    setError(null);
    setAreas([]);
    setAreaId('');

    void pathaoCourierApi
      .listZones(cityId)
      .then((list) => {
        if (cancelled) return;
        setZones(list);
        const match = pendingMatchRef.current;
        const matchedZone = match
          ? list.find((z) =>
              match.zoneId
                ? Number(z.id) === match.zoneId
                : z.name.toLowerCase() === match.zone.toLowerCase(),
            )
          : undefined;
        setZoneId(matchedZone?.id ?? list[0]?.id ?? '');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setZones([]);
        setZoneId('');
        setError(
          err instanceof Error ? err.message : 'Failed to load Pathao zones',
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingZones(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, cityId]);

  React.useEffect(() => {
    if (!open || !zoneId) {
      setAreas([]);
      setAreaId('');
      return;
    }

    let cancelled = false;
    setLoadingAreas(true);
    setError(null);

    void pathaoCourierApi
      .listAreas(zoneId)
      .then((list) => {
        if (cancelled) return;
        setAreas(list);
        const match = pendingMatchRef.current;
        const matchedArea = match
          ? list.find((a) =>
              match.areaId
                ? Number(a.id) === match.areaId
                : a.name.toLowerCase() === match.area.toLowerCase(),
            )
          : undefined;
        setAreaId(matchedArea?.id ?? '');
        // Finished one hydrate pass — don't re-apply old names on next zone change.
        pendingMatchRef.current = null;
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAreas([]);
        setAreaId('');
        setError(
          err instanceof Error ? err.message : 'Failed to load Pathao areas',
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingAreas(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, zoneId]);

  const selectedCity = cities.find((item) => item.id === cityId);
  const selectedZone = zones.find((item) => item.id === zoneId);
  const selectedArea = areas.find((item) => item.id === areaId);

  const cityOptions = cities.map((city) => ({
    value: city.id,
    label: city.name,
  }));
  const zoneOptions = zones.map((zone) => ({
    value: zone.id,
    label: zone.name,
  }));
  const areaOptions = areas.map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const canSubmit = Boolean(selectedCity && selectedZone && selectedArea);
  const busy = loadingCities || loadingZones || loadingAreas;

  function handleCityChange(nextCityId: string) {
    pendingMatchRef.current = null;
    setCityId(nextCityId);
    setZoneId('');
    setAreaId('');
    setAreas([]);
  }

  function handleZoneChange(nextZoneId: string) {
    pendingMatchRef.current = null;
    setZoneId(nextZoneId);
    setAreaId('');
  }

  function handleSubmit() {
    if (!selectedCity || !selectedZone || !selectedArea) {
      return;
    }

    onConfirm({
      cityId: Number(selectedCity.id),
      zoneId: Number(selectedZone.id),
      areaId: Number(selectedArea.id),
      city: selectedCity.name,
      zone: selectedZone.name,
      area: selectedArea.name,
      label: `${selectedArea.name}, ${selectedZone.name}, ${selectedCity.name}`,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Pathao Location</DialogTitle>
          <DialogDescription>
            Choose city, zone, and delivery area from Pathao. Address will update
            automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <FormField label="City" required htmlFor="pathao-city">
            <FormSelect
              id="pathao-city"
              value={cityId}
              onChange={handleCityChange}
              options={cityOptions}
              placeholder={loadingCities ? 'Loading cities…' : 'Select city'}
              disabled={loadingCities || cities.length === 0}
            />
          </FormField>

          <FormField label="Zones" required htmlFor="pathao-zone">
            <FormSelect
              id="pathao-zone"
              value={zoneId}
              onChange={handleZoneChange}
              options={zoneOptions}
              placeholder={loadingZones ? 'Loading zones…' : 'Select zone'}
              disabled={!cityId || loadingZones || zones.length === 0}
            />
          </FormField>

          <FormField label="Area" required htmlFor="pathao-area">
            <FormSelect
              id="pathao-area"
              value={areaId}
              onChange={setAreaId}
              options={areaOptions}
              placeholder={loadingAreas ? 'Loading areas…' : 'Select area'}
              disabled={!zoneId || loadingAreas || areas.length === 0}
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit || busy} onClick={handleSubmit}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
