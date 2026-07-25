import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { FillLetterModalComponent } from './fill-letter-modal.component';

describe('FillLetterModalComponent', () => {
  let component: FillLetterModalComponent;
  let fixture: ComponentFixture<FillLetterModalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [FillLetterModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FillLetterModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
