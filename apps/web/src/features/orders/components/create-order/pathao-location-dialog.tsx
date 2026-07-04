'use client';

import * as React from 'react';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
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
  PATHAO_GEO,
  filterPathaoAreas,
} from '@/features/orders/data/mock-create-order';
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
  const [cityId, setCityId] = React.useState('');
  const [zoneId, setZoneId] = React.useState('');
  const [area, setArea] = React.useState('');
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      return;
    }

    if (value) {
      const city = PATHAO_GEO.find((item) => item.name === value.city);
      const zone = city?.zones.find((item) => item.name === value.zone);
      setCityId(city?.id ?? '');
      setZoneId(zone?.id ?? '');
      setArea(value.area);
      setSearch('');
      return;
    }

    setCityId(PATHAO_GEO[0]?.id ?? '');
    setZoneId(PATHAO_GEO[0]?.zones[0]?.id ?? '');
    setArea('');
    setSearch('');
  }, [open, value]);

  const selectedCity = PATHAO_GEO.find((item) => item.id === cityId);
  const zones = selectedCity?.zones ?? [];
  const selectedZone = zones.find((item) => item.id === zoneId);
  const filteredAreas = filterPathaoAreas(cityId, zoneId, search);

  const cityOptions = PATHAO_GEO.map((city) => ({ value: city.id, label: city.name }));
  const zoneOptions = zones.map((zone) => ({ value: zone.id, label: zone.name }));
  const areaOptions = filteredAreas.map((item) => ({ value: item, label: item }));

  const canSubmit = Boolean(cityId && zoneId && area);

  function handleCityChange(nextCityId: string) {
    setCityId(nextCityId);
    const city = PATHAO_GEO.find((item) => item.id === nextCityId);
    const firstZone = city?.zones[0];
    setZoneId(firstZone?.id ?? '');
    setArea('');
  }

  function handleZoneChange(nextZoneId: string) {
    setZoneId(nextZoneId);
    setArea('');
  }

  function handleSubmit() {
    if (!selectedCity || !selectedZone || !area) {
      return;
    }

    onConfirm({
      city: selectedCity.name,
      zone: selectedZone.name,
      area,
      label: `${area}, ${selectedZone.name}, ${selectedCity.name}`,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Pathao Location</DialogTitle>
          <DialogDescription>
            Choose city, zone, and delivery area. Address will update automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Search Areas" htmlFor="pathao-search">
            <FormInput
              id="pathao-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Type to filter areas"
            />
          </FormField>

          <FormField label="City" required htmlFor="pathao-city">
            <FormSelect
              id="pathao-city"
              value={cityId}
              onChange={handleCityChange}
              options={cityOptions}
              placeholder="Select city"
            />
          </FormField>

          <FormField label="Zones" required htmlFor="pathao-zone">
            <FormSelect
              id="pathao-zone"
              value={zoneId}
              onChange={handleZoneChange}
              options={zoneOptions}
              placeholder="Select zone"
            />
          </FormField>

          <FormField label="Area" required htmlFor="pathao-area">
            <FormSelect
              id="pathao-area"
              value={area}
              onChange={setArea}
              options={areaOptions}
              placeholder="Select area"
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
