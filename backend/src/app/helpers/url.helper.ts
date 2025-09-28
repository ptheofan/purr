
export type UrlComponents = {
  protocol?: string;
  host?: string;
  port?: number;
  path?: string;
  query?: string;
  hash?: string;
  username?: string;
  password?: string;
  origin?: string;
};

/**
 * Creates a URL string from URL components
 * @param config - URL components to build the URL from
 * @returns Complete URL string
 */
export function createUrl(config: UrlComponents): string {
  // Create a copy to avoid mutating the input
  const urlConfig = { ...config };
  let { protocol, host, port } = urlConfig;
  const { path, query, hash, username, password, origin } = urlConfig;

  // If origin is provided, return it directly
  if (origin) {
    return origin;
  }

  // Extract protocol from host if present
  if (host && host.includes('://')) {
    const [hostProtocol, hostWithoutProtocol] = host.split('://');
    protocol = hostProtocol;
    host = hostWithoutProtocol;
  }

  // Extract port from host if present
  if (host && host.includes(':')) {
    const lastColonIndex = host.lastIndexOf(':');
    const hostWithoutPort = host.substring(0, lastColonIndex);
    const portString = host.substring(lastColonIndex + 1);
    const parsedPort = parseInt(portString, 10);
    
    if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
      host = hostWithoutPort;
      port = parsedPort;
    }
  }

  // Set default ports based on protocol
  if (!port && protocol) {
    if (protocol === 'http:') {
      port = 80;
    } else if (protocol === 'https:') {
      port = 443;
    }
  }

  // Infer protocol from port if not specified
  if (port && !protocol) {
    if (port === 443) {
      protocol = 'https:';
    } else if (port === 80) {
      protocol = 'http:';
    } else {
      protocol = 'http:'; // Default to HTTP for non-standard ports
    }
  }

  // Validate protocol format
  if (protocol && !protocol.endsWith(':')) {
    protocol += ':';
  }

  // Build URL components
  const urlParts: string[] = [];

  if (protocol) {
    urlParts.push(`${protocol}//`);
  }

  if (username) {
    urlParts.push(username);
    if (password) {
      urlParts.push(`:${password}`);
    }
    urlParts.push('@');
  }

  if (host) {
    urlParts.push(host);
  }

  // Only add port if it's not the default port for the protocol
  if (port && protocol) {
    const isDefaultPort = (protocol === 'http:' && port === 80) || 
                         (protocol === 'https:' && port === 443);
    if (!isDefaultPort) {
      urlParts.push(`:${port}`);
    }
  } else if (port && !protocol) {
    urlParts.push(`:${port}`);
  }

  if (path) {
    // Ensure path starts with slash
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    urlParts.push(normalizedPath);
  }

  if (query) {
    // Remove leading ? if present
    const normalizedQuery = query.startsWith('?') ? query.substring(1) : query;
    urlParts.push(`?${normalizedQuery}`);
  }

  if (hash) {
    // Remove leading # if present
    const normalizedHash = hash.startsWith('#') ? hash.substring(1) : hash;
    urlParts.push(`#${normalizedHash}`);
  }

  return urlParts.join('');
}

