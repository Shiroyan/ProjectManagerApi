class ResponseError extends Error {
  constructor(msg, status) {
    super(msg);
    this.status = status;
  }
}

Error.prototype.toString = function () {
  return `status: ${this.status}  error: ${this.message} `;
}

module.exports = ResponseError;