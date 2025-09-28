import { createUrl, UrlComponents } from './url.helper';

describe('createUrl', () => {
  it('should create a URL with all components', () => {
    const config: UrlComponents = {
      protocol: 'http:',
      host: 'example.com',
      port: 3000,
      path: '/path',
      query: 'query=value',
      hash: 'hash',
      username: 'user',
      password: 'pass',
    };

    const result = createUrl(config);

    expect(result).toEqual('http://user:pass@example.com:3000/path?query=value#hash');
  });

  it('should create a URL without optional components', () => {
    const config: UrlComponents = {
      protocol: 'http:',
      host: 'example.com',
    };

    const result = createUrl(config);

    expect(result).toEqual('http://example.com');
  });

  it('should extract protocol from host', () => {
    const config: UrlComponents = {
      host: 'http://example.com',
    };

    const result = createUrl(config);

    expect(result).toEqual('http://example.com');
  });

  it('should extract port from host', () => {
    const config: UrlComponents = {
      host: 'example.com:3000',
    };

    const result = createUrl(config);

    expect(result).toEqual('http://example.com:3000');
  });

  it('should set default port based on protocol', () => {
    const config: UrlComponents = {
      protocol: 'http:',
      host: 'example.com',
    };

    const result = createUrl(config);

    expect(result).toEqual('http://example.com');
  });

  it('should prioritize origin over other components', () => {
    const config: UrlComponents = {
      origin: 'http://origin.com',
      protocol: 'http:',
      host: 'example.com',
    };

    const result = createUrl(config);

    expect(result).toEqual('http://origin.com');
  });

  it('should not mutate the input config object', () => {
    const config: UrlComponents = {
      host: 'http://example.com:3000',
    };
    const originalConfig = { ...config };

    createUrl(config);

    expect(config).toEqual(originalConfig);
  });

  it('should handle protocol without colon', () => {
    const config: UrlComponents = {
      protocol: 'https',
      host: 'example.com',
    };

    const result = createUrl(config);

    expect(result).toEqual('https://example.com');
  });

  it('should not include default ports in URL', () => {
    const httpConfig: UrlComponents = {
      protocol: 'http:',
      host: 'example.com',
      port: 80,
    };

    const httpsConfig: UrlComponents = {
      protocol: 'https:',
      host: 'example.com',
      port: 443,
    };

    expect(createUrl(httpConfig)).toEqual('http://example.com');
    expect(createUrl(httpsConfig)).toEqual('https://example.com');
  });

  it('should handle IPv6-like host with port', () => {
    const config: UrlComponents = {
      host: 'fe80::1:3000',
    };

    const result = createUrl(config);

    expect(result).toEqual('http://fe80::1:3000');
  });

  it('should validate port range', () => {
    const config: UrlComponents = {
      host: 'example.com:99999', // Invalid port
    };

    const result = createUrl(config);

    expect(result).toEqual('example.com:99999'); // Should keep original host without protocol
  });

  it('should handle path normalization', () => {
    const config: UrlComponents = {
      protocol: 'http:',
      host: 'example.com',
      path: 'path', // Missing leading slash
    };

    const result = createUrl(config);

    expect(result).toEqual('http://example.com/path');
  });

  it('should handle query normalization', () => {
    const config: UrlComponents = {
      protocol: 'http:',
      host: 'example.com',
      query: '?query=value', // Has leading ?
    };

    const result = createUrl(config);

    expect(result).toEqual('http://example.com?query=value');
  });

  it('should handle hash normalization', () => {
    const config: UrlComponents = {
      protocol: 'http:',
      host: 'example.com',
      hash: '#hash', // Has leading #
    };

    const result = createUrl(config);

    expect(result).toEqual('http://example.com#hash');
  });

  it('should infer protocol from port 80', () => {
    const config: UrlComponents = {
      host: 'example.com',
      port: 80,
    };

    const result = createUrl(config);

    expect(result).toEqual('http://example.com');
  });

  it('should infer protocol from port 443', () => {
    const config: UrlComponents = {
      host: 'example.com',
      port: 443,
    };

    const result = createUrl(config);

    expect(result).toEqual('https://example.com');
  });

  it('should default to http for non-standard ports', () => {
    const config: UrlComponents = {
      host: 'example.com',
      port: 8080,
    };

    const result = createUrl(config);

    expect(result).toEqual('http://example.com:8080');
  });

  it('should handle empty config', () => {
    const config: UrlComponents = {};

    const result = createUrl(config);

    expect(result).toEqual('');
  });

  it('should handle only path', () => {
    const config: UrlComponents = {
      path: '/api/test',
    };

    const result = createUrl(config);

    expect(result).toEqual('/api/test');
  });
});
