import { rpc, api } from './lib/api';
import * as crypto from 'crypto-js';
import { BlackBoxTestUtil } from './lib/BlackBoxTestUtil';

describe('DestroyItemCategory', () => {

    const testUtil = new BlackBoxTestUtil();
    const method = 'removecategory';

    const parentCategory = {
        id: 0,
        key: 'cat_high_real_estate'
    };

    let newCategory;
    let profileId;

    beforeAll(async () => {

        // create category
        const res = await rpc('getcategory', [parentCategory.key]);
        const categoryResult: any = res.getBody()['result'];

        console.log('categoryResult: ', categoryResult);
        parentCategory.id = categoryResult.id;
        const addCategoryRes: any = await testUtil.addData('itemcategory', {
            name: 'sample category',
            description: 'sample category description',
            parent_item_category_id: parentCategory.id
        });
        newCategory = addCategoryRes.getBody()['result'];

        const addProfileRes: any = await testUtil.addData('profile', { name: 'TESTING-PROFILE-NAME' });
        profileId = addProfileRes.getBody()['result'].id;
    });

    test('Should delete the category', async () => {
        const res = await rpc(method, [newCategory.id]);
        res.expectJson();
        res.expectStatusCode(200);
    });

    test('Should not delete the default category', async () => {
        const res = await rpc(method, [parentCategory.id]);
        res.expectJson();
        res.expectStatusCode(404);
    });

    test('Should not delete the category if listing-item related with category', async () => {
        // create category
        const addCategoryRes: any = await testUtil.addData('itemcategory', {
            name: 'sample category 2',
            description: 'sample category description 2',
            parent_item_category_id: parentCategory.id
        });
        newCategory = addCategoryRes.getBody()['result'];

        const hash = crypto.SHA256(new Date().getTime().toString()).toString();
        const listingitemData = {
            hash,
            itemInformation: {
                title: 'item title',
                shortDescription: 'item short desc',
                longDescription: 'item long desc',
                itemCategory: {
                    id: newCategory.id
                }
            }
        };
        const listingItems = await testUtil.addData('listingitem', listingitemData);
        const res = await rpc(method, [newCategory.id]);
        res.expectJson();
        res.expectStatusCode(404);
    });

    test('Should not delete the category if listing-item-template related with category', async () => {
        // create category
        const addCategoryRes: any = await testUtil.addData('itemcategory', {
            name: 'sample category 3',
            description: 'sample category description 3',
            parent_item_category_id: parentCategory.id
        });
        newCategory = addCategoryRes.getBody()['result'];
        // create listing-item-template with category
        const listingItemTemplate = {
            profile_id: profileId,
            itemInformation: {
                title: 'Item Information',
                shortDescription: 'Item short description',
                longDescription: 'Item long description',
                itemCategory: {
                    id: newCategory.id
                }
            }
        };
        const listingItems = await testUtil.addData('listingitemtemplate', listingItemTemplate);
        const res = await rpc(method, [newCategory.id]);
        res.expectJson();
        res.expectStatusCode(404);
    });

});
