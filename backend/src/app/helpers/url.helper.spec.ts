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

    expect(result).toEqual('example.com:3000');
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
});
