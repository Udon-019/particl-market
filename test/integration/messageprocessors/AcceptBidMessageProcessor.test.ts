import { app } from '../../../src/app';
import { Logger as LoggerType } from '../../../src/core/Logger';
import { Types, Core, Targets } from '../../../src/constants';
import { TestUtil } from '../lib/TestUtil';
import { TestDataService } from '../../../src/api/services/TestDataService';
import { NotFoundException } from '../../../src/api/exceptions/NotFoundException';
import { MessageException } from '../../../src/api/exceptions/MessageException';
import { ListingItemService } from '../../../src/api/services/ListingItemService';
import { BidMessageProcessor } from '../../../src/api/messageprocessors/BidMessageProcessor';
import { RejectBidMessageProcessor } from '../../../src/api/messageprocessors/RejectBidMessageProcessor';
import { AcceptBidMessageProcessor } from '../../../src/api/messageprocessors/AcceptBidMessageProcessor';
import { CancelBidMessageProcessor } from '../../../src/api/messageprocessors/CancelBidMessageProcessor';
import { BidMessageType } from '../../../src/api/enums/BidMessageType';
import { BidService } from '../../../src/api/services/BidService';
import { BidSearchParams } from '../../../src/api/requests/BidSearchParams';

describe('AcceptBidMessageProcessor', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = process.env.JASMINE_TIMEOUT;

    const log: LoggerType = new LoggerType(__filename);
    const testUtil = new TestUtil();
    const testBidData = {
        action: 'MPA_BID',
        item: 'f08f3d6e101'
    };

    let testDataService: TestDataService;
    let bidMessageProcessor: BidMessageProcessor;
    let rejectBidMessageProcessor: RejectBidMessageProcessor;
    let cancelBidMessageProcessor: CancelBidMessageProcessor;
    let acceptBidMessageProcessor: AcceptBidMessageProcessor;
    let listingItemService: ListingItemService;
    let bidService: BidService;
    let listingItemModel;

    beforeAll(async () => {

        await testUtil.bootstrapAppContainer(app);  // bootstrap the app

        testDataService = app.IoC.getNamed<TestDataService>(Types.Service, Targets.Service.TestDataService);

        listingItemService = app.IoC.getNamed<ListingItemService>(Types.Service, Targets.Service.ListingItemService);
        bidService = app.IoC.getNamed<BidService>(Types.Service, Targets.Service.BidService);

        bidMessageProcessor = app.IoC.getNamed<BidMessageProcessor>(Types.MessageProcessor, Targets.MessageProcessor.BidMessageProcessor);

        acceptBidMessageProcessor = app.IoC.getNamed<AcceptBidMessageProcessor>(Types.MessageProcessor, Targets.MessageProcessor.AcceptBidMessageProcessor);

        rejectBidMessageProcessor = app.IoC.getNamed<RejectBidMessageProcessor>(Types.MessageProcessor, Targets.MessageProcessor.RejectBidMessageProcessor);

        cancelBidMessageProcessor = app.IoC.getNamed<CancelBidMessageProcessor>(Types.MessageProcessor, Targets.MessageProcessor.CancelBidMessageProcessor);
        // clean up the db, first removes all data and then seeds the db with default data
        await testDataService.clean([], false);
    });

    afterAll(async () => {
        //
    });


    test('Should throw NotFoundException because invalid listing hash', async () => {
        expect.assertions(1);
        await acceptBidMessageProcessor.process(testBidData).catch(e =>
            expect(e).toEqual(new NotFoundException(testBidData.item))
        );
    });

    test('Should throw MessageException because no bid found for givin listing hash', async () => {
        // create the listingItem
        listingItemModel = await listingItemService.create({hash: 'TEST-HASH'});
        testBidData.item = listingItemModel.Hash;

        // throw MessageException because no bid found for givin listing hash
        const bidModel = await acceptBidMessageProcessor.process({action: 'MPA_ACCEPT', item: 'TEST-HASH' }).catch(e =>
            expect(e).toEqual(new MessageException('Bid with the listing Item was not found!'))
        );
    });

    test('Should accept a bid for the given listing item', async () => {
        // create bid message
        await bidMessageProcessor.process(testBidData);

        // accept a bid
        testBidData.action = 'MPA_ACCEPT';
        const bidModel = await acceptBidMessageProcessor.process(testBidData);

        const result = bidModel.toJSON();
        // test the values
        expect(result.status).toBe(BidMessageType.MPA_ACCEPT);
        expect(result.listingItemId).toBe(listingItemModel.id);
        expect(result.BidData.length).toBe(0);
    });

    test('Should return two bids with latest one created with Accept status for the given listing item', async () => {
        const bids = await bidService.search({listingItemId: listingItemModel.id} as BidSearchParams);
        const bidResults = bids.toJSON();
        expect(bidResults.length).toBe(2);
        expect(bidResults[0].status).toBe('ACTIVE');
        expect(bidResults[1].status).toBe('ACCEPTED');
    });

    test('Should not cancel the bid becuase bid was alredy been accepted', async () => {
        // cancel bid
        testBidData.action = 'MPA_CANCEL';
        await cancelBidMessageProcessor.process(testBidData).catch(e =>
            expect(e).toEqual(new MessageException(`Bid can not be CANCELLED because it was already been ${BidMessageType.MPA_ACCEPT}`))
        );
    });

    test('Should not reject the bid becuase bid was alredy been accepted', async () => {
        // reject a bid
        testBidData.action = 'MPA_REJECT';
        await rejectBidMessageProcessor.process(testBidData).catch(e =>
            expect(e).toEqual(new MessageException(`Bid can not be REJECTED because it was already been ${BidMessageType.MPA_ACCEPT}`))
        );
    });

});