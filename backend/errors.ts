export class NotFoundError extends Error {
  constructor(msg = "Not found") { super(msg); this.name = "NotFoundError"; }
}

export class ConflictError extends Error {
  constructor(msg: string) { super(msg); this.name = "ConflictError"; }
}

export class ValidationError extends Error {
  constructor(msg: string) { super(msg); this.name = "ValidationError"; }
}
