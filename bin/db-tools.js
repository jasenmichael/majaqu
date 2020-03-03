require('dotenv').config()
const envs = process.env
const keys = Object.keys(envs)

const method = process.argv[2]
const src = process.argv[3]
const dest = process.argv[4]

// console.log(src.toUpperCase())

if (method === 'clone') {
    // first we backup the destDb, before replacing it with srcDb
    backup(dest)
    clone(src, dest)
}
if (method === 'backup') backup(src) // if method backup only requires a srcDb
if (method === 'restore') {
    let srcFile = src
    let destDb = dest
    restore(srcFile, destDb)
}

function clone() {
    console.log(`clone database: ${src} >> ${dest}`)
    // build the postgress commands, envs for src and dest
    let config = {}
    const includes = [`STRAPI_${src.toUpperCase()}_DATABASE_`, `STRAPI_${dest.toUpperCase()}_DATABASE_`]
    keys.forEach(async (key) => {
        await includes.forEach(i => {
            if (key.includes(i)) {
                // console.log(`${key}=${envs[key]}`)
                config[key] = envs[key]
            }
        })
    })

    // build srcDbUrl
    const srcHost = config[`STRAPI_${src.toUpperCase()}_DATABASE_HOST`]
    const srcPort = config[`STRAPI_${src.toUpperCase()}_DATABASE_PORT`]
    const srcDb = config[`STRAPI_${src.toUpperCase()}_DATABASE_NAME`]
    const srcUsr = config[`STRAPI_${src.toUpperCase()}_DATABASE_USERNAME`]
    const srcPass = config[`STRAPI_${src.toUpperCase()}_DATABASE_PASSWORD`]
    const srcDbUrl = `postgresql://${srcUsr}:${srcPass}@${srcHost}:${srcPort}/${srcDb}`

    // build destDbUrl
    const destHost = config[`STRAPI_${dest.toUpperCase()}_DATABASE_HOST`]
    const destPort = config[`STRAPI_${dest.toUpperCase()}_DATABASE_PORT`]
    const destDb = config[`STRAPI_${dest.toUpperCase()}_DATABASE_NAME`]
    const destUsr = config[`STRAPI_${dest.toUpperCase()}_DATABASE_USERNAME`]
    const destPass = config[`STRAPI_${dest.toUpperCase()}_DATABASE_PASSWORD`]
    const destDbUrl = `postgresql://${destUsr}:${destPass}@${destHost}:${destPort}/${destDb}`

    // pg_dump --dbname=postgresql://postgres:postgres@localhost:5432/majaqu > dump.sql
    const command = `pg_dump --dbname=postgresql://postgres:postgres@localhost:5432/majaqu > dump.sql`
}

function backup(dbType) {
    const filename = `db/${dbType}/backup-${Date.now()}`
    console.log(`backup database: ${dbType} >> ${filename}`)
}

function restore(srcFile, destDb) {
    console.log('restoring..', srcFile, 'to', destDb)
}
