const { DynamoDB } = require('aws-sdk');

const dynamoDB = new DynamoDB();

const createContactTable = async () => {
  const params = {
    TableName: 'ContactMessages',
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' }  // Partition key
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'StatusIndex',
        KeySchema: [
          { AttributeName: 'status', KeyType: 'HASH' }
        ],
        Projection: {
          ProjectionType: 'ALL'
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  };

  try {
    await dynamoDB.createTable(params).promise();
    console.log('ContactMessages tablosu başarıyla oluşturuldu.');
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log('ContactMessages tablosu zaten mevcut.');
    } else {
      console.error('Tablo oluşturma hatası:', error);
    }
  }
};

createContactTable(); 