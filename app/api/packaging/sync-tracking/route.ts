import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const { recordId, trackingNumber, shipDate, shippingMethod } = await request.json();
        console.log(recordId);
        console.log(trackingNumber);
        console.log(shipDate);
        console.log(shippingMethod);

        if (!recordId || !trackingNumber || !shipDate || !shippingMethod) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const cookieStore = cookies();
        const accessToken = (await cookieStore).get('zoho_access')?.value;

        if (!accessToken) {
            return NextResponse.json(
                { error: 'Zoho access token is missing' },
                { status: 401 }
            );
        }

        // Update Sample Request record in Zoho CRM
        const updateEndpoint = `https://www.zohoapis.com/crm/v7/producttab__Sample_Requests/${recordId}`;
        const updatePayload = {
            data: [
                {
                    id: recordId,
                    producttab__FedEx_tracking_no: trackingNumber,
                    producttab__Ship_Date: shipDate,
                    FedEx_shipping_options: shippingMethod
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

        if (!updateResponse.ok) {
            const err = await updateResponse.text();
            return NextResponse.json(
                { error: 'Failed to update CRM', detail: err },
                { status: updateResponse.status }
            );
        }

        const updateResult = await updateResponse.json();
        console.log("Manual tracking CRM update result:", updateResult);

        return NextResponse.json({ success: true, updateResult });
    } catch (err: any) {
        return NextResponse.json(
            { error: 'Unexpected error', detail: err.message },
            { status: 500 }
        );
    }
}
