export interface LoadingState {
  isLoading: boolean;
  isSubmitting: boolean;
}

export const initialLoadingState: LoadingState = {
  isLoading: false,
  isSubmitting: false,
};

export function getLoadingMessage(
  action = "Loading"
): string {
  return `${action}...`;
}