const fs = require("fs")
const {
    runBashCommand,
    runBashScript,
    readJsonFile,
    saveJsonFile
} = require('./strapux')


module.exports = async function (projectDir, projectName) {
    // --todo-- add check dependencies


    // install strapux packages
    const sampleConfigData = require(`${projectDir}/bin/configs/example.strapux.config.json`)
    await runBashCommand(`cd ${projectDir} && npm install ${sampleConfigData.options.dependencies.join(" ")} >/dev/null 2>&1`)
    const ora = require('ora')
    const spinner = ora('pre-configuring Strapux')
    spinner.start()

    // npm init (with default, will config package.json later)
    await runBashCommand(`cd ${projectDir} && rm -f package.json >/dev/null 2>&1`)
    await runBashCommand(`cd ${projectDir} && rm -f package-lock.json >/dev/null 2>&1`)
    await runBashCommand(`cd ${projectDir} && rm -f yarn-lock >/dev/null 2>&1`)
    await runBashCommand(`cd ${projectDir} && npm init -y >/dev/null 2>&1`)
    spinner.stop()
    console.log("\r\n")

    // create strapux.config.json from example.strapux.config.json
    const configFile = `${projectDir}/strapux.config.json`
    let configData = fs.existsSync(configFile) ? await readJsonFile(configFile) : sampleConfigData
    // configData = await readJsonFile(configFile)



    // configure frontend and backend paths
    const inquirer = require("inquirer");
    let questions = [{
        type: "list",
        name: "Frontend_Path",
        message: "what do you want to name your frontend(Nuxt) folder?",
        default: "nuxt",
        choices: ["nuxt", "frontend"]
    }, {
        type: "list",
        name: "Backend_Path",
        message: "what do you want to name your backend(Strapi) folder?",
        default: "strapi",
        choices: ["strapi", "backend"]
    }]
    let results = await inquirer.prompt(questions)
    spinner.start()
    configData.frontend.path = results.Frontend_Path
    configData.backend.path = results.Backend_Path

    // get pkgData
    let pkgData = await readJsonFile(`${projectDir}/package.json`)
    // save scripts to pkgData from strapux.config.json or example.strapux.config.json
    pkgData.scripts = configData.options.scripts
    // save pkgData in package.json
    await saveJsonFile(`${projectDir}/package.json`, pkgData)
    // save configData in strapux.config.json
    await saveJsonFile(configFile, configData)
    // re-install packages
    await runBashCommand(`cd ${projectDir} && npm install ${sampleConfigData.options.dependencies.join(" ")} >/dev/null 2>&1`)

    // remove git, and re-init git,
    // await runBashCommand('rm -rf .git >/dev/null 2>&1')
    // await runBashCommand('git init >/dev/null 2>&1')
    spinner.stop()
}
