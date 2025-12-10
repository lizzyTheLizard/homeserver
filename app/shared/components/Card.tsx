import Link from 'next/link'
import style from './Card.module.css'
import { Url } from 'next/dist/shared/lib/router/router'

export type CardProps = CardPropsWithLiink | CardPropsWithoutLink
interface CardPropsWithLiink extends Omit<React.ComponentPropsWithoutRef<'a'>, 'href'> {
  href: Url
}
type CardPropsWithoutLink = React.ComponentPropsWithoutRef<'div'>

/**
 * Cards can be used to show all kinds of content in a contained box.
 * Can easily be extended to a link by providing an `href` property as well as added to a row.
 */
export function Card({ children, ...rest }: React.PropsWithChildren<CardProps>) {
  if ('href' in rest) {
    return (
      <Link className={style.container} {...rest}>
        {children}
      </Link>
    )
  }
  else {
    return (
      <div className={style.container} {...rest}>
        {children}
      </div>
    )
  }
}
