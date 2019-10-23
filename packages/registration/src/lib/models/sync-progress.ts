export class SyncProgress {
    private _recordsIds: string[];
    private _errors: Array<{ id: string, error: Error }>;
    private _totalRecords: number;

    get percentageComplete(): number {
        if (this._totalRecords > 0 && this._recordsIds.length > 0) {
            return (this._totalRecords - this._recordsIds.length) / this._totalRecords;
        }
        return 1;
    }

    get percentageCompleteFormatted(): string {
        return this.percentageComplete.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 });
    }

    get hasError(): boolean {
        return this._errors.length > 0;
    }

    get isComplete(): boolean {
        return this._recordsIds.length === 0;
    }

    get inProgress(): boolean {
        return this._recordsIds.length > 0;
    }

    constructor(recordIds?: string[]) {
        this.reset();
        if (recordIds !== undefined) {
            this.start(recordIds);
        }
    }

    start(recordIds: string[]) {
        this.reset();
        this._recordsIds = recordIds;
        this._totalRecords = recordIds.length;
    }

    reset() {
        this._totalRecords = 0;
        this._recordsIds = [];
        this._errors = [];
    }

    setRecordComplete(id: string) {
        this.removeRecord(id);
    }

    setRecordError(id: string, error: Error) {
        this.removeRecord(id);
        this._errors.push({ id, error });
    }

    private removeRecord(id: string) {
        const index = this._recordsIds.indexOf(id);
        if (index >= 0) {
            this._recordsIds.splice(index, 1);
        }
    }


}
