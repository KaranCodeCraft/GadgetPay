export function success(data, meta = undefined) {
  return {
    success: true,
    data,
    meta,
  };
}

export function fail(error, requestId) {
  return {
    success: false,
    error: {
      code: error.code || "INTERNAL_ERROR",
      message: error.message || "Internal server error",
      details: error.details,
      requestId,
    },
  };
}
