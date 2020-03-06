#!/usr/bin/env node

const Client = require('pg').Client;

async function checkDbAccess(dbUri) {
    const client = new Client({
        connectionString: dbUri,
        // connectionString: dbUri + 'jkjk',
        ssl: {
            rejectUnauthorized: false
        },
        // ssl: true
    })
    return client.connect()
        .then(() => {
            client.end()
            return true
        })
        .catch(err => {
            console.log(err)
            console.log('could not connect to db, see error above')
            client.end()
            return false
        })
}

module.exports = {
    checkDbAccess
}
