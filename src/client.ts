import { config } from "./config.js";
import type { CommishApiError } from "./types/commish.js";

export class CommishClient {
  private baseUrl: string;
  private apiKey: string;
  private maxRetries: number;
  private retryBaseDelay: number;

  constructor() {
    this.baseUrl = config.apiBaseUrl;
    this.apiKey = config.apiKey;
    this.maxRetries = config.maxRetries;
    this.retryBaseDelay = config.retryBaseDelayMs;
  }

  private async request<T>(
    method: string,
    path: string,
    options: {
      params?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
    } = {}
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (options.params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "User-Agent": "commish-mcp-server/1.0.0",
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        });

        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const delay = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : this.retryBaseDelay * Math.pow(2, attempt);
          if (attempt < this.maxRetries) {
            await this.sleep(delay);
            continue;
          }
        }

        if (!response.ok) {
          const errorBody = (await response
            .json()
            .catch(() => null)) as CommishApiError | null;
          const errorCode = errorBody?.error?.code || `http_${response.status}`;
          const errorMessage =
            errorBody?.error?.message || response.statusText;
          throw new CommishApiRequestError(errorCode, errorMessage, response.status);
        }

        if (response.status === 204) return {} as T;
        return (await response.json()) as T;
      } catch (error) {
        if (error instanceof CommishApiRequestError) throw error;
        lastError = error as Error;
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryBaseDelay * Math.pow(2, attempt));
          continue;
        }
      }
    }
    throw lastError || new Error("Request failed after retries");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return this.request<T>("GET", path, { params });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, { body });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, { body });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}

export class CommishApiRequestError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = "CommishApiRequestError";
    this.code = code;
    this.statusCode = statusCode;
  }

  toUserMessage(): string {
    switch (this.code) {
      case "unauthorized":
        return "Authentication failed. Please check your Commish API key is configured correctly.";
      case "forbidden":
        return "You don't have permission for this action.";
      case "not_found":
        return `Resource not found: ${this.message}.`;
      case "validation_error":
        return `Invalid request: ${this.message}.`;
      case "rate_limited":
        return "Rate limit exceeded (100 requests/min). Please wait.";
      case "internal_error":
        return "Commish encountered a server error. Please try again.";
      default:
        return `API error (${this.code}): ${this.message}`;
    }
  }
}

export const commishClient = new CommishClient();
