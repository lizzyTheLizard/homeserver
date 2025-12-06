import { createContext } from 'react'
import { useMutation, useQuery, type DefaultError, type QueryClient, type QueryKey, type UseMutationOptions, type UseMutationResult, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query'
import { useContext } from 'react'

export type LoadingHandler = (isLoading: boolean) => void

export function useLoadingQuery<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, queryClient?: QueryClient): UseQueryResult<TData, TError> {
  const loadingHandler = useContext(LoadingContext)
  const originalQueryFn = options.queryFn

  if (!originalQueryFn || typeof originalQueryFn !== 'function')
    throw new Error('No query function provided')

  const queryFn: typeof originalQueryFn = async (context) => {
    loadingHandler(true)
    try { return await originalQueryFn(context) }
    finally { loadingHandler(false) }
  }
  return useQuery({ ...options, queryFn }, queryClient)
}

export function useLoadingMutation<TData = unknown, TError = DefaultError, TVariables = void, TOnMutateResult = unknown>(options: UseMutationOptions<TData, TError, TVariables, TOnMutateResult>, queryClient?: QueryClient): UseMutationResult<TData, TError, TVariables, TOnMutateResult> {
  const loadingHandler = useContext(LoadingContext)
  const originalMutationFn = options.mutationFn

  if (!originalMutationFn || typeof originalMutationFn !== 'function')
    throw new Error('No mutation function provided')

  const mutationFn: typeof originalMutationFn = async (variables, context) => {
    loadingHandler(true)
    try { return await originalMutationFn(variables, context) }
    finally { loadingHandler(false) }
  }
  return useMutation({ ...options, mutationFn }, queryClient)
}

export const LoadingContext = createContext<LoadingHandler>(() => { /* empty */ })

LoadingContext.displayName = 'LoadingContext'
