'use client';

type Props = {
  currentStep: number;
  clickableSteps: number[];
  onStepSelected: (step: number) => void;
};

const STEPS = [1, 2, 3];

function getStepLabel(step: number): string {
  return step === 1 ? 'Kategorija' : step === 2 ? 'Detalji' : step === 3 ? 'Placanje' : "";
}

export default function CheckoutStepper({ currentStep, clickableSteps, onStepSelected }: Props) {
  const isStepClickable = (step: number) => {
    return clickableSteps.includes(step);
  };
  const isStepDisabled = (step: number) => {
    return !clickableSteps.includes(step);
  };
  console.log(`Current Step: ${currentStep}, Clickable Steps: ${clickableSteps.join(', ')}`);


  const onStepClick = (step: number) => {
    if (!isStepClickable(step)) return;
    onStepSelected(step);
  };

  return (
    <div className="flex items-center justify-center mb-8">
      <div className="flex w-full max-w-xl">
        {STEPS.map((step, index) => (
          <div key={step} className="contents">
            <div className="flex-1 flex flex-col items-center">
              <a
                href=""
                onClick={(e) => {
                  e.preventDefault();
                  onStepClick(step);
                }}
                className={`flex flex-col items-center select-none transition-opacity ${
                  isStepDisabled(step) ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                }`}
                aria-disabled={isStepDisabled(step)}
                tabIndex={isStepDisabled(step) ? -1 : 0}
              >
                <div
                  className={`rounded-full w-8 h-8 flex items-center justify-center font-bold mb-1 ${
                    currentStep === step ? 'bg-red-600 text-white' : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {step}
                </div>
                <div
                  className={`text-xs font-medium text-center ${currentStep === step ? 'text-red-700' : ''}`}
                >
                  {getStepLabel(step)}
                </div>
              </a>
            </div>

            {index < 2 && <div className="flex items-center w-8 h-1 bg-gray-300 mx-1" />}
          </div>
        ))}
      </div>
    </div>
  );
}
