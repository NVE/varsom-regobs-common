import { AppModeService, AppMode } from '@varsom-regobs-common/core';
import { RegobsApiConfigurationInterface } from './regobs-api-configuration';
import { OnDestroy, Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { settings } from './settings';

@Injectable()
export class RegObsApiConfigurationProvider implements RegobsApiConfigurationInterface, OnDestroy {
    private subscription: Subscription;
    private appMode: AppMode = AppMode.Prod;

    constructor(private appModeService: AppModeService) {
        this.subscription = this.appModeService.appMode$.subscribe((val) => {
            this.appMode = val;
        });
    }

    get rootUrl() {
        return settings.regObsApi.baseUrl[this.appMode];
    }

    ngOnDestroy(): void {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}
