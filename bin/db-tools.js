#!/usr/bin/env node

require('dotenv').config()
const fs = require("fs")
const util = require('util')
const readdir = util.promisify(fs.readdir)

const {
    runBashCommand,
} = require('./strapux')

const checkDbAccess = require('./check-db-access').checkDbAccess
const ora = require('ora')
const envs = process.env

const method = process.argv[2]
const src = process.argv[3]
const dest = process.argv[4]

async function init() {
    // clone src dest, example: npm run db:clone development production
    if (method === 'clone' && src && dest) {
        // first we backup the destDb, before replacing it with srcDb
        await backup(dest)
        await clone(src, dest)
        process.exit(0)
    }

    // backup src, example: npm run db:backup production
    if (method === 'backup' && src) backup(src) // if method backup only requires a srcDb

    if (method === 'import' && src) {
        const uri = await getDbUri(src)
        let file = dest
        const srcAccess = await checkDbAccess(uri)
        if (file === 'latest') {
            file = await getLatestDump(src)
        }
        if (!file && src && srcAccess) {
            // prompt for file
            const inquirer = require("inquirer")
            const backupInputQ = [{
                type: "list",
                name: "src",
                message: "Import dump from backup or input file path?",
                default: "backup",
                choices: ["backup", "input"]
            }]
            console.log('')
            let result = await inquirer.prompt(backupInputQ)
            // console.log(result)
            if (result.src === 'input') {
                const fileSelectQ = [{
                    type: "input",
                    name: "file",
                    validate: function (input) {
                        if (!fs.existsSync(input)) {
                            console.log(`\r\n${input}\r\n does not exist, re-enter`)
                            // process.exit(1)
                        } else {
                            return true
                        }

                    },
                    message: "Import dump from backup or input file path?",
                }]
                file = await inquirer.prompt(fileSelectQ).then(res => res.file)
                console.log(file)
            } else {
                // backup selected, prompt to select folder
                let selectBackupImportFolderQ = [{
                    type: "list",
                    name: "folder",
                    message: "Select folder from backups to import from",
                    default: "development",
                    choices: ["development", "staging", "production"]
                }]
                let selectedFolder = await inquirer.prompt(selectBackupImportFolderQ).then(res => res.folder)
                let choices = await (await readdir(`${process.cwd()}/db/${selectedFolder}`)).filter(file => file.includes('.dump'))
                let selectFileQ = [{
                    type: "list",
                    name: "dump",
                    message: "Select a dump to import",
                    default: choices[0],
                    choices: choices
                }]
                let selectedDumpFile = await inquirer.prompt(selectFileQ).then(res => res.dump)
                console.log(selectedDumpFile)
                file = `${process.cwd()}/db/${src}/${selectedDumpFile}`
            }
            // process.exit(0)
        }
        console.log(uri, file)
        importDbFromFile(uri, file)
    }
}
init()

async function clone(src, dest) {
    let spinner = ora(`Clone DB: ${src} >> ${dest} `)
    spinner.start()
    // console.log(`cloneing database: ${src} >> ${dest}`)
    const srcDbUri = await getDbUri(src)
    const destDbUri = await getDbUri(dest)
    const srcAccess = await checkDbAccess(srcDbUri)
    const destAccess = await checkDbAccess(destDbUri)
    if (!srcAccess || !destAccess) {
        spinner.stop()
        process.exit(1)
    }
    const srcCmd = `pg_dump -Fc --no-acl --no-owner --dbname=${srcDbUri}`
    const destCmd = `pg_restore --verbose --clean --no-acl --no-owner --dbname=${destDbUri}`
    const command = `${srcCmd} | ${destCmd}`
    await runBashCommand(command)
    spinner.stop()
    console.log(command)
    process.exit(0)
}

async function backup(src) {
    let spinner = ora(`Checking ${src} DB Access: `)
    spinner.start()
    const backupDbUri = await getDbUri(src)
    const dbName = backupDbUri.split('/').pop()
    let dbAccess = await checkDbAccess(backupDbUri)
    if (!dbAccess) {
        process.exit(1)
    }
    spinner.stop()
    spinner = ora(`Backing up ${src} DB: ${dbName} `)
    spinner.start()
    const backupFilename = `${process.cwd()}/db/${src}/backup-${dbName}-${Date.now()}.dump`

    const dumpCommand = `pg_dump -Fc --no-acl --no-owner --dbname=${backupDbUri} > ${backupFilename}`
    await runBashCommand(dumpCommand)
    spinner.stop()
    try {
        if (fs.existsSync(backupFilename)) {
            //file 
            let stats = await fs.statSync(backupFilename)
            if (stats.size > 0) {
                console.log(`${src} DB backed up to: ${backupFilename}`)
            } else {
                console.log('empty file, deleting')
                await runBashCommand(`rm -f ${backupFilename}`)

            }
        }
    } catch (err) {
        console.log(`unable to backup db\r\n error: ${err}`)
    }
}

function importDbFromFile(dbUri, file) {
    console.log('importing..', file, 'to', dbUri)
    runBashCommand(`pg_restore  --verbose --clean --no-acl --no-owner --dbname=${dbUri} ${file}`)
}

async function getDbUri(environment) {
    let env = environment.toUpperCase()
    const srcHost = envs[`STRAPI_${env}_DATABASE_HOST`]
    const srcPort = envs[`STRAPI_${env}_DATABASE_PORT`]
    const srcDb = envs[`STRAPI_${env}_DATABASE_NAME`]
    const srcUsr = envs[`STRAPI_${env}_DATABASE_USERNAME`]
    const srcPass = envs[`STRAPI_${env}_DATABASE_PASSWORD`]
    return `postgresql://${srcUsr}:${srcPass}@${srcHost}:${srcPort}/${srcDb}`
}

async function getLatestDump(environment) {
    console.log("get latest dump for:", environment)
    let files = (await readdir(`${process.cwd()}/db/${environment}`)).filter(file=>file.includes('.dump')).sort().reverse()
    let file = `${process.cwd()}/db/${environment}/${files[0]}`
    console.log(file)
    return file
    // process.exit(0)
}
