const { dynamodb, config } = require('../config');

/**
 * Put item to DynamoDB
 */
async function putItem(tableName, item) {
  const params = {
    TableName: tableName,
    Item: item
  };

  try {
    await dynamodb.put(params).promise();
    console.log(`Item saved to ${tableName}:`, item);
    return item;
  } catch (error) {
    console.error(`Error saving to ${tableName}:`, error);
    throw error;
  }
}

/**
 * Update item in DynamoDB
 */
async function updateItem(tableName, key, updateExpression, attributeNames, attributeValues) {
  const params = {
    TableName: tableName,
    Key: key,
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: attributeNames,
    ExpressionAttributeValues: attributeValues
  };

  try {
    await dynamodb.update(params).promise();
    console.log(`Item updated in ${tableName}`);
  } catch (error) {
    console.error(`Error updating ${tableName}:`, error);
    throw error;
  }
}

/**
 * Query items by index
 */
async function queryByIndex(tableName, indexName, keyCondition, attributeValues) {
  const params = {
    TableName: tableName,
    IndexName: indexName,
    KeyConditionExpression: keyCondition,
    ExpressionAttributeValues: attributeValues
  };

  try {
    const result = await dynamodb.query(params).promise();
    return result.Items;
  } catch (error) {
    console.error(`Error querying ${tableName}:`, error);
    throw error;
  }
}

module.exports = { putItem, updateItem, queryByIndex };

