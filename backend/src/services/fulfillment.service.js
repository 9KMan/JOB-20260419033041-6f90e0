const axios = require('axios');
const logger = require('../utils/logger');

async function processFulfillment(order) {
  const fulfillmentPartner = order.fulfillmentPartner || process.env.DEFAULT_FULFILLMENT_PARTNER;

  if (!fulfillmentPartner) {
    logger.warn(`No fulfillment partner configured for order ${order.orderNumber}`);
    return { success: false, error: 'No fulfillment partner configured' };
  }

  try {
    switch (fulfillmentPartner) {
      case 'shipbob':
        return await fulfillWithShipbob(order);
      case 'shipmonk':
        return await fulfillWithShipmonk(order);
      case 'custom':
        return await fulfillWithCustomAPI(order);
      default:
        return { success: false, error: `Unknown fulfillment partner: ${fulfillmentPartner}` };
    }
  } catch (error) {
    logger.error(`Fulfillment processing failed for order ${order.orderNumber}:`, error);
    return { success: false, error: error.message };
  }
}

async function fulfillWithShipbob(order) {
  const response = await axios.post(
    `${process.env.SHIPBOB_API_URL}/orders`,
    {
      order_id: order.orderNumber,
      shipping_address: order.shippingAddress,
      line_items: order.items.map(item => ({
        sku: item.sku || item.productId,
        quantity: item.quantity
      }))
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.SHIPBOB_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  logger.info(`Shipbob fulfillment created for order ${order.orderNumber}:`, response.data);
  return { success: true, partner: 'shipbob', data: response.data };
}

async function fulfillWithShipmonk(order) {
  const response = await axios.post(
    `${process.env.SHIPMONK_API_URL}/orders`,
    {
      orderId: order.orderNumber,
      shippingAddress: order.shippingAddress,
      items: order.items
    },
    {
      headers: {
        'X-API-Key': process.env.SHIPMONK_API_KEY,
        'Content-Type': 'application/json'
      }
    }
  );

  logger.info(`Shipmonk fulfillment created for order ${order.orderNumber}:`, response.data);
  return { success: true, partner: 'shipmonk', data: response.data };
}

async function fulfillWithCustomAPI(order) {
  const response = await axios.post(
    process.env.FULFILLMENT_WEBHOOK_URL,
    {
      order: order.toJSON(),
      action: 'fulfill'
    },
    {
      headers: {
        'X-API-Key': process.env.FULFILLMENT_API_KEY,
        'Content-Type': 'application/json'
      }
    }
  );

  logger.info(`Custom fulfillment processed for order ${order.orderNumber}:`, response.data);
  return { success: true, partner: 'custom', data: response.data };
}

async function getTrackingInfo(trackingNumber, carrier) {
  try {
    const response = await axios.get(
      `${process.env.TRACKING_API_URL}/${carrier}/${trackingNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.TRACKING_API_KEY}`
        }
      }
    );

    return response.data;
  } catch (error) {
    logger.error(`Failed to get tracking info for ${trackingNumber}:`, error);
    throw error;
  }
}

module.exports = { processFulfillment, getTrackingInfo };