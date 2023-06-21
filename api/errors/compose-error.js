
exports.composeError = function(status, errorType, errorMessage) {
    return {
        status,
        error: {
            type: errorType,
            message: errorMessage,
        }
    };
}