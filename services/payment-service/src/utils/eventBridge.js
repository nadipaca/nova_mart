const { eventBridge, config } = require('../config');

/**
 * Publish event to EventBridge
 */
async function publishEvent(detailType, payload) {
  const params = {
    Entries: [
      {
        EventBusName: config.aws.eventBusName,
        Source: config.eventSource,
        DetailType: detailType,
        Detail: JSON.stringify(payload)
      }
    ]
  };

console.log(`Publishing ${detailType} event:`, JSON.stringify(payload));

try {
    const response = await eventBridge.putEvents(params).promise();
    
    if (response.FailedEntryCount > 0) {
      console.error('Failed to publish event:', response.Entries);
      throw new Error('EventBridge publish failed');
    }
    
    return response;
  } catch (error) {
    console.error('Error publishing event:', error);
    throw error;
  }
}

module.exports = { publishEvent };