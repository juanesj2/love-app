import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PairingPage } from './pairing.page';

describe('PairingPage', () => {
  let component: PairingPage;
  let fixture: ComponentFixture<PairingPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PairingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
