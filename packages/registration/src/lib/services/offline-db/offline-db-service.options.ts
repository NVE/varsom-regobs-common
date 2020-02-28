import { InanoSQLAdapter } from '@nano-sql/core/lib/interfaces';
import { Injectable } from '@angular/core';
@Injectable({
  providedIn: 'root'
})
export class OfflineDbServiceOptions {
    public dbMode: string | InanoSQLAdapter = 'PERM';
}
