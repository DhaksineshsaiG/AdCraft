import axios from 'axios';

function resolveDownloadUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;

  const apiOrigin = import.meta.env.VITE_API_BASE_URL ?? window.location.origin;
  if (url.startsWith('/')) return `${apiOrigin}${url}`;

  return `${apiOrigin.replace(/\/+$/, '')}/${url}`;
}

function filenameFromDisposition(disposition: string | undefined): string | undefined {
  if (!disposition) return undefined;

  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }

  return disposition.match(/filename="?([^";]+)"?/i)?.[1];
}

export async function triggerBrowserDownload(url: string, filename?: string): Promise<void> {
  const token = localStorage.getItem('accessToken');
  const response = await axios.get<Blob>(resolveDownloadUrl(url), {
    responseType: 'blob',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const blobUrl = URL.createObjectURL(response.data);
  const resolvedFilename =
    filenameFromDisposition(response.headers['content-disposition']) ??
    filename ??
    'download';

  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = resolvedFilename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
