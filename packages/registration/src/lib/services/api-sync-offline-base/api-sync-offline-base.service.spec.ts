import { TestBed } from '@angular/core/testing';

import { ApiSyncOfflineBaseService } from './api-sync-offline-base.service';

describe('ApiSyncOfflineBaseService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ApiSyncOfflineBaseService = TestBed.get(ApiSyncOfflineBaseService);
    expect(service).toBeTruthy();
  });
});
