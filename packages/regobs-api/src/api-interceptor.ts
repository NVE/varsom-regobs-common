import { HttpRequest, HttpInterceptor, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { settings } from './settings';
import { IRegobsApiKeyProvider } from './regobs-api.module';

export class ApiInterceptor implements HttpInterceptor {
    constructor(private apiKeyProvider: IRegobsApiKeyProvider) {
    }

    private isRegObsApi(url: string) {
        return url.startsWith(settings.regObsApi.baseUrl['TEST'])
            || url.startsWith(settings.regObsApi.baseUrl['DEMO'])
            || url.startsWith(settings.regObsApi.baseUrl['PROD']);
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Apply the headers
        if (this.isRegObsApi(req.url)) {
            req = req.clone({
                setHeaders: {
                    regObs_apptoken: this.apiKeyProvider.apiKey
                }
            });
        }

        return next.handle(req);
    }
}
