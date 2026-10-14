import type { ReactNode } from "react";

/**
 * Type definition for a column in the Table component.
 * @template T - The type of the data object representing a row.
 */
export interface Column<T> {
  /** The key in the data object, or a unique string if not directly accessing a property. */
  key: Extract<keyof T, string> | string;
  /** The header content to display for this column. */
  header: ReactNode;
  /** Optional custom render function for the cell content. */
  render?: (row: T) => ReactNode;
  /** Optional CSS class name for the column cells. */
  className?: string;
}

/**
 * Props for the Table component.
 * @template T - The type of the data object representing a row.
 */
interface TableProps<T> {
  /** Array of column definitions. */
  columns: Column<T>[];
  /** Array of data objects to display as rows. */
  data: T[];
  /** Function to extract a unique key for each row. */
  rowKey: (row: T) => string | number;
  /** Optional click handler for rows. */
  onRowClick?: (row: T) => void;
  /** Optional empty state content to display when data is empty. */
  emptyState?: ReactNode;
  /** Optional CSS class name for the wrapper. */
  className?: string;
}

export default function Table<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyState,
  className = "",
}: TableProps<T>) {
  return (
    <div className={["w-full overflow-x-auto rounded-xl border border-line bg-surface shadow-sm", className].filter(Boolean).join(" ")}>
      <table className="w-full text-left text-sm text-foreground">
        <thead className="border-b border-line bg-brand-soft/30 text-xs uppercase tracking-wider text-muted">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={["px-6 py-4 font-semibold", col.className].filter(Boolean).join(" ")}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-6">
                {emptyState || (
                  <div className="text-center py-10 text-muted">No data available</div>
                )}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={[
                  "transition-colors",
                  onRowClick ? "cursor-pointer hover:bg-brand-soft/50" : "hover:bg-brand-soft/20",
                ].join(" ")}
              >
                {columns.map((col) => (
                  <td key={col.key as string} className={["px-6 py-4", col.className].filter(Boolean).join(" ")}>
                    {col.render ? col.render(row) : (row[col.key as keyof T] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
