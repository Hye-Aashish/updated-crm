const errorHandler = (err, req, res, next) => {
    // Log full error server-side for debugging
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }

    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    // Never send stack traces or internal details to client
    res.status(statusCode).json({
        message: process.env.NODE_ENV === 'development'
            ? err.message
            : 'An internal server error occurred',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = { errorHandler };
