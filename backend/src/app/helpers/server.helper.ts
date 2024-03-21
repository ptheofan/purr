import axios, { AxiosRequestConfig } from 'axios';

export async function queryFileSize(url: string, axiosOpts?: AxiosRequestConfig): Promise<number | undefined> {
  const response = await axios.head(url, axiosOpts);

  if (response.headers && response.headers['content-length']) {
    return Number(response.headers['content-length']);
  }

  return undefined;
}


export async function queryRangesSupport(url: string, axiosOpts?: AxiosRequestConfig): Promise<boolean> {
  try {
    const response = await axios.get(url, { ...axiosOpts || {},
      headers: {
        Range: 'bytes=0-1',
      },
    });

    return response.status === 206;
  } catch (err) {
    return false;
  }
}
