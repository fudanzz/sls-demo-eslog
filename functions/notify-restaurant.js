'use strict';

const _          = require('lodash');
const co         = require('co');
const getRecords = require('../lib/kinesis').getRecords;
const AWS        = require('aws-sdk');
const kinesis    = new AWS.Kinesis();
const sns        = new AWS.SNS();
const log        = require('../lib/log');

const streamName = process.env.order_events_stream || 'order-events';
const topicArn = process.env.restaurant_notification_topic || 'arn:aws-cn:sns:cn-northwest-1:834095994034:restaurant-notification';


module.exports.handler = co.wrap(function* (event, context, cb) {
  log.debug('receive a event notify-restaurant');

  let records = getRecords(event); 
  let orderPlaced = records.filter(r => r.eventType === 'order_placed');
  log.debug(`found ${orderPlaced.length} 'order_placed' events`);

  for (let order of orderPlaced) {
    let snsReq = {
      Message: JSON.stringify(order),
      TopicArn: topicArn
    };

    yield sns.publish(snsReq).promise();

    log.debug(`notified restaurant...`,order);

    let data = _.clone(order);
    data.eventType = 'restaurant_notified';

    let kinesisReq = {
      Data: JSON.stringify(data), // the SDK would base64 encode this for us
      PartitionKey: order.orderId,
      StreamName: streamName
    };
    yield kinesis.putRecord(kinesisReq).promise();
    log.debug(`published event to Kinesis`, {eventName:"restaurant_notified"});
  }

  cb(null, "all done");
});

