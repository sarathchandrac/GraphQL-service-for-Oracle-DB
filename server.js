const dbConfig = require('./dbconfig.js');
const express = require('express');
const graphql = require('express-graphql');
const graphqlTools = require('graphql-tools');
const oracledb = require('oracledb');
const bodyParser = require( 'body-parser');
const cors = require('cors');
const port = 3000;

const app = express();



// Sample Data
const blogsData = [{id: 1, name: 'Hello', general_desc: 'World'}];

// Simple Blog schema with ID, name and general_desc fields
const typeDefs = `
    type Event{
        id: Int,
        event_name: String,
        entity_1_id: String
    }

    type Query{
        events: [Event],
        eventsById(entity_1_id: String):  [Event],
        entityIdsBySearchString(entity_1_id: String):  [Event]
    }
`;




// Resolver to match the GraphQL query and return data

const resolvers = {
    Query: {
        events(root, args, context, info) {
            context.requestCount++;
            console.log(`1. Request Time ${context.requestTime}, Total Requests: ${context.requestCount}`);

            return blogsData
        },
        eventsById(root, {entity_1_id}, context, info){
            context.requestCount++;
            console.log(`2 Request Time ${context.requestTime}, Total Requests: ${context.requestCount} with id : ${entity_1_id}`);
            return getOneBlogHelper(entity_1_id); // blogsData.find((b) => b.id == id);
        },
        // 	 SELECT entity_1_id FROM  CPE_EVENT  WHERE entity_1_id LIKE 'sc0%' GROUP BY entity_1_id ORDER BY entity_1_id;
        entityIdsBySearchString(root, {entity_1_id}, context, info){
            context.requestCount++;
            console.log(`2 Request Time ${context.requestTime}, Total Requests: ${context.requestCount} with id : ${entity_1_id}`);
            return getEntityIdsHelper(entity_1_id); // blogsData.find((b) => b.id == id);
        },
    }
};

// Resolver helpers
// getEntityIdsHelper
async function getEntityIdsHelper(entity_1_id) {
    // let sql = 'SELECT ID, NAME, GENERAL_DESC FROM CLASSIFIER WHERE ID= :id';
    let sql = "SELECT entity_1_id FROM  CPE_EVENT  WHERE entity_1_id like :entity_1_id  GROUP BY entity_1_id ORDER BY entity_1_id" ;
    console.log('1-passing query ---> ', entity_1_id, sql);
    // 'SELECT b.blog FROM blogtable b WHERE b.blog.id = :id';
    const binds = [entity_1_id + '%'];
    const conn = await oracledb.getConnection();
    const result = await conn.execute(sql, binds);
    await conn.close();
    let parsedKeys = result['metaData'];
    let rows = result.rows;
    let resultArray = [];
    console.log('row0 ----> ', rows[0]);
    rows.forEach((row) => {
        let updatedRow = [];
        row.forEach((val, index) => {
            // console.log('index, valu --> ', index, parsedKeys[index],  val);
            let key = parsedKeys[index]['name'].toLowerCase();
            updatedRow[key] = val;
            // console.log('updated row ------> ', key, updatedRow);
        });
        resultArray.push(updatedRow);
    });
    console.log('results length ---> ', resultArray.length);
    // rows.forEach(row => row.forEach((index,value) => parsedKeys[index] = value;))

    return  resultArray ; //result.rows[0];//.rows[0][0];
  }


async function getOneBlogHelper(entity_1_id) {
    // let sql = 'SELECT ID, NAME, GENERAL_DESC FROM CLASSIFIER WHERE ID= :id';
    let sql = 'select id, event_name, entity_1_id from cpe_event WHERE entity_1_id= :entity_1_id';
    console.log('2- passing query ---> ', entity_1_id, sql);
    // 'SELECT b.blog FROM blogtable b WHERE b.blog.id = :id';
    const binds = [entity_1_id];
    const conn = await oracledb.getConnection();
    const result = await conn.execute(sql, binds);
    await conn.close();
    let parsedKeys = result['metaData'];
    let rows = result.rows;
    let resultArray = [];
    console.log('row0 ----> ', rows[0]);
    rows.forEach((row) => {
        let updatedRow = {};
        row.forEach((val, index) => {
            // console.log('index, valu --> ', index, parsedKeys[index],  val);
            let key = parsedKeys[index]['name'].toLowerCase();
            updatedRow[key] = val;
            // console.log('updated row ------> ', key, updatedRow);
        });
        resultArray.push(updatedRow);
    });
    console.log('results length ---> ', resultArray.length);
    // rows.forEach(row => row.forEach((index,value) => parsedKeys[index] = value;))

    return  resultArray ; //result.rows[0];//.rows[0][0];
  }
//   [{id: 1, name: 'Hello', general_desc: 'World'}]


// Build the schema with Type Definitions and Resolvers

const schema = graphqlTools.makeExecutableSchema({typeDefs, resolvers});


// Create a DB connection pool
async function startOracle() {

    try {
      await oracledb.createPool(dbConfig);
      console.log("Connection was successful!");
    } catch (err) {
      console.error(err);
    }
  }
  
  // Start the webserver
  async function ws() {
    app.use('*', cors({ origin: 'http://localhost:3001' }));
    app.use('/graphql', bodyParser.json(), graphql({
      schema,
      context: {
        requestTime: Date.now(),
        requestCount: 0
    }
    }));

    console.log('firing graphql query ----> ');

    // app.use('/graphiql', graphql({
    //   graphiql: true,
    //   schema,
    //   context: {
    //     requestTime: Date.now(),
    //     requestCount: 0
    // }
    // }));
  
    app.listen(port, function() {
      console.log('Listening on http://localhost:' + port + '/graphql');
    })
  }
// Do it
async function run() {
    await startOracle();
    await ws();
}
  
run();
