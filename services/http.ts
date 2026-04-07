import type { z } from "zod";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

type FetchJsonOptions<TSchema extends z.ZodType> = RequestInit & {
  schema?: TSchema;
};

/**
 * Typed fetch helper for API routes and external services.
 */
export async function fetchJson<TSchema extends z.ZodType>(
  url: string,
  options: FetchJsonOptions<TSchema> = {},
): Promise<z.infer<TSchema>> {
  const { schema, ...init } = options;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new HttpError(res.statusText || "Request failed", res.status, json);
  }

  if (schema) {
    return schema.parse(json);
  }

  return json as z.infer<TSchema>;
}
