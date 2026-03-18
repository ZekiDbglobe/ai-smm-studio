export class AppError extends Error {
    constructor(message, { retryable = false, statusCode = 500, cause } = {}) {
        super(message, cause ? { cause } : undefined);
        this.name = this.constructor.name;
        this.retryable = retryable;
        this.statusCode = statusCode;
    }
}

export class ConfigurationError extends AppError {
    constructor(message, options = {}) {
        super(message, {
            retryable: false,
            statusCode: 500,
            ...options,
        });
    }
}

export class RetryableError extends AppError {
    constructor(message, options = {}) {
        super(message, {
            retryable: true,
            statusCode: 502,
            ...options,
        });
    }
}

export class ValidationError extends AppError {
    constructor(message, options = {}) {
        super(message, {
            retryable: false,
            statusCode: 400,
            ...options,
        });
    }
}
