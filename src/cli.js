import arg from 'arg';
import inquirer from 'inquirer';
import { promisify } from 'util';
import request from 'request';
import { createProject } from './main';
const getRequest = promisify(request)
function parseArgumentsIntoOptions(rawArgs) {
    const args = arg(
        {
            '--username': String,
            '--git': Boolean,
            '--yes': Boolean,
            '--install': Boolean,
            '-u': '--username',
            '-g': '--git',
            '-y': '--yes',
            '-i': '--install',
        },
        {
            argv: rawArgs.slice(2),
        }
    );
    return {
        username: args['--username'] || false,
        git: false,
        install: args['--install'] || false,
    };
}

async function promptForGitUsernames(options) {
    const questions = [];
    if (!options.username) {
        questions.push({
            type: 'input',
            name: 'username',
            message: 'Enter your git username ? ',
            default: false,
        });

    }
    const answers = await inquirer.prompt(questions);
    return {
        ...options,
        username: options.username || answers.username
    };
}
async function promptForMissingOptions(options) {
    const questions = [];
    if (!options.git) {
        const response = await getRequest({
            url: `https://api.github.com/users/${options.username}/repos`,
            headers: {
                'User-Agent': 'request',
                'Content-Type': 'application/json'
            }
        });
        options.repos = []
        const repos = JSON.parse(response.body);
        if (response.statusCode != 200) {
            console.log('StatusCode: ', response.statusCode);
            console.log('Error: ', repos.message)
            process.exit(1)
        }
        for (let i = 0; i < repos.length; i++) {
            options.repos.push(repos[i].name)
        }
        questions.push({
            type: 'list',
            name: 'git',
            choices: options.repos,
            message: 'Select project to clone ?',
            default: false,
        });
    }

    if (!options.install) {
        questions.push({
            type: 'confirm',
            name: 'install',
            message: 'Install project dependency?',
            default: false,
        });
    }

    const answers = await inquirer.prompt(questions);
    return {
        ...options,
        git: options.git || answers.git,
        install: options.install || answers.install,
    };
}

export async function cli(args) {
    let options = parseArgumentsIntoOptions(args);
    options = await promptForGitUsernames(options);
    options = await promptForMissingOptions(options);
    await createProject(options);
}