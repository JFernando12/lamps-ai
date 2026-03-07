const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Error");
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  /** Fetch preview metadata (render_url) by id — no auth required */
  getPreview: (
    previewId: string,
  ): Promise<{ preview_id: string; render_url?: string }> =>
    request(`/api/ai/preview/${previewId}`),

  /** Upload photo only — no AI, returns preview_id for use in checkout */
  uploadPhoto: async (file: File): Promise<{ photo_id: string }> => {
    const token = getToken();
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BASE}/api/photos/upload`, {
      method: 'POST',
      body: fd,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail ?? 'Error subiendo la foto');
    }
    return res.json();
  },

  /** Multipart upload */
  uploadPreview: async (
    file: File,
  ): Promise<{
    preview_id: string;
    render_url: string;
    lineart_url: string;
  }> => {
    const token = getToken();
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BASE}/api/ai/preview`, {
      method: 'POST',
      body: fd,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail ?? 'Error generando preview');
    }
    return res.json();
  },

  /** Save / update abandoned-cart draft. Returns the cart_id. */
  saveCart: (body: {
    email: string;
    cart_id?: string;
    photo_id?: string;
    engraving_text?: string;
    spotify_url?: string;
    product_id: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    fbclid?: string;
    fbp?: string;
  }): Promise<{ cart_id: string }> =>
    request('/api/carts/', { method: 'POST', body: JSON.stringify(body) }),

  /** Restore a cart by ID (used when user clicks recovery email link). */
  getCart: (
    cartId: string,
  ): Promise<{
    cart_id: string;
    email: string;
    photo_id: string | null;
    engraving_text: string | null;
    spotify_url: string | null;
    product_id: string;
  }> => request(`/api/carts/${cartId}`),

  /** Mark a cart as converted so no more recovery emails are sent. */
  convertCart: (cartId: string): Promise<void> =>
    request(`/api/carts/${cartId}/convert`, { method: 'POST' }),
};
