import React, { Children, cloneElement, CSSProperties, isValidElement, MouseEvent, PropsWithChildren, useCallback, useEffect, useMemo } from 'https://esm.sh/react'
import { redirect } from './aleph.ts'
import events from './events.ts'
import { useRouter } from './hooks.ts'
import util from './util.ts'

interface LinkProps {
    to: string
    replace?: boolean
    prefetch?: boolean
    className?: string
    style?: CSSProperties
}

const fetchedPageModules = new Set<string>()

export default function Link({
    to,
    replace = false,
    prefetch: prefetchImmediately = false,
    className,
    style,
    children
}: PropsWithChildren<LinkProps>) {
    const { pathname: currentPathname, query: currentQuery } = useRouter()
    const currentHref = useMemo(() => {
        return [currentPathname, currentQuery.toString()].filter(Boolean).join('?')
    }, [currentPathname, currentQuery])
    const href = useMemo(() => {
        if (util.isHttpUrl(to)) {
            return to
        }
        let [pathname, search] = util.splitBy(to, '?')
        if (pathname.startsWith('/')) {
            pathname = util.cleanPath(pathname)
        } else {
            pathname = util.cleanPath(currentPathname + '/' + pathname)
        }
        return [pathname, search].filter(Boolean).join('?')
    }, [currentPathname, to])
    const prefetch = useCallback(() => {
        if (!util.isHttpUrl(href) && href !== currentHref && !fetchedPageModules.has(href)) {
            events.emit('fetch-page-module', { url: href })
            fetchedPageModules.add(href)
        }
    }, [href, currentHref])
    const onClick = useCallback((e: MouseEvent) => {
        e.preventDefault()
        if (href !== currentHref) {
            redirect(href, replace)
        }
    }, [href, currentHref, replace])

    useEffect(() => {
        if (prefetchImmediately) {
            prefetch()
        }
    }, [prefetchImmediately, prefetch])

    if (Children.count(children) === 1) {
        const child = Children.toArray(children)[0]
        if (isValidElement(child) && child.type === 'a') {
            const { props } = child
            return cloneElement(child, {
                ...props,
                className: [className, props.className].filter(util.isNEString).join(' ') || undefined,
                style: Object.assign({}, style, props.style),
                href,
                'aria-current': props['aria-current'] || 'page',
                onClick: (e: MouseEvent) => {
                    if (util.isFunction(props.onClick)) {
                        props.onClick(e)
                    }
                    if (!e.defaultPrevented) {
                        onClick(e)
                    }
                },
                onMouseEnter: (e: MouseEvent) => {
                    if (util.isFunction(props.onMouseEnter)) {
                        props.onMouseEnter(e)
                    }
                    if (!e.defaultPrevented) {
                        prefetch()
                    }
                }
            })
        }
    }

    return React.createElement(
        'a',
        {
            className,
            style,
            href,
            onClick,
            onMouseEnter: prefetch,
            'aria-current': 'page'
        },
        children
    )
}
