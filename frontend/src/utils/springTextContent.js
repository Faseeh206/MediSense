import { Children, Fragment, isValidElement } from 'react';

export function flattenTextFragments(children) {
    return Children.toArray(children).flatMap(child => isValidElement(child) && child.type === Fragment
        ? flattenTextFragments(child.props.children) : [child]);
}

export function readableText(children) {
    return Children.toArray(children).map(child => {
        if (typeof child === 'string' || typeof child === 'number') return String(child);
        if (!isValidElement(child)) return '';
        if (child.type === 'br') return ' ';
        return readableText(child.props.children);
    }).join('').replace(/\s+/g, ' ').trim();
}
