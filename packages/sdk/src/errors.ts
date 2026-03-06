export class ForsetyError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ForsetyError";
  }
}

export class ForsetyAuthError extends ForsetyError {
  constructor(message: string, cause?: unknown) {
    super(message, "AUTH_ERROR", cause);
    this.name = "ForsetyAuthError";
  }
}

export class ForsetyUploadError extends ForsetyError {
  constructor(message: string, cause?: unknown) {
    super(message, "UPLOAD_ERROR", cause);
    this.name = "ForsetyUploadError";
  }
}

export class ForsetyValidationError extends ForsetyError {
  constructor(message: string, cause?: unknown) {
    super(message, "VALIDATION_ERROR", cause);
    this.name = "ForsetyValidationError";
  }
}
