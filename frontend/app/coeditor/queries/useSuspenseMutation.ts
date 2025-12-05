import { useMutation, type DefaultError, type QueryClient, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query'
import { useState } from 'react'

export function useSuspenseMutation<TData = unknown, TError = DefaultError, TVariables = void, TOnMutateResult = unknown>(options: UseMutationOptions<TData, TError, TVariables, TOnMutateResult>, queryClient?: QueryClient): UseMutationResult<TData, TError, TVariables, TOnMutateResult> {
  // This is a hack as tanstack/react-query does not provide a useSuspenseMutation hook. It will not work perfectly in all cases.
  const [endSuspenseFunction, setEndSuspenseFunction] = useState<(() => void) | undefined>(undefined)

  const onSettled: typeof options.onSettled = (d, e, v, o, c) => {
    endSuspenseFunction?.()
    return options.onSettled?.(d, e, v, o, c)
  }

  const mutation = useMutation({ ...options, onSettled }, queryClient)
  if (mutation.isPending) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw new Promise<void>((resolve) => {
      setEndSuspenseFunction(() => { resolve() })
    })
  }
  return mutation
}
