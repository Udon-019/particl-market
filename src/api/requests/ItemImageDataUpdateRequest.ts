import { IsNotEmpty } from 'class-validator';
import { RequestBody } from '../../core/api/RequestBody';


export class ItemImageDataUpdateRequest extends RequestBody {

    @IsNotEmpty()
    public item_image_id: number;

    // @IsNotEmpty()
    public dataId: string;

    // @IsNotEmpty()
    public protocol: string;

    // @IsNotEmpty()
    public encoding: string;

    // @IsNotEmpty()
    public data: string;

}

