import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { KdvElementsComponent } from './kdv-elements.component';

describe('KdvElementsComponent', () => {
  let component: KdvElementsComponent;
  let fixture: ComponentFixture<KdvElementsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ KdvElementsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(KdvElementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
