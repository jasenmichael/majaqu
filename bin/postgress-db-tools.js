require('dotenv').config()
const {
    runBashCommand,
    runBashScript
} = require('./strapux')
const envs = process.env
const keys = Object.keys(envs)

const method = process.argv[2]
const src = process.argv[3]
const dest = process.argv[4]

// clone src dest, example: npm run db:clone development production
if (method === 'clone' && src && dest) {
    // first we backup the destDb, before replacing it with srcDb
    backup(dest)
    clone(src, dest)
}

// backup src, example: npm run db:backup production
if (method === 'backup' && src) backup(src) // if method backup only requires a srcDb
if (method === 'restore' && process.argv[3]) {
    let srcFile = process.argv[4] || ''
    let destDb = process.argv[3]
    restore(destDb, srcFile)
}

async function clone(src, dest) {
    console.log(`clone database: ${src} >> ${dest}`)
    // build the postgress commands, envs for src and dest
    const urls = await buildDbUrl(src, dest)
    // pg_dump --dbname=postgresql://postgres:postgres@localhost:5432/majaqu > dump.sql
    console.log(urls)
    const srcCmd = `pg_dump --dbname=${urls.srcDbUrl}`
    const destCmd = `psql --dbname=${urls.destDbUrl} -`
    // const destCmd = `PGPASSWORD="Ia6hy9G8lscdIUry" psql -U auorab2_majaqu-71843 aurorab2_majaqu`
    const command = `${srcCmd} | ssh ${process.env.SSH_PRODUCTION_DB_ACCESS} ${destCmd}`
    console.log(command)
}

async function backup(src) {
    const dbUrls = await buildDbUrl(src)
    const backupDbUrl = dbUrls.srcDbUrl
    const dbName = backupDbUrl.split('/').pop()

    const backupFilename = `${process.cwd()}/db/${src}/backup-${dbName}-${Date.now()}.sql`
    console.log(`backup ${src} db: ${dbName} > ${backupFilename}`)
    const dumpCommand = `pg_dump -C --no-owner --no-acl --dbname=${backupDbUrl} > ${backupFilename}`
    if (src === 'development') {
        await runBashCommand(dumpCommand)
    } else {
        if (process.env[`SSH_${src.toUpperCase()}_DB_ACCESS_ENABLED`]) {
            const sshUsrHost = src === 'staging' ? process.env.SSH_STAGING_DB_ACCESS : process.env.SSH_PRODUCTION_DB_ACCESS
            if (sshUsrHost && src === ('production' || 'staging')) {
                const command = `ssh -C ${sshUsrHost} ${dumpCommand}`
                await runBashCommand(`${process.cwd()}/bin/bash-command.sh ${command}`)
            } else {
                console.log(`error, no SSH_${src}_DB_ACCESS env configured`)
            }
        } else {
            // finally try from local even for staging/production if ssh not enabled in .env
            runBashCommand(dumpCommand)
        }
    }
}

function restore(destDb, srcFile) {
    console.log('restoring..', srcFile, 'to', destDb)
}

async function buildDbUrl(src, dest = undefined) {
    let config = {
        srcConfig: {},
        destConfig: {}
    }
    const includes = [`STRAPI_${src.toUpperCase()}_DATABASE_`]
    if (dest) {
        includes.push(`STRAPI_${dest.toUpperCase()}_DATABASE_`)
    }
    keys.forEach(async (key) => {
        await includes.forEach(i => {
            if (key.includes(i) && key.includes(`${src.toUpperCase()}`)) {
                // console.log(`${key}=${envs[key]}`)
                config.srcConfig[key] = envs[key]
            }
            if (key.includes(i) && dest !== undefined && key.includes(`${dest.toUpperCase()}`)) {
                // console.log(`${key}=${envs[key]}`)
                config.destConfig[key] = envs[key]
            }
        })
    })

    const dbUrls = {}
    if (src && config.srcConfig) {
        const srcHost = config.srcConfig[`STRAPI_${src.toUpperCase()}_DATABASE_HOST`]
        const srcPort = config.srcConfig[`STRAPI_${src.toUpperCase()}_DATABASE_PORT`]
        const srcDb = config.srcConfig[`STRAPI_${src.toUpperCase()}_DATABASE_NAME`]
        const srcUsr = config.srcConfig[`STRAPI_${src.toUpperCase()}_DATABASE_USERNAME`]
        const srcPass = config.srcConfig[`STRAPI_${src.toUpperCase()}_DATABASE_PASSWORD`]
        dbUrls.srcDbUrl = `postgresql://${srcUsr}:${srcPass}@${srcHost}:${srcPort}/${srcDb}`
        // dbUrls.srcDbUrl = `--username=${srcUsr} --${srcPass}@${srcHost}:${srcPort}/${srcDb}`
    }
    if (dest && config.destConfig !== {}) {
        // build destDbUrl
        const destHost = config.destConfig[`STRAPI_${dest.toUpperCase()}_DATABASE_HOST`]
        const destPort = config.destConfig[`STRAPI_${dest.toUpperCase()}_DATABASE_PORT`]
        const destDb = config.destConfig[`STRAPI_${dest.toUpperCase()}_DATABASE_NAME`]
        const destUsr = config.destConfig[`STRAPI_${dest.toUpperCase()}_DATABASE_USERNAME`]
        const destPass = config.destConfig[`STRAPI_${dest.toUpperCase()}_DATABASE_PASSWORD`]
        dbUrls.destDbUrl = `postgresql://${destUsr}:${destPass}@${destHost}:${destPort}/${destDb}`
        // dbUrls.destDbUrl = `postgresql://${destUsr}:${destPass}@${destHost}:${destPort}/${destDb}`
    }
    return dbUrls
}
