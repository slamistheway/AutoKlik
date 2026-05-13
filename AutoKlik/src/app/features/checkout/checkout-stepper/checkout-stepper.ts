import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-checkout-stepper',
  standalone: true,
  imports: [NgClass],
  templateUrl: './checkout-stepper.html',
})
export class CheckoutStepper {
  @Input() currentStep = 0;
  @Input() clickableSteps: number[] = [];
  @Output() stepSelected = new EventEmitter<number>();
  readonly steps = [1, 2, 3];

  isStepClickable(step: number): boolean {
    return this.clickableSteps.includes(step);
  }

  isStepDisabled(step: number): boolean {
    return !this.isStepClickable(step);
  }

  getStepLabel(step: number): string {
    return step === 1 ? 'Kategorija' : step === 2 ? 'Detalji' : 'Placanje';
  }

  onStepClick(step: number): void {
    if (!this.isStepClickable(step)) {
      return;
    }

    this.stepSelected.emit(step);
  }
}
