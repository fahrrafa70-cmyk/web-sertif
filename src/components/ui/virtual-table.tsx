"use client";

import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface VirtualTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    header: string;
    width?: number;
    render?: (value: any, item: T, index: number) => React.ReactNode;
  }>;
  height?: number;
  itemHeight?: number;
  className?: string;
  onRowClick?: (item: T, index: number) => void;
  loading?: boolean;
  emptyMessage?: string;
}

/**
 * Virtual scrolling table component for large datasets
 * Renders only visible rows for optimal performance
 */
export function VirtualTable<T extends Record<string, any>>({
  data,
  columns,
  height = 400,
  itemHeight = 48,
  className = '',
  onRowClick,
  loading = false,
  emptyMessage = 'No data available'
}: VirtualTableProps<T>) {
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate column widths
  const columnWidths = useMemo(() => {
    const totalSpecifiedWidth = columns.reduce((sum, col) => sum + (col.width || 0), 0);
    const unspecifiedColumns = columns.filter(col => !col.width).length;
    const availableWidth = Math.max(containerWidth - totalSpecifiedWidth, 0);
    const defaultWidth = unspecifiedColumns > 0 ? availableWidth / unspecifiedColumns : 150;

    return columns.map(col => col.width || defaultWidth);
  }, [columns, containerWidth]);

  // Measure container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Row renderer for react-window
  const Row = useCallback(({ index, style }: ListChildComponentProps) => {
    const item = data[index];
    
    return (
      <div 
        style={style} 
        className={`flex border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${
          onRowClick ? 'cursor-pointer' : ''
        }`}
        onClick={() => onRowClick?.(item, index)}
      >
        {columns.map((column, colIndex) => {
          const value = item[column.key];
          const content = column.render ? column.render(value, item, index) : value;
          
          return (
            <div
              key={String(column.key)}
              className="flex items-center px-4 py-3 text-sm"
              style={{ width: columnWidths[colIndex], minWidth: columnWidths[colIndex] }}
            >
              {content}
            </div>
          );
        })}
      </div>
    );
  }, [data, columns, columnWidths, onRowClick]);

  // Loading skeleton
  const LoadingSkeleton = useCallback(() => (
    <div className="space-y-2 p-4">
      {Array.from({ length: Math.floor(height / itemHeight) }).map((_, index) => (
        <div key={index} className="flex space-x-4">
          {columns.map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              className="h-4" 
              style={{ width: columnWidths[colIndex] || 150 }}
            />
          ))}
        </div>
      ))}
    </div>
  ), [height, itemHeight, columns, columnWidths]);

  if (loading) {
    return (
      <div ref={containerRef} className={`border rounded-lg ${className}`}>
        <LoadingSkeleton />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div ref={containerRef} className={`border rounded-lg ${className}`}>
        <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`border rounded-lg overflow-hidden ${className}`}>
      {/* Table Header */}
      <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          {columns.map((column, index) => (
            <div
              key={String(column.key)}
              className="flex items-center px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100"
              style={{ width: columnWidths[index], minWidth: columnWidths[index] }}
            >
              {column.header}
            </div>
          ))}
        </div>
      </div>

      {/* Virtual Scrolling Body */}
      <List
        height={height}
        itemCount={data.length}
        itemSize={itemHeight}
        width="100%"
        className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
      >
        {Row}
      </List>
    </div>
  );
}

/**
 * Certificate table with virtual scrolling
 */
interface CertificateVirtualTableProps {
  certificates: any[];
  onCertificateClick?: (certificate: any) => void;
  loading?: boolean;
  height?: number;
}

export function CertificateVirtualTable({
  certificates,
  onCertificateClick,
  loading = false,
  height = 400
}: CertificateVirtualTableProps) {
  const columns = useMemo(() => [
    {
      key: 'certificate_no' as const,
      header: 'Certificate No',
      width: 150,
      render: (value: string) => (
        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {value}
        </span>
      )
    },
    {
      key: 'name' as const,
      header: 'Name',
      width: 200,
      render: (value: string) => (
        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
          {value}
        </span>
      )
    },
    {
      key: 'category' as const,
      header: 'Category',
      width: 120,
      render: (value: string) => value ? (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {value}
        </span>
      ) : '-'
    },
    {
      key: 'issue_date' as const,
      header: 'Issue Date',
      width: 120,
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      key: 'members' as const,
      header: 'Member',
      render: (value: any) => value?.name || '-'
    }
  ], []);

  return (
    <VirtualTable
      data={certificates}
      columns={columns}
      height={height}
      itemHeight={56}
      onRowClick={onCertificateClick}
      loading={loading}
      emptyMessage="No certificates found"
      className="w-full"
    />
  );
}

/**
 * Members table with virtual scrolling
 */
interface MemberVirtualTableProps {
  members: any[];
  onMemberClick?: (member: any) => void;
  loading?: boolean;
  height?: number;
}

export function MemberVirtualTable({
  members,
  onMemberClick,
  loading = false,
  height = 400
}: MemberVirtualTableProps) {
  const columns = useMemo(() => [
    {
      key: 'name' as const,
      header: 'Name',
      width: 200,
      render: (value: string) => (
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {value}
        </span>
      )
    },
    {
      key: 'email' as const,
      header: 'Email',
      width: 250,
      render: (value: string) => (
        <span className="text-gray-600 dark:text-gray-400">
          {value}
        </span>
      )
    },
    {
      key: 'organization' as const,
      header: 'Organization',
      width: 200,
      render: (value: string) => value || '-'
    },
    {
      key: 'city' as const,
      header: 'City',
      width: 120,
      render: (value: string) => value || '-'
    },
    {
      key: 'created_at' as const,
      header: 'Joined',
      width: 120,
      render: (value: string) => new Date(value).toLocaleDateString()
    }
  ], []);

  return (
    <VirtualTable
      data={members}
      columns={columns}
      height={height}
      itemHeight={56}
      onRowClick={onMemberClick}
      loading={loading}
      emptyMessage="No members found"
      className="w-full"
    />
  );
}
