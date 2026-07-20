import { useQuery } from '@tanstack/react-query';
import { searchService, type SearchEntityType } from '@/services/searchService';
import { queryKeys } from './keys';

const MIN_QUERY_LENGTH = 2;

/** Backend-driven global search - no frontend filtering, the query is
 *  only sent once it meets the backend's minimum length. */
export function useGlobalSearch(q: string, type?: SearchEntityType) {
  return useQuery({
    queryKey: type ? queryKeys.search(q, type) : queryKeys.search(q),
    queryFn: () => searchService.search(q, type),
    enabled: q.trim().length >= MIN_QUERY_LENGTH,
    placeholderData: (prev) => prev,
  });
}
