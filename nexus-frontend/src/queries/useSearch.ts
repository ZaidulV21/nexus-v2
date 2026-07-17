import { useQuery } from '@tanstack/react-query';
import { searchService } from '@/services/searchService';
import { queryKeys } from './keys';

const MIN_QUERY_LENGTH = 2;

/** Backend-driven global search - no frontend filtering, the query is
 *  only sent once it meets the backend's minimum length. */
export function useGlobalSearch(q: string) {
  return useQuery({
    queryKey: queryKeys.search(q),
    queryFn: () => searchService.search(q),
    enabled: q.trim().length >= MIN_QUERY_LENGTH,
    placeholderData: (prev) => prev,
  });
}
