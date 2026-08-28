/**
 * ONNX Runtime Web may send its execution-provider placement notice through
 * `console.error`, despite the native message being tagged as a warning. The
 * preview error collector correctly observes console errors, so let it see
 * every real error while excluding this one documented, non-fatal diagnostic.
 */
const NODE_ASSIGNMENT_DIAGNOSTIC = "VerifyEachNodeIsAssignedToAnEp";
const FILTER_INSTALLED = Symbol.for("vision-inspector.onnx-diagnostic-filter-installed");

type ConsoleError = (...data: unknown[]) => void;
type ConsoleWithFilterState = Console & { [FILTER_INSTALLED]?: boolean };

export function isOnnxNodeAssignmentDiagnostic(args: unknown[]) {
  return args.some((value) => String(value).includes(NODE_ASSIGNMENT_DIAGNOSTIC));
}

export function installOnnxRuntimeDiagnosticFilter(target: Console = console) {
  const targetConsole = target as ConsoleWithFilterState;
  if (targetConsole[FILTER_INSTALLED]) return;

  const originalError: ConsoleError = target.error.bind(target);
  target.error = (...args: unknown[]) => {
    if (isOnnxNodeAssignmentDiagnostic(args)) return;
    originalError(...args);
  };
  targetConsole[FILTER_INSTALLED] = true;
}
