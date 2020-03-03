const fs = require("fs")
const {
    runBashCommand,
    runBashScript,
    readJsonFile,
    saveJsonFile
} = require('./strapux')

module.exports = async function (projectDir, projectName) {
    console.log('post-configuring Strapux')
    // --- if .env notExist, copy example.env
    if (!fs.existsSync(`${projectDir}/.env`)) {
        await runBashCommand(`cp "${projectDir}/bin/configs/example.env" ${projectDir}/.env`)
    }

    // strapi stuff
    let strapiPath = require(`${projectDir}/strapux.config.json`).backend.path
    // copy bootstrap.js - adds dotenv to strapi boottrap function
    await runBashCommand(`rm -f ${projectDir}/${strapiPath}/config/functions/bootstrap.js`)
    await runBashCommand(`cp ${projectDir}/bin/configs/strapi/bootstrap.js ${projectDir}/${strapiPath}/config/functions/bootstrap.js`)
    
    // nuxt stuff
    
    // --- run node bin/build-env.js
    await runBashCommand(`cd ${projectDir} && node bin/build-env.js`)


    // add .env to .gitingore for backend(nuxt has it included)
    runBashCommand(`echo ".env" >> ${projectDir}/${strapiPath}/.gitignore`)

    // if not set - prompt single repo, triple repo, or no repo.
    // prompt user to create project-name repo
}
