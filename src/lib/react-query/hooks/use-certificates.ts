/**
 * React Query hooks for certificate data fetching with advanced caching
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys, invalidateQueries } from '../client';
import { 
  Certificate, 
  SearchFilters,
  getCertificateByNumber,
  getCertificateByPublicId,
  getCertificatesByMember,
  advancedSearchCertificates,
  getCertificateCategories,
  createCertificate,
  updateCertificate,
  deleteCertificate,
  CreateCertificateData,
  UpdateCertificateData
} from '@/lib/supabase/certificates';
import { toast } from 'sonner';

// Get certificate by number with caching
export function useCertificateByNumber(certificateNo: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.certificates.byNumber(certificateNo),
    queryFn: () => getCertificateByNumber(certificateNo),
    enabled: enabled && !!certificateNo,
    staleTime: 10 * 60 * 1000, // 10 minutes - certificates don't change often
    retry: (failureCount, error: any) => {
      // Don't retry if certificate not found
      if (error?.message?.includes('not found')) return false;
      return failureCount < 2;
    },
  });
}

// Get certificate by public ID with caching
export function useCertificateByPublicId(publicId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.certificates.byPublicId(publicId),
    queryFn: () => getCertificateByPublicId(publicId),
    enabled: enabled && !!publicId,
    staleTime: 10 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('not found')) return false;
      return failureCount < 2;
    },
  });
}

// Get certificates by member with caching
export function useCertificatesByMember(memberId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.certificates.byMember(memberId),
    queryFn: () => getCertificatesByMember(memberId),
    enabled: enabled && !!memberId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Advanced search with caching and deduplication
export function useSearchCertificates(filters: SearchFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.certificates.search(filters.keyword || '', filters),
    queryFn: () => advancedSearchCertificates(filters),
    enabled: enabled && (!!filters.keyword || !!filters.category || !!filters.startDate),
    staleTime: 2 * 60 * 1000, // 2 minutes - search results can be more dynamic
    placeholderData: [], // Show empty array while loading
  });
}

// Infinite query for paginated certificate search
export function useInfiniteSearchCertificates(
  filters: SearchFilters & { limit?: number },
  enabled = true
) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.certificates.search(filters.keyword || '', filters), 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const limit = filters.limit || 20;
      const offset = pageParam * limit;
      
      // Implement paginated search (you'll need to modify your search function)
      const results = await advancedSearchCertificates({
        ...filters,
        // Add pagination parameters if your API supports it
      });
      
      return {
        data: results.slice(offset, offset + limit),
        nextPage: results.length > offset + limit ? pageParam + 1 : undefined,
        hasMore: results.length > offset + limit,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: enabled && (!!filters.keyword || !!filters.category || !!filters.startDate),
    staleTime: 2 * 60 * 1000,
    initialPageParam: 0,
  });
}

// Get certificate categories with long-term caching
export function useCertificateCategories() {
  return useQuery({
    queryKey: queryKeys.certificates.categories(),
    queryFn: getCertificateCategories,
    staleTime: 30 * 60 * 1000, // 30 minutes - categories rarely change
    gcTime: 60 * 60 * 1000, // 1 hour cache time
  });
}

// Create certificate mutation with optimistic updates
export function useCreateCertificate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateCertificateData) => createCertificate(data),
    onMutate: async (newCertificate) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.certificates.all });
      
      // Snapshot the previous value
      const previousCertificates = queryClient.getQueryData(queryKeys.certificates.lists());
      
      // Optimistically update the cache
      if (newCertificate.member_id) {
        const memberCertificatesKey = queryKeys.certificates.byMember(newCertificate.member_id);
        const previousMemberCerts = queryClient.getQueryData(memberCertificatesKey);
        
        if (previousMemberCerts) {
          queryClient.setQueryData(memberCertificatesKey, (old: Certificate[]) => [
            {
              ...newCertificate,
              id: 'temp-' + Date.now(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              public_id: 'temp-public-id',
            } as Certificate,
            ...old,
          ]);
        }
      }
      
      return { previousCertificates };
    },
    onError: (err, newCertificate, context) => {
      // Rollback optimistic update on error
      if (context?.previousCertificates && newCertificate.member_id) {
        queryClient.setQueryData(
          queryKeys.certificates.byMember(newCertificate.member_id),
          context.previousCertificates
        );
      }
      
      toast.error('Failed to create certificate');
      console.error('Create certificate error:', err);
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch relevant queries
      invalidateQueries.certificates.all();
      if (variables.member_id) {
        invalidateQueries.certificates.byMember(variables.member_id);
      }
      invalidateQueries.certificates.search();
      
      toast.success('Certificate created successfully');
    },
  });
}

// Update certificate mutation with optimistic updates
export function useUpdateCertificate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCertificateData }) => 
      updateCertificate(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.certificates.detail(id) });
      
      // Snapshot previous value
      const previousCertificate = queryClient.getQueryData(queryKeys.certificates.detail(id));
      
      // Optimistically update
      queryClient.setQueryData(queryKeys.certificates.detail(id), (old: Certificate) => ({
        ...old,
        ...data,
        updated_at: new Date().toISOString(),
      }));
      
      return { previousCertificate };
    },
    onError: (err, { id }, context) => {
      // Rollback on error
      if (context?.previousCertificate) {
        queryClient.setQueryData(queryKeys.certificates.detail(id), context.previousCertificate);
      }
      
      toast.error('Failed to update certificate');
      console.error('Update certificate error:', err);
    },
    onSuccess: (data, { id }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates.detail(id) });
      invalidateQueries.certificates.all();
      invalidateQueries.certificates.search();
      
      toast.success('Certificate updated successfully');
    },
  });
}

// Delete certificate mutation
export function useDeleteCertificate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => deleteCertificate(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.certificates.all });
      
      // Remove from cache optimistically
      queryClient.removeQueries({ queryKey: queryKeys.certificates.detail(id) });
      
      return { deletedId: id };
    },
    onError: (err, id, context) => {
      toast.error('Failed to delete certificate');
      console.error('Delete certificate error:', err);
      
      // Refetch to restore state
      invalidateQueries.certificates.all();
    },
    onSuccess: (data, id) => {
      // Invalidate all certificate queries
      invalidateQueries.certificates.all();
      invalidateQueries.certificates.search();
      
      toast.success('Certificate deleted successfully');
    },
  });
}

// Prefetch certificate details (for hover previews, etc.)
export function usePrefetchCertificate() {
  const queryClient = useQueryClient();
  
  return {
    prefetchByNumber: (certificateNo: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.certificates.byNumber(certificateNo),
        queryFn: () => getCertificateByNumber(certificateNo),
        staleTime: 10 * 60 * 1000,
      });
    },
    prefetchByPublicId: (publicId: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.certificates.byPublicId(publicId),
        queryFn: () => getCertificateByPublicId(publicId),
        staleTime: 10 * 60 * 1000,
      });
    },
  };
}
