export function jsonRequest(url: string, body: unknown, init: RequestInit = {}) {
  return new Request(url, {
    method: init.method ?? "POST",
    ...init,
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
    body: JSON.stringify(body),
  });
}

export async function jsonBody<T = Record<string, unknown>>(response: Response) {
  return response.json() as Promise<T>;
}
