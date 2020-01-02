import arg from 'arg';
import inquirer from 'inquirer';
import { createProject } from './main';

function parseArgumentsIntoOptions(rawArgs) {
    const args = arg(
        {
            '--git': Boolean,
            '--yes': Boolean,
            '--install': Boolean,
            '--build': Boolean,
            '--replaceText': Boolean,
            '--environment': Boolean,
            '-g': '--git',
            '-y': '--yes',
            '-i': '--install',
            '-b': '--build',
            '-r': '--replaceText',
            '-env': '--environment'
        },
        {
            argv: rawArgs.slice(2),
        }
    );
    return {
        skipPrompts: args['--yes'] || false,
        git: args._[0] || false,
        template: args._[0],
        install: args['--install'] || false,
        build: false,
        replaceText: false,
        environment: args._[0],
    };
}
async function promptForMissingOptions(options) {
    if (options.skipPrompts) {
        return {
            ...options
        };
    }

    const questions = [];

    if (!options.git) {
        questions.push({
            type: 'list',
            name: 'git',
            choices: ['TIcTacToe', 'reactjs-with-flux', 'login-registration-with-react', 'node-js'],
            message: 'Select project to clone ?',
            default: false,
        });
    }

    // if (!options.environment) {
    //     questions.push({
    //         type: 'list',
    //         name: 'environment',
    //         message: 'Please select environement?',
    //         choices: ['develop', 'production'],
    //         default: false,
    //     });
    // }

    if (!options.install) {
        questions.push({
            type: 'confirm',
            name: 'install',
            message: 'Install project dependency?',
            default: false,
        });
    }

    // if (!options.replaceText) {
    //     questions.push({
    //         type: 'confirm',
    //         name: 'replaceText',
    //         message: 'Would you like replace text in node_modules?',
    //         default: false,
    //     });
    // }

    // if (!options.build) {
    //     questions.push({
    //         type: 'confirm',
    //         name: 'build',
    //         message: 'Would you like to create new build?',
    //         default: false,
    //     });
    // }

    const answers = await inquirer.prompt(questions);
    return {
        ...options,
        git: options.git || answers.git,
        environment: options.environment || answers.environment,
        install: options.install || answers.install,
        build: options.build || answers.build,
        replaceText: options.replaceText || answers.replaceText,
    };
}

export async function cli(args) {
    let options = parseArgumentsIntoOptions(args);
    options = await promptForMissingOptions(options);
    await createProject(options);
}