import Spinner from "./Spinner";

interface LoadingStateProps {
  message?: string;
  minHeight?: "sm" | "md" | "lg";
}

const heightClasses = {
  sm: "min-h-32",
  md: "min-h-56",
  lg: "min-h-96",
};

export default function LoadingState({
  message = "Loading...",
  minHeight = "md",
}: LoadingStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center gap-3",
        heightClasses[minHeight],
        "rounded-2xl",
      ].join(" ")}
    >
      <Spinner size="md" />

      <p className="text-sm font-medium text-muted">
        {message}
      </p>
    </div>
  );
}