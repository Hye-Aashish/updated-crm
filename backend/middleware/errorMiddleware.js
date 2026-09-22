const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log full error server-side for debugging
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message || err);
    if (process.env.NODE_ENV === 'development' && err.stack) {
        console.error(err.stack);
    }

    // Mongoose Bad ObjectId (CastError)
    if (err.name === 'CastError') {
        const message = 'Resource not found (invalid ID format)';
        error = { message, statusCode: 400 };
    }

    // Mongoose Duplicate Key Error (code 11000)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        const message = `Duplicate value entered for ${field}. Please use another value.`;
        error = { message, statusCode: 400 };
    }

    // Mongoose Validation Error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors || {}).map(val => val.message).join(', ');
        error = { message, statusCode: 400 };
    }

    // JWT Errors
    if (err.name === 'JsonWebTokenError') {
        error = { message: 'Invalid authentication token', statusCode: 401 };
    }
    if (err.name === 'TokenExpiredError') {
        error = { message: 'Token expired, please login again', statusCode: 401 };
    }

    const statusCode = error.statusCode || err.statusCode || err.status || (res.statusCode === 200 ? 500 : res.statusCode);
    const responseMessage = error.message || 'An internal server error occurred';

    res.status(statusCode).json({
        message: responseMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = { errorHandler };

