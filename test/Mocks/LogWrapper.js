const { Logger } = require('log4js');

export class LoggerMock {
    trace = jest.fn();
    debug = jest.fn();
    info = jest.fn();
    warn = jest.fn();
    error = jest.fn();
    fatal = jest.fn();
}

export class LogWrapperMock {
    logger;
    key;
    context;

    constructor(logger, key) {
        this.logger = logger;
        this.key = key;
        this.context = new Map();
    }

    upsertContext = jest.fn();
    removeContext = jest.fn();
    clearContext = jest.fn();
    getContextData = jest.fn().mockReturnValue([]);

    trace = jest.fn();
    debug = jest.fn();
    info = jest.fn();
    warn = jest.fn();
    error = jest.fn();
    fatal = jest.fn();
}