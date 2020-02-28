import { SyncStatus } from './sync-status.enum';
import { RegistrationEditModel } from '@varsom-regobs-common/regobs-api';
import { GeoHazard } from '@varsom-regobs-common/core';

export interface IRegistration {
    id: string;
    changed: number;
    geoHazard: GeoHazard;
    syncStatus: SyncStatus;
    lastSync?: number;
    syncError?: Error;
    request: RegistrationEditModel;
    regId?: number;
}
