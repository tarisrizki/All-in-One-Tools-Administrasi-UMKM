import { QueryClient } from '@tanstack/svelte-query';

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			refetchOnMount: false, // Prevents loading skeletons if already in cache
			retry: 1,
			staleTime: 1000 * 60 * 5, // 5 minutes stale time
			gcTime: 1000 * 60 * 30 // 30 minutes garbage collection (formerly cacheTime)
		}
	}
});
