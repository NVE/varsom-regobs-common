import moment, { Moment } from 'moment';

export class SyncProgress {
    private records: Map<string, string | unknown>;
    private totalRecords: number;
    private started: Moment;

    get estimatedTimeLeftMs(): number {
      const ms = moment().diff(this.started, 'milliseconds');
      const itemsLeft =  this.getItemsLeft();
      const completed = this.totalRecords - itemsLeft;
      if(completed > 0) {
        const msPerCompleted = ms / completed;
        return msPerCompleted * itemsLeft;
      }
      return null;
    }

    private getItemsLeft(countErrors = false) {
      let total = 0;
      for(const [, error] of this.records) {
        if(!error || countErrors === true) {
          total++;
        }
      }
      return total;
    }

    get percentageComplete(): number {
      const itemsLeft = this.getItemsLeft();
      if (this.totalRecords > 0 && itemsLeft > 0) {
        return (this.totalRecords - itemsLeft) / this.totalRecords;
      }
      return 1;
    }

    get percentageCompleteFormatted(): string {
      return this.percentageComplete.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 });
    }

    get hasError(): boolean {
      for(const [, error] of this.records) {
        if(error) {
          return true;
        }
      }
    }

    get isComplete(): boolean {
      return this.getItemsLeft() === 0;
    }

    get inProgress(): boolean {
      return this.getItemsLeft() > 0;
    }

    constructor(recordIds?: Array<string>) {
      this.records = new  Map<string, Error>();
      if (recordIds !== undefined) {
        this.start(recordIds);
      }
    }

    start(recordIds: Array<string>) {
      this.reset();
      for(const r of recordIds) {
        this.records.set(r, null);
      }
      this.totalRecords = this.getItemsLeft();
      this.started = moment();
    }

    reset() {
      this.records.clear();
    }

    setRecordComplete(id: string) {
      this.removeRecord(id);
    }

    setRecordError(id: string, error: string | unknown) {
      this.records.set(id, error);
    }

    private removeRecord(id: string) {
      this.records.delete(id);
    }
}
