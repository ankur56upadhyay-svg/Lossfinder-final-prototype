function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issues = result.error.issues || result.error.errors || [];
      const details = issues.map(e => ({
        field: e.path ? e.path.join('.') : '',
        message: e.message
      }));

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please check the submitted data.',
          details: details
        }
      });
    }
    req[source] = result.data;
    next();
  };
}

module.exports = {
  validate
};
