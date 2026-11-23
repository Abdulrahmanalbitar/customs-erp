import { forwardRef } from 'react';
import { Link as RRLink } from 'react-router-dom';

// next/link → react-router Link (HashRouter). External links stay plain anchors.
const Link = forwardRef(function Link({ href, prefetch, replace, scroll, ...rest }, ref) {
  const to = typeof href === 'object' ? `${href.pathname || ''}${href.search || ''}` : href;
  if (typeof to === 'string' && /^(https?:|mailto:|tel:|#)/.test(to)) return <a ref={ref} href={to} {...rest} />;
  return <RRLink ref={ref} to={to} replace={replace} {...rest} />;
});
export default Link;
