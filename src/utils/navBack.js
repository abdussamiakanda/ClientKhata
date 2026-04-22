/**
 * Short label for the current route, used when passing navigation state to the next screen
 * so "Back" can read `location.state.from`.
 */
export function backLabelForLocation(location) {
  const path = location?.pathname || '';
  if (path === '/' || path === '/dashboard') return 'Home';
  if (path === '/clients') return 'Clients';
  if (path === '/jobs') return 'Jobs';
  if (path === '/payments') return 'Payments';
  if (path === '/hunt') return 'Hunt';
  if (path === '/settings') return 'Settings';
  if (path.startsWith('/client/')) return 'Client';
  if (path.startsWith('/job/')) return 'Job';
  if (path.startsWith('/invoice/')) return 'Invoice';
  return 'Previous';
}

/** Pass as `<Link state={navFromForNext(location)} to="..."/>` */
export function navFromForNext(location) {
  return {
    from: {
      pathname: location.pathname,
      search: location.search || '',
      label: backLabelForLocation(location),
    },
  };
}

/**
 * @param {import('react-router-dom').Location} location
 * @param {{ pathname: string, search?: string, label: string }} fallback
 */
export function resolveBackLink(location, fallback) {
  const from = location?.state?.from;
  if (from?.pathname) {
    const to = from.pathname + (from.search || '');
    const label = from.label || 'Previous';
    return { to, label };
  }
  const to = fallback.pathname + (fallback.search || '');
  return { to, label: fallback.label };
}
