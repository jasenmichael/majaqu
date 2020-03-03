const child_process = require('child_process')

async function strapuxInstall(projectDir, projectName) {
    const preConfigure = require('./pre-configure')
    const postConfigure = require('./post-configure')
    console.log('Installing Strapux...')
    // pre-configure, and create strapux.config.json
    await preConfigure(projectDir, projectName)
    const config = await readJsonFile(`${projectDir}/strapux.config.json`)
    
    // install Nuxt
    await runBashScript(`${projectDir}/bin/install-nuxt.sh`, [projectDir, config.frontend.path])
    // install Nuxt extra_packages
    let nuxtExtraPackages = config.frontend.extra_packages.join(' ')
    await runBashCommand(`cd ${projectDir} && npm i ${nuxtExtraPackages}`)

    // instal Strapi
    await runBashScript(`${projectDir}/bin/install-strapi.sh`, [projectDir, config.backend.path, 'npm'])
    // install Strapi extra_packages
    let strapiExtraPackages = config.backend.extra_packages.join(' ')
    await runBashCommand(`cd ${projectDir} && npm i ${strapiExtraPackages}`)

    // post configure
    await postConfigure(projectDir, projectName)
    process.exit(0)
}

// functions
async function runBashCommand(cmd) {
    // console.log('running bash command -', cmd)
    child_process.execSync(cmd)
}
async function runBashScript(script, args) {
    // console.log('running bash script -', script, args.join(' '))
    child_process.execFileSync(script, args, {
        stdio: 'inherit'
    })
}
async function readJsonFile(jsonFile) {
    const loadJsonFile = require('load-json-file');
    return await loadJsonFile(jsonFile)
}
async function saveJsonFile(jsonFile, data) {
    const writeJsonFile = require('write-json-file');
    await writeJsonFile(jsonFile, data)
}

module.exports = {
    strapuxInstall,
    runBashCommand,
    runBashScript,
    readJsonFile,
    saveJsonFile
}
