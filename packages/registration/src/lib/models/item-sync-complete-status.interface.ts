export interface ItemSyncCompleteStatus<T> {
    item: T;
    success: boolean;
    error?: Error;
}
