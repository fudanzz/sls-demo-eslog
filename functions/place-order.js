'use strict';

const co         = require('co');
const AWS        = require('aws-sdk');
const kinesis    = new AWS.Kinesis();
const chance     = require('chance').Chance();
const log        = require('../lib/log');
const streamName = process.env.order_events_stream || 'order-events';


module.exports.handler = co.wrap(function* (event, context, cb) {

  let req = JSON.parse(event.body);
  log.debug(`request body is valid JSON`, { requestBody: event.body });

  let restaurantName = JSON.parse(event.body).restaurantName;
  
  let userName =  JSON.parse(event.body).userName;

  let orderId = chance.guid();
  
  log.debug(`placing order...`, { orderId, restaurantName, userName });

  let data = {
    orderId,
    userName,
    restaurantName,
    eventType: 'order_placed'
  };

  let putReq = {
    Data: JSON.stringify(data),
    PartitionKey: orderId,
    StreamName: streamName
  };

  yield kinesis.putRecord(putReq).promise();

  log.debug(`published event into Kinesis`, { eventName: 'order_placed' });

  let response = {
    statusCode: 200,
    body: JSON.stringify({orderId})
  };

  cb(null, response);
});

