import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Queries the file size from a URL using HEAD request
 * @param url - The URL to query
 * @param axiosOpts - Optional axios configuration
 * @returns The file size in bytes, or undefined if not available
 */
export async function queryFileSize(url: string, axiosOpts?: AxiosRequestConfig): Promise<number | undefined> {
  try {
    const response: AxiosResponse = await axios.head(url, axiosOpts);
    
    const contentLength = response.headers?.['content-length'];
    if (contentLength) {
      const size = Number(contentLength);
      return isNaN(size) ? undefined : size;
    }
    
    return undefined;
  } catch (error) {
    // Log error for debugging but don't throw - return undefined instead
    console.warn(`Failed to query file size for ${url}:`, error);
    return undefined;
  }
}

/**
 * Checks if a URL supports HTTP range requests
 * @param url - The URL to test
 * @param axiosOpts - Optional axios configuration
 * @returns True if range requests are supported, false otherwise
 */
export async function queryRangesSupport(url: string, axiosOpts?: AxiosRequestConfig): Promise<boolean> {
  try {
    const response: AxiosResponse = await axios.get(url, {
      ...axiosOpts,
      headers: {
        ...axiosOpts?.headers,
        Range: 'bytes=0-1',
      },
    });

    return response.status === 206;
  } catch (error) {
    // Range requests not supported or other error occurred
    return false;
  }
}
