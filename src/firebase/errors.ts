export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public readonly context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const message = `FirestoreError: Missing or insufficient permissions. The following request was denied by Firestore Security Rules:`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;

    // This is for environments that support it (like V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FirestorePermissionError);
    }
  }

  toContextObject() {
    return {
      message: this.message,
      context: this.context,
    };
  }

  toString() {
    return `${this.message}\n${JSON.stringify(this.context, null, 2)}`;
  }
}
