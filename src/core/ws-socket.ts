/**
 * Minimal WebSocket surface shared by native `WebSocket` and the `ws`
 * package, used by the tcp-proxy bridge clients. Instances created through
 * `WebSocketConstructor` are downcast to this shape.
 */
export interface RailwayWsSocket {
  binaryType: string;
  readyState?: number;
  /** Bytes queued but not yet transmitted; drives upload backpressure. */
  bufferedAmount?: number;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code: number; reason: string }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  send(data: string | ArrayBufferView): void;
  close(code?: number, reason?: string): void;
  /** Present when the transport can stop its socket keeping the process alive. */
  ref?(): void;
  unref?(): void;
}
