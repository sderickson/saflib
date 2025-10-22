/**
 * Interface for the successful response from the client that handleClientMethod expects.
 */
export interface ClientResponse {
  status: number;
}

/**
 * Interface for the error from the client that handleClientMethod expects.
 */
export interface ClientResponseError {
  code?: string;
}

/**
 * Interface for the result from the client that handleClientMethod expects.
 */
export interface ClientResult<T> {
  error?: ClientResponseError;
  data?: T;
  response: ClientResponse;
}
