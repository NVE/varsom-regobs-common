import { Injectable } from '@angular/core';
import { IRegobsApiKeyProvider } from '@varsom-regobs-common/regobs-api';

const localStorageKey = 'regObs_api_key';

@Injectable()
export class LocalStorageApiKeyProvider implements IRegobsApiKeyProvider {
    get apiKey() {
        return localStorage.getItem(localStorageKey);
    }

    set apiKey(val: string) {
        localStorage.setItem(localStorageKey, val);
    }
}
