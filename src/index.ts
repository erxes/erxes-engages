import * as bodyParser from 'body-parser';
import * as dotenv from 'dotenv';
import * as express from 'express';
import routes from './routes';

// load environment variables
dotenv.config();

import { connect } from './connection';
import { trackEngages } from './trackers/engageTracker';
import { debugBase, debugInit } from './utils/debuggers';

connect();

const app = express();

app.use((req: any, _res, next) => {
  req.rawBody = '';

  req.on('data', chunk => {
    req.rawBody += chunk.toString().replace(/\//g, '/');
  });

  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

routes(app);
trackEngages(app);

// Error handling middleware
app.use((error, _req, res, _next) => {
  debugBase(`Error: `, error.message);
  res.status(500).send(error.message);
});

const { PORT } = process.env;

app.listen(PORT, () => {
  debugInit(`Engages server is running on port ${PORT}`);
});
