"use client";

import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface SimpleTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    header: string;
    width?: number;
    render?: (value: any, item: T, index: number) => React.ReactNode;
  }>;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function SimpleTable<T>({
  data,
  columns,
  loading = false,
  emptyMessage = "No data available",
  className = ""
}: SimpleTableProps<T>) {
  const tableContent = useMemo(() => {
    if (loading) {
      return Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={`skeleton-${index}`}>
          {columns.map((column, colIndex) => (
            <TableCell key={`skeleton-${index}-${colIndex}`}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ));
    }

    if (data.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length} className="text-center py-8 text-gray-500">
            {emptyMessage}
          </TableCell>
        </TableRow>
      );
    }

    return data.map((item, index) => (
      <TableRow key={index}>
        {columns.map((column) => {
          const value = item[column.key];
          return (
            <TableCell key={String(column.key)} style={{ width: column.width }}>
              {column.render ? column.render(value, item, index) : String(value || '')}
            </TableCell>
          );
        })}
      </TableRow>
    ));
  }, [data, columns, loading, emptyMessage]);

  return (
    <div className={`rounded-md border ${className}`}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={String(column.key)} style={{ width: column.width }}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableContent}
        </TableBody>
      </Table>
    </div>
  );
}

export default SimpleTable;
