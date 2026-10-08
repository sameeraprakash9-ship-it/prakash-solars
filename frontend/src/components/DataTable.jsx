import Loader from './Loader';

export default function DataTable({
  columns,
  data,
  pagination,
  onPageChange,
  loading = false,
  emptyMessage = 'No records to show.',
  rowClassName
}) {
  const page = pagination?.page || 1;
  const pages = pagination?.pages || 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-ink/5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="bg-canvas text-[11px] uppercase tracking-wider text-muted">
            <tr>
              {columns.map(column => (
                <th key={column.key} scope="col" className="px-4 py-3 font-bold">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5 bg-white">
            {loading ? (
              <tr><td colSpan={columns.length}><Loader compact /></td></tr>
            ) : data.length ? data.map((row, rowIndex) => (
              <tr
                key={row.id || row._id || rowIndex}
                className={`text-ink ${rowClassName ? rowClassName(row) : ''}`}
              >
                {columns.map(column => (
                  <td key={column.key} className="px-4 py-3.5">
                    {column.render ? column.render(row[column.key], row) : row[column.key] ?? '—'}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-muted">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pagination && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/5 bg-white px-4 py-3 text-xs text-muted">
          <span>
            {pagination.total || 0} total · Page {page} of {pages || 1}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || !onPageChange}
              onClick={() => onPageChange(page - 1)}
              className="rounded-lg border border-ink/10 px-3 py-1.5 font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pages || !onPageChange}
              onClick={() => onPageChange(page + 1)}
              className="rounded-lg border border-ink/10 px-3 py-1.5 font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
