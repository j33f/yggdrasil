'use strict';

const notFound = async (yggdrasil) => {
  /**
   * Configure Express: Router: Errors: 404
   */
  yggdrasil.use((req, res) => {
    if (!res.headersSent) {
      const err = new Error('Not Found');
      err.status = 404;
      err.message = 'Error 404: Not found.';
      // render the error page
      res
        .status(err.status)
        .json({
          status: err.status,
          ok: false,
          cause: 'route',
          message: err.message,
          details: 'Nothing to see here...'
        });
    } else {
      res.send();
    }
  });
};
const defaultErrors = async (yggdrasil) => {
  /**
   * Configure Express: Router: Errors: defaults
   */
  yggdrasil.use((err, req, res) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.yggdrasil.get('env') === 'development' ? err : {};

    if (err.name === 'UnauthorizedError') {
      // JWT error, redirect to /
      res
        .status(err.status || 401)
        .json({
          status: err.status || 401,
          ok: false,
          cause: 'JWT',
          message: err.message,
          details: 'There is something wrong with your JWT or no JWT given at all.'
        });
    } else {
      // render the error page
      res
        .status(err.status || 500)
        .json({
          status: err.status || 500,
          ok: false,
          cause: 'server',
          message: err.message,
          details: 'Something went wrong while the server was performing actions following your request... or you broke the internet...'
        });
    }
  });
};


module.exports = async (yggdrasil) => {
  await notFound(yggdrasil);
  await defaultErrors(yggdrasil);
};