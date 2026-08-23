'use client'
import { Button, ButtonProps } from './form/Button'
import { useActionTitle } from './ActionTitleHelpers'

export function ActionButton({ children, ...props }: ButtonProps) {
  const renderInActionTitle = useActionTitle()

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()
    props.onClick?.(e)
  }

  return renderInActionTitle(
    <Button {...props} onClick={onClick}>
      {children}
    </Button>,
  )
}
