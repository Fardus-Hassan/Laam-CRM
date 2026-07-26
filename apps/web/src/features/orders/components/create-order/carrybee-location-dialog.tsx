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
  carrybeeCourierApi,
  type CarrybeePlace,
} from '@/features/orders/api/carrybee-courier-api';
import type { CarrybeeLocation } from '@/features/orders/lib/create-order-types';

type CarrybeeLocationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: CarrybeeLocation | null;
  onConfirm: (location: CarrybeeLocation) => void;
};

export function CarrybeeLocationDialog({
  open,
  onOpenChange,
  value,
  onConfirm,
}: CarrybeeLocationDialogProps) {
  const [cities, setCities] = React.useState<CarrybeePlace[]>([]);
  const [zones, setZones] = React.useState<CarrybeePlace[]>([]);
  const [areas, setAreas] = React.useState<CarrybeePlace[]>([]);
  const [cityId, setCityId] = React.useState('');
  const [zoneId, setZoneId] = React.useState('');
  const [areaId, setAreaId] = React.useState('');
  const [loadingCities, setLoadingCities] = React.useState(false);
  const [loadingZones, setLoadingZones] = React.useState(false);
  const [loadingAreas, setLoadingAreas] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const pendingMatchRef = React.useRef<CarrybeeLocation | null>(null);

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

    void carrybeeCourierApi
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
        setError(err instanceof Error ? err.message : 'Failed to load Carrybee cities');
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

    void carrybeeCourierApi
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
        setError(err instanceof Error ? err.message : 'Failed to load Carrybee zones');
      })
      .finally(() => {
        if (!cancelled) setLoadingZones(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, cityId]);

  React.useEffect(() => {
    if (!open || !cityId || !zoneId) {
      setAreas([]);
      setAreaId('');
      return;
    }

    let cancelled = false;
    setLoadingAreas(true);
    setError(null);

    void carrybeeCourierApi
      .listAreas(cityId, zoneId)
      .then((list) => {
        if (cancelled) return;
        setAreas(list);
        const match = pendingMatchRef.current;
        const matchedArea = match?.areaId
          ? list.find((a) => Number(a.id) === match.areaId)
          : match?.area
            ? list.find((a) => a.name.toLowerCase() === match.area!.toLowerCase())
            : undefined;
        setAreaId(matchedArea?.id ?? '');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAreas([]);
        setAreaId('');
        setError(err instanceof Error ? err.message : 'Failed to load Carrybee areas');
      })
      .finally(() => {
        if (!cancelled) setLoadingAreas(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, cityId, zoneId]);

  function handleCityChange(next: string) {
    pendingMatchRef.current = null;
    setCityId(next);
  }

  function handleZoneChange(next: string) {
    pendingMatchRef.current = null;
    setZoneId(next);
  }

  const city = cities.find((c) => c.id === cityId);
  const zone = zones.find((z) => z.id === zoneId);
  const area = areas.find((a) => a.id === areaId);
  const canSubmit = Boolean(city && zone);
  const busy = loadingCities || loadingZones || loadingAreas;

  function handleSubmit() {
    if (!city || !zone) return;
    onConfirm({
      cityId: Number(city.id),
      zoneId: Number(zone.id),
      areaId: area ? Number(area.id) : undefined,
      city: city.name,
      zone: zone.name,
      area: area?.name,
      label: area
        ? `${area.name}, ${zone.name}, ${city.name}`
        : `${zone.name}, ${city.name}`,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Carrybee Location</DialogTitle>
          <DialogDescription>
            Choose city and zone from Carrybee. Area is optional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <FormField label="City" required htmlFor="carrybee-city">
            <FormSelect
              id="carrybee-city"
              value={cityId}
              onChange={handleCityChange}
              options={cities.map((c) => ({ value: c.id, label: c.name }))}
              placeholder={loadingCities ? 'Loading cities…' : 'Select city'}
              disabled={loadingCities || cities.length === 0}
            />
          </FormField>

          <FormField label="Zone" required htmlFor="carrybee-zone">
            <FormSelect
              id="carrybee-zone"
              value={zoneId}
              onChange={handleZoneChange}
              options={zones.map((z) => ({ value: z.id, label: z.name }))}
              placeholder={loadingZones ? 'Loading zones…' : 'Select zone'}
              disabled={!cityId || loadingZones || zones.length === 0}
            />
          </FormField>

          <FormField label="Area (optional)" htmlFor="carrybee-area">
            <FormSelect
              id="carrybee-area"
              value={areaId}
              onChange={setAreaId}
              options={[
                { value: '', label: areas.length ? 'No area' : 'No areas' },
                ...areas.map((a) => ({ value: a.id, label: a.name })),
              ]}
              placeholder={loadingAreas ? 'Loading areas…' : 'Select area'}
              disabled={!zoneId || loadingAreas}
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
