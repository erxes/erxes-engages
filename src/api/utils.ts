import { debugEngages, debugResponse } from '../debuggers';

export const respondWithResult = (req, res: any, statusCode?: number) => {
  statusCode = statusCode || 200;

  return result => {
    if (result) {
      debugResponse(debugEngages, req, JSON.stringify(result));
      res.status(statusCode).json(result);
    }
  };
};

export const handleResultNotFound = (req, res) => {
  return result => {
    if (!result) {
      debugResponse(debugEngages, req, JSON.stringify(null));
      res.status(404).end();
      return null;
    }

    return result;
  };
};

export const handleError = (req, res: any, statusCode?: number) => {
  statusCode = statusCode || 500;

  return err => {
    debugResponse(debugEngages, req, JSON.stringify(err));

    return res.status(statusCode).send({
      error: err.message ? err.message : err,
    });
  };
};

export const handeResultNotFoundWithEmptyObject = (req, res) => {
  return result => {
    if (!result) {
      debugResponse(debugEngages, req, JSON.stringify({}));
      res.json({}).end();
      return null;
    }

    return result;
  };
};
