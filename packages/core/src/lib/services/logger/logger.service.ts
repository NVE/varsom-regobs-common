import { Injectable, Optional } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {

  constructor(@Optional() private logger: NGXLogger) { }

  log(message: any, ...additional: any[]) {
    if (this.logger) {
      this.logger.log(message, additional);
    }
  }

  trace(message: any, ...additional: any[]) {
    if (this.logger) {
      this.logger.trace(message, additional);
    }
  }

  debug(message: any, ...additional: any[]) {
    if (this.logger) {
      this.logger.debug(message, additional);
    }
  }

  info(message: any, ...additional: any[]) {
    if (this.logger) {
      this.logger.info(message, additional);
    }
  }

  warn(message: any, ...additional: any[]) {
    if (this.logger) {
      this.logger.warn(message, additional);
    }
  }

  error(message: any, ...additional: any[]) {
    if (this.logger) {
      this.logger.error(message, additional);
    }
  }

  fatal(message: any, ...additional: any[]) {
    if (this.logger) {
      this.logger.fatal(message, additional);
    }
  }
}
