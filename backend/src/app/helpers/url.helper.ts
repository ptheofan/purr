
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

export function createUrl(config: UrlComponents): string {
  const { protocol, host, port, path, query, hash, username, password, origin } = config;

  // does host include the protocol? Extract http:// or https:// if it exists and update the config
  if (host && host.includes('://')) {
    const [hostProtocol, hostWithoutProtocol] = host.split('://');
    config.protocol = hostProtocol;
    config.host = hostWithoutProtocol;
  }

  // does host include the port? Extract port if it exists and update the config
  if (host && host.includes(':')) {
    const [hostWithoutPort, portString] = host.split(':');
    config.host = hostWithoutPort;
    config.port = parseInt(portString, 10);
  }

  // if the port is not set, determine it from protocol
  if (!port) {
    if (protocol === 'http:') {
      config.port = 80;
    } else if (protocol === 'https:') {
      config.port = 443;
    }
  }

  // if port is set and protocol is still unknown determine it from port
  if (port && !protocol) {
    if (port === 443) {
      config.protocol = 'https:';
    } else {
      config.protocol = 'http:';
    }
  }

  let url = '';

  if (origin) {
    url = origin;
  } else {
    if (protocol) {
      url += `${protocol}//`;
    }

    if (username) {
      url += `${username}`;
      if (password) {
        url += `:${password}`;
      }
      url += '@';
    }

    if (host) {
      url += host;
    }

    if (port) {
      url += `:${port}`;
    }

    if (path) {
      // add leading slash if it's missing
      url += path.startsWith('/') ? path : `/${path}`;
    }

    if (query) {
      url += `?${query}`;
    }

    if (hash) {
      url += `#${hash}`;
    }
  }

  return url;
}
