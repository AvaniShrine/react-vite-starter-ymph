import { fedexBaseUrl, getFedexAuthToken } from '@/app/lib/getFedexAuth';
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const {selectedSR: salesOrde̵̵r, shippingPayload: ratePayload, deliveryType, shippingCost } = await request.json()
        const cookieStore = cookies();
        const accessToken = (await cookieStore).get('zoho_access')?.value;

        if (!accessToken) {
            return NextResponse.json({ error: 'Zoho access token is missing' }, { status: 401 });
        }

        // Determine CRM entity (Lead or Account)
        console.log("this is sr ",salesOrde̵̵r);
        let entityData: string | null = null;
        let entityName: string | null = null;
        if (salesOrde̵̵r.lead) {
            entityData = `Leads/${salesOrde̵̵r.lead.id}`;
            entityName = salesOrde̵̵r.company.slice(0, 35);
        } else if (salesOrde̵̵r.account) {
            entityData = `Accounts/${salesOrde̵̵r.account.id}`;
            entityName = salesOrde̵̵r.company.slice(0, 35);
        }
        if (!entityData) {
            return NextResponse.json({ error: 'No valid lead or account provided' }, { status: 400 });
        }

        // Fetch CRM Data
        const crmEndpoint = `https://www.zohoapis.com/crm/v7/${entityData}?fields=Email,Phone,Name`;
        const crmResponse = await fetch(crmEndpoint, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        const responseData1 = await crmResponse.json();
        console.log("🚀 ~ POST ~ responseData:", JSON.stringify(responseData1.data[0]));
        entityData = JSON.stringify(responseData1.data[0]);
    
        if (!crmResponse.ok) {
            return NextResponse.json({ error: 'Failed to fetch CRM data', status: crmResponse.status }, { status: 500 });
        }
        const shippingResponse = await createFedexShipment(salesOrde̵̵r, ratePayload, deliveryType,entityData,entityName);
        const labelUrl =
            shippingResponse?.output?.transactionShipments?.[0]?.pieceResponses?.flatMap(
                (pr) => pr.packageDocuments?.map((pd) => pd.url) ?? []
            ) ?? [];

        //  Extract ship date and tracking number
        const shipDate = shippingResponse?.output?.transactionShipments?.[0]?.shipDatestamp;
        const trackingNumber = shippingResponse?.output?.transactionShipments?.[0]?.masterTrackingNumber;

        //  Update Sample Request in Zoho CRM
        const sampleRequestId = salesOrde̵̵r.id;
        if (sampleRequestId && shipDate && trackingNumber) {
            const updateEndpoint = `https://www.zohoapis.com/crm/v7/producttab__Sample_Requests/${sampleRequestId}`;
            const updatePayload = {
                data: [
                    {
                        id: sampleRequestId,
                        producttab__FedEx_tracking_no: trackingNumber,
                        producttab__Ship_Date: shipDate,
                        FedEx_shipping_options:deliveryType,
                        FedEx_Tracking_Label_Url: labelUrl?.[0] || null, // optional
                    }
                ]
            };

            const updateResponse = await fetch(updateEndpoint, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatePayload),
            });

            const updateResult = await updateResponse.json();
            console.log("CRM update result:", updateResult);
        }

        // Return success
        return NextResponse.json({ success: true, labelUrl, shipDate, trackingNumber ,sampleRequestId});

    } catch (err: any) {
        return NextResponse.json({ error: 'Unexpected error', detail: err.message }, { status: 500 });
    }
}


async function createFedexShipment(salesOrde̵̵r, ratePayload, deliveryType,entityData,entityName) {
    const data = typeof entityData === 'string' ? JSON.parse(entityData) : entityData;
    let pkType = "";
    if( deliveryType === 'FedEx Med-box 2 day'){
        pkType = 'FEDEX_MEDIUM_BOX';
    } 
    else if(deliveryType == 'FedEx Express Envelope'){
        pkType = 'FEDEX_PAK';
    } 
    else if(deliveryType == 'FedEx Large Box'){
         pkType = 'FEDEX_LARGE_BOX';
    }
    const srType = 'FEDEX_2_DAY';
    const requestedShipment = {
        "labelSpecification": {
            "labelFormatType": "COMMON2D",
            "imageType": "PDF",
            "labelStockType": "STOCK_4X6",
            "labelOrder": "SHIPPING_LABEL_FIRST",
        },
       "packagingType":pkType, //"YOUR_PACKAGING",
        "pickupType": "DROPOFF_AT_FEDEX_LOCATION",
        "serviceType":srType, // deliveryType,
        "shipper": {
            "address": {
                "city": "IRVINE",
                "countryCode": "US",
                "postalCode": "92618",
                "residential": false,
                "stateOrProvinceCode": "CA",
                "streetLines": [
                    "57 PARKER"
                ]
            },
            "contact": {
                "companyName": "Elitechem Products",
                "personName": "SHIPPING AND RECEIVING",
                "emailAddress": "harit.patel@gentechsolutionsllc.com",
                "phoneNumber": "9493220661"
            }
        },
        "recipients": [{
            "address": ratePayload.requestedShipment.recipient.address,
            "contact": {
                "emailAddress": data.Email,
                "personName": "ATTN: "+ salesOrde̵̵r.attentionTo,
                "companyName":entityName,
                "phoneNumber": "9497041210"
            }
        }],
        "requestedPackageLineItems": ratePayload.requestedShipment.requestedPackageLineItems,
        "shippingChargesPayment": {
            "paymentType": "SENDER"
        },
        "shipmentSpecialServices": {
            "specialServiceTypes": [
                "FEDEX_ONE_RATE"
            ]
        },
        "totalWeight": ratePayload.totalWeight,
    };

    const shippingPayload = {
        "accountNumber": {
            "value": "740561073" //sandbox
            // "value":"731710015"   //production
        },
        "labelResponseOptions": "URL_ONLY",
        "mergeLabelDocOption": "LABELS_AND_DOCS",
        requestedShipment
    };


    const FEDEX_API_URL = `${fedexBaseUrl}/ship/v1/shipments`;
    const accessToken = await getFedexAuthToken();
    console.log("🚀 ~ createFedexShipment ~ shippingPayload:", JSON.stringify(shippingPayload));

    const fedexResponse = await fetch(FEDEX_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(shippingPayload),
    });

    const responseData = await fedexResponse.json();
    console.log("🚀 ~ POST ~ responseData:", JSON.stringify(responseData));

    if (!fedexResponse.ok) {
        throw new Error(`Failed to create FedEx shipment. Error: ${JSON.stringify(responseData)}`);
    }
    return responseData;
}


