export type FailureCategory =
  | 'invalid-input'
  | 'input-read'
  | 'latex-generation'
  | 'pdf-rendering'
  | 'output-write';

export class ResumeError extends Error {
  constructor(
    public readonly category: FailureCategory,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ResumeError';
  }
}
