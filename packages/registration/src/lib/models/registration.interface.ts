import { SyncStatus } from './sync-status.enum';
import { CreateRegistrationRequestDto } from '@varsom-regobs-common/regobs-api';

export interface IRegistration {
    id: string;
    changed: number;
    lastSync: number;
    syncError?: { statusCode: number, message: string };
    syncStatus: SyncStatus;
    request: CreateRegistrationRequestDto;
}
