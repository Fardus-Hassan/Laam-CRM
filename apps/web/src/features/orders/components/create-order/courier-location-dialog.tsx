'use client';

import * as React from 'react';
import type { ActiveCourierProvider } from '@laam/types';

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
import { carrybeeCourierApi } from '@/features/orders/api/carrybee-courier-api';
import { pathaoCourierApi } from '@/features/orders/api/pathao-courier-api';
import type { CarrybeeLocation, PathaoLocation } from '@/features/orders/lib/create-order-types';

export type CourierLocationResult =
  | { provider: 'pathao'; location: PathaoLocation }
  | { provider: 'carrybee'; location: CarrybeeLocation };

type CourierLocationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Connected couriers that can supply city/zone/area trees. */
  providers: ActiveCourierProvider[];
  pathaoValue?: PathaoLocation | null;
  carrybeeValue?: CarrybeeLocation | null;
  /** Prefer this provider when opening (e.g. last selection). */
  preferredProvider?: ActiveCourierProvider | null;
  onConfirm: (result: CourierLocationResult) => void;
};

type Place = { id: string; name: string };

export function CourierLocationDialog({
  open,
  onOpenChange,
  providers,
  pathaoValue = null,
  carrybeeValue = null,
  preferredProvider = null,
  onConfirm,
}: CourierLocationDialogProps) {
  const available = React.useMemo(
    () => providers.filter((p) => p === 'pathao' || p === 'carrybee'),
    [providers],
  );

  const [provider, setProvider] = React.useState<ActiveCourierProvider>('pathao');
  const [cities, setCities] = React.useState<Place[]>([]);
  const [zones, setZones] = React.useState<Place[]>([]);
  const [areas, setAreas] = React.useState<Place[]>([]);
  const [cityId, setCityId] = React.useState('');
  const [zoneId, setZoneId] = React.useState('');
  const [areaId, setAreaId] = React.useState('');
  const [loadingCities, setLoadingCities] = React.useState(false);
  const [loadingZones, setLoadingZones] = React.useState(false);
  const [loadingAreas, setLoadingAreas] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const pendingPathaoRef = React.useRef<PathaoLocation | null>(null);
  const pendingCarrybeeRef = React.useRef<CarrybeeLocation | null>(null);

  React.useEffect(() => {
    if (!open || available.length === 0) return;
    const next =
      preferredProvider && available.includes(preferredProvider)
        ? preferredProvider
        : available.includes('pathao')
          ? 'pathao'
          : available[0]!;
    setProvider(next);
  }, [open, available, preferredProvider]);

  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;
    pendingPathaoRef.current = pathaoValue;
    pendingCarrybeeRef.current = carrybeeValue;
    setError(null);
    setZones([]);
    setAreas([]);
    setZoneId('');
    setAreaId('');
    setCityId('');
    setCities([]);
    setLoadingCities(true);

    const load =
      provider === 'carrybee'
        ? carrybeeCourierApi.listCities()
        : pathaoCourierApi.listCities();

    void load
      .then((list: Place[]) => {
        if (cancelled) return;
        setCities(list);
        const match =
          provider === 'carrybee' ? pendingCarrybeeRef.current : pendingPathaoRef.current;
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
          err instanceof Error
            ? err.message
            : `Failed to load ${provider === 'carrybee' ? 'Carrybee' : 'Pathao'} cities`,
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, provider, pathaoValue, carrybeeValue]);

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

    const load =
      provider === 'carrybee'
        ? carrybeeCourierApi.listZones(cityId)
        : pathaoCourierApi.listZones(cityId);

    void load
      .then((list: Place[]) => {
        if (cancelled) return;
        setZones(list);
        const match =
          provider === 'carrybee' ? pendingCarrybeeRef.current : pendingPathaoRef.current;
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
          err instanceof Error
            ? err.message
            : `Failed to load ${provider === 'carrybee' ? 'Carrybee' : 'Pathao'} zones`,
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingZones(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, provider, cityId]);

  React.useEffect(() => {
    if (!open || !zoneId) {
      setAreas([]);
      setAreaId('');
      return;
    }
    if (provider === 'carrybee' && !cityId) return;

    let cancelled = false;
    setLoadingAreas(true);
    setError(null);

    const load =
      provider === 'carrybee'
        ? carrybeeCourierApi.listAreas(cityId, zoneId)
        : pathaoCourierApi.listAreas(zoneId);

    void load
      .then((list: Place[]) => {
        if (cancelled) return;
        setAreas(list);
        if (provider === 'carrybee') {
          const match = pendingCarrybeeRef.current;
          const matchedArea = match?.areaId
            ? list.find((a) => Number(a.id) === match.areaId)
            : match?.area
              ? list.find((a) => a.name.toLowerCase() === match.area!.toLowerCase())
              : undefined;
          setAreaId(matchedArea?.id ?? '');
          pendingCarrybeeRef.current = null;
        } else {
          const match = pendingPathaoRef.current;
          const matchedArea = match
            ? list.find((a) =>
                match.areaId
                  ? Number(a.id) === match.areaId
                  : a.name.toLowerCase() === match.area.toLowerCase(),
              )
            : undefined;
          setAreaId(matchedArea?.id ?? '');
          pendingPathaoRef.current = null;
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAreas([]);
        setAreaId('');
        setError(
          err instanceof Error
            ? err.message
            : `Failed to load ${provider === 'carrybee' ? 'Carrybee' : 'Pathao'} areas`,
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingAreas(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, provider, cityId, zoneId]);

  function handleCityChange(next: string) {
    pendingPathaoRef.current = null;
    pendingCarrybeeRef.current = null;
    setCityId(next);
    setZoneId('');
    setAreaId('');
    setAreas([]);
  }

  function handleZoneChange(next: string) {
    pendingPathaoRef.current = null;
    pendingCarrybeeRef.current = null;
    setZoneId(next);
    setAreaId('');
  }

  const selectedCity = cities.find((c) => c.id === cityId);
  const selectedZone = zones.find((z) => z.id === zoneId);
  const selectedArea = areas.find((a) => a.id === areaId);

  const canSubmit =
    provider === 'carrybee'
      ? Boolean(selectedCity && selectedZone)
      : Boolean(selectedCity && selectedZone && selectedArea);

  const busy = loadingCities || loadingZones || loadingAreas;

  function handleSubmit() {
    if (!selectedCity || !selectedZone) return;

    if (provider === 'carrybee') {
      onConfirm({
        provider: 'carrybee',
        location: {
          cityId: Number(selectedCity.id),
          zoneId: Number(selectedZone.id),
          areaId: selectedArea ? Number(selectedArea.id) : undefined,
          city: selectedCity.name,
          zone: selectedZone.name,
          area: selectedArea?.name,
          label: selectedArea
            ? `${selectedArea.name}, ${selectedZone.name}, ${selectedCity.name}`
            : `${selectedZone.name}, ${selectedCity.name}`,
        },
      });
      onOpenChange(false);
      return;
    }

    if (!selectedArea) return;
    onConfirm({
      provider: 'pathao',
      location: {
        cityId: Number(selectedCity.id),
        zoneId: Number(selectedZone.id),
        areaId: Number(selectedArea.id),
        city: selectedCity.name,
        zone: selectedZone.name,
        area: selectedArea.name,
        label: `${selectedArea.name}, ${selectedZone.name}, ${selectedCity.name}`,
      },
    });
    onOpenChange(false);
  }

  if (available.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pick delivery location</DialogTitle>
          <DialogDescription>
            Select city / zone / area to fill the address field only. No courier location
            IDs are saved — Pathao and Carrybee both book from this address. You can also
            type the address manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <FormField label="City" required htmlFor="courier-city">
            <FormSelect
              id="courier-city"
              value={cityId}
              onChange={handleCityChange}
              options={cities.map((c) => ({ value: c.id, label: c.name }))}
              placeholder={loadingCities ? 'Loading cities…' : 'Select city'}
              disabled={loadingCities || cities.length === 0}
            />
          </FormField>

          <FormField label="Zone" required htmlFor="courier-zone">
            <FormSelect
              id="courier-zone"
              value={zoneId}
              onChange={handleZoneChange}
              options={zones.map((z) => ({ value: z.id, label: z.name }))}
              placeholder={loadingZones ? 'Loading zones…' : 'Select zone'}
              disabled={!cityId || loadingZones || zones.length === 0}
            />
          </FormField>

          <FormField
            label={provider === 'carrybee' ? 'Area (optional)' : 'Area'}
            required={provider === 'pathao'}
            htmlFor="courier-area"
          >
            <FormSelect
              id="courier-area"
              value={areaId}
              onChange={setAreaId}
              options={
                provider === 'carrybee'
                  ? [
                      { value: '', label: areas.length ? 'No area' : 'No areas' },
                      ...areas.map((a) => ({ value: a.id, label: a.name })),
                    ]
                  : areas.map((a) => ({ value: a.id, label: a.name }))
              }
              placeholder={loadingAreas ? 'Loading areas…' : 'Select area'}
              disabled={!zoneId || loadingAreas || (provider === 'pathao' && areas.length === 0)}
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit || busy} onClick={handleSubmit}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
