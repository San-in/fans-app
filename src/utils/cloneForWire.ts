/** Simulates serialization across the network: the receiver never shares references with the sender. */
export const cloneForWire = <T>(value: T): T =>
  value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T)
