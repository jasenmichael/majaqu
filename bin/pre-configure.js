const fs = require("fs")
const {
    runBashCommand,
    runBashScript,
    readJsonFile,
    saveJsonFile
} = require('./strapux')

const sampleConfigData = require('./example.strapux.config.json')

module.exports = async function (projectDir) {
    // --todo-- add check dependencies
    // npm init (with default, will config package.json later)
    await runBashCommand(`cd ${projectDir} && rm -f package.json >/dev/null 2>&1`)
    await runBashCommand(`cd ${projectDir} && rm -f package-lock.json >/dev/null 2>&1`)
    await runBashCommand(`cd ${projectDir} && npm init -y >/dev/null 2>&1`)

    // install strapux packages
    // await runBashScript('bin/bash-command.sh', ['npm', 'install'].concat(sampleConfigData.options.dependencies))
    await runBashCommand(`cd ${projectDir} && npm install ${sampleConfigData.options.dependencies.join(" ")} >/dev/null 2>&1`)
    // await runBashScript('bin/bash-command.sh', ['npm', 'install'])
    const ora = require('ora')
    const spinner = ora('pre-configuring Strapux')
    spinner.start()
    await runBashCommand(`npm install >/dev/null 2>&1`)
    spinner.stop()
    console.log("\r\n")
    // create strapux.config.json from example.strapux.config.json
    let configData = fs.existsSync(`${projectDir}/strapux.config.json`) ? await readJsonFile(`${projectDir}/strapux.config.json`) : await readJsonFile(`${projectDir}/bin/example.strapux.config.json`)
    configData = await readJsonFile('./strapux.config.json')

    // configure frontend and backend paths
    const chalk = require("chalk")
    const inquirer = require("inquirer");
    let questions = [{
        type: "list",
        name: "Frontend_Path",
        message: "what do you want to name your frontend(Nuxt) folder?",
        default: "frontend",
        choices: ["frontend", "nuxt"]
    }, {
        type: "list",
        name: "Backend_Path",
        message: "what do you want to name your backend(Strapi) folder?",
        default: "backend",
        choices: ["backend", "strapi"]
    }]
    let results = await inquirer.prompt(questions)
    configData.frontend.path = results.Frontend_Path
    configData.backend.path = results.Backend_Path
    await saveJsonFile('strapux.config.json', configData)

    // remove git, and re-init git,
    // await runBashCommand('rm -rf .git >/dev/null 2>&1')
    // await runBashCommand('git init >/dev/null 2>&1')
}
