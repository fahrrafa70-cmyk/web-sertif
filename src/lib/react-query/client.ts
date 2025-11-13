/**
 * React Query client configuration for advanced caching
 * Provides stale-while-revalidate, optimistic updates, and background refetching
 */

import { QueryClient } from '@tanstack/react-query';

// Create a client with optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale-while-revalidate strategy
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes - cache time (formerly cacheTime)
      
      // Background refetching
      refetchOnWindowFocus: false, // Don't refetch on window focus (can be annoying)
      refetchOnReconnect: true, // Refetch when reconnecting to internet
      refetchOnMount: true, // Refetch when component mounts
      
      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      
      // Network mode
      networkMode: 'online', // Only fetch when online
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      retryDelay: 1000,
      networkMode: 'online',
    },
  },
});

// Query keys factory for consistent key management
export const queryKeys = {
  // Certificates
  certificates: {
    all: ['certificates'] as const,
    lists: () => [...queryKeys.certificates.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.certificates.lists(), filters] as const,
    details: () => [...queryKeys.certificates.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.certificates.details(), id] as const,
    byMember: (memberId: string) => [...queryKeys.certificates.all, 'member', memberId] as const,
    byNumber: (certNo: string) => [...queryKeys.certificates.all, 'number', certNo] as const,
    byPublicId: (publicId: string) => [...queryKeys.certificates.all, 'public', publicId] as const,
    search: (query: string, filters?: Record<string, any>) => 
      [...queryKeys.certificates.all, 'search', query, filters] as const,
    categories: () => [...queryKeys.certificates.all, 'categories'] as const,
  },
  
  // Members
  members: {
    all: ['members'] as const,
    lists: () => [...queryKeys.members.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.members.lists(), filters] as const,
    details: () => [...queryKeys.members.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.members.details(), id] as const,
  },
  
  // Templates
  templates: {
    all: ['templates'] as const,
    lists: () => [...queryKeys.templates.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.templates.lists(), filters] as const,
    details: () => [...queryKeys.templates.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.templates.details(), id] as const,
    categories: () => [...queryKeys.templates.all, 'categories'] as const,
  },
  
  // Auth
  auth: {
    user: ['auth', 'user'] as const,
    session: ['auth', 'session'] as const,
  },
} as const;

// Cache invalidation helpers
export const invalidateQueries = {
  certificates: {
    all: () => queryClient.invalidateQueries({ queryKey: queryKeys.certificates.all }),
    byMember: (memberId: string) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates.byMember(memberId) }),
    search: () => 
      queryClient.invalidateQueries({ queryKey: [...queryKeys.certificates.all, 'search'] }),
  },
  members: {
    all: () => queryClient.invalidateQueries({ queryKey: queryKeys.members.all }),
  },
  templates: {
    all: () => queryClient.invalidateQueries({ queryKey: queryKeys.templates.all }),
  },
};

// Prefetch helpers
export const prefetchQueries = {
  certificates: {
    categories: () => 
      queryClient.prefetchQuery({
        queryKey: queryKeys.certificates.categories(),
        queryFn: async () => {
          const { getCertificateCategories } = await import('@/lib/supabase/certificates');
          return getCertificateCategories();
        },
        staleTime: 10 * 60 * 1000, // Categories don't change often
      }),
  },
  templates: {
    categories: () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.templates.categories(),
        queryFn: async () => {
          // Implement template categories fetching
          return [];
        },
        staleTime: 10 * 60 * 1000,
      }),
  },
};
