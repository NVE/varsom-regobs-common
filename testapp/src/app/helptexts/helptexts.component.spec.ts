import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HelptextsComponent } from './helptexts.component';

describe('HelptextsComponent', () => {
  let component: HelptextsComponent;
  let fixture: ComponentFixture<HelptextsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HelptextsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HelptextsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
