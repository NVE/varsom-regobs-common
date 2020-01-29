import { TestBed } from '@angular/core/testing';

import { ApiSyncOfflineBaseService } from './api-sync-offline-base.service';

xdescribe('ApiSyncOfflineBaseService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ApiSyncOfflineBaseService<any> = TestBed.get(ApiSyncOfflineBaseService);
    expect(service).toBeTruthy();
  });
});
