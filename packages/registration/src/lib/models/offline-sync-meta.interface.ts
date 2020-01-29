import { LangKey } from '@varsom-regobs-common/core';

export interface OfflineSyncMeta<T> {
    id: LangKey;
    lastUpdated: number;
    data: T;
}
