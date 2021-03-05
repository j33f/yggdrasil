'use strict';

const winston = require('winston');
const {castArray} = require('lodash');

const loggerLevels = {
  crit: 0,
  'http-crit': 0,
  'socketio-crit': 0,
  error: 0,
  'http-error': 0,
  'socketio-error': 0,
  warn: 1,
  'http-warn': 1,
  info: 2,
  'http-info': 2,
  socketio: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

const loggerLevelsColors = {
  crit: 'magenta',
  'http-crit': 'magenta',
  'socketio-crit': 'magenta',
  error: 'red',
  'http-error': 'red',
  'socketio-error': 'red',
  warn: 'yellow',
  'http-warn': 'yellow',
  info: 'blue',
  'http-info': 'blue',
  socketio: 'blue',
  http: 'cyan',
  verbose: 'white',
  debug: 'white',
  silly: 'gray'
};

const levels = [
  'error', 'warning', 'info',
  'http-error', 'http-warning', 'http-info',
  'socketio'
];

winston.addColors(loggerLevelsColors);

class LoggerService {
  constructor(yggdrasil) {
    this.yggdrasil = yggdrasil;
    this.config = yggdrasil.config.logger;

    this.createLogger();
    this.addListener();
  }

  _configureDevLogger() {
    this.logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }));
  }

  _configureProductionLogger() {
    const logFilesRootPath = this.config.logFilesRootPath || '/var/log/yggdrasil';
    const addTransportToWinston = (level, target) => {
      target = target || level;
      this.logger.add(new winston.transports.File({
        filename: `${logFilesRootPath}/${target}.log`,
        level: level,
        format: winston.format.json()
      }));
    };
    levels.forEach(addTransportToWinston);
    addTransportToWinston('http-crit', 'http-error');

  }

  createLogger() {
    this.logger = winston.createLogger({
      levels: loggerLevels,
      level: this.config.level || 'silly'
    });

    if (process.env.NODE_ENV !== 'production') {
      this._configureDevLogger();
    } else {
      this._configureProductionLogger();
    }
  }

  addListener() {
    this.yggdrasil.listen('log', (level, ...message) => {
      this.logger.log(level, castArray(message).join(' '));
    });
  }
}

module.exports = LoggerService;