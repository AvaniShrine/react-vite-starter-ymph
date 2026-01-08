// types.ts

//
// 8x8x6
// 11x9x9
// 11.25x8.75x12
// 16x12x10
// 16x12x12
// 20x14x12
// 24x14x14
// 16x16x20
// 16x16x24
export enum BoxTypes {
    _8x8x6 = "8x8x6",
    _11x9x9 = "11x9x9",
    _12x9x12 = "12x9x12",
    _16x12x10 = "16x12x10",
    _16x12x12 = "16x12x12",
    _20x14x12 = "20x14x12",
    _24x14x14 = "24x14x14",
    _16x16x20 = "16x16x20",
    _16x16x24 = "16x16x24",
}

export interface TrackBatchRequest {
    batch_id: string;
    batch_in_id: string;
    batch_number: string;
    in_quantity: number;
    balance_quantity: number;
    warehouse_id: string;
}

export interface Box {
    boxType: BoxTypes;
    quantities: Record<string, number>;
    items: Record<string, string>;
    batches: Record<string, TrackBatchRequest | null>;
}
