export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>{message}</span>
        {onRetry && (
          <button type="button" onClick={onRetry} className="font-bold underline underline-offset-2">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
