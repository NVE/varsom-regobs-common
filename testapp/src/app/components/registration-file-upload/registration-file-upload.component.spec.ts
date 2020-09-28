import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistrationFileUploadComponent } from './registration-file-upload.component';

describe('RegistrationFileUploadComponent', () => {
  let component: RegistrationFileUploadComponent;
  let fixture: ComponentFixture<RegistrationFileUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RegistrationFileUploadComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RegistrationFileUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
