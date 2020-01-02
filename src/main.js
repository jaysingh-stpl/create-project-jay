import chalk from 'chalk';
import fs from 'fs';
import ncp from 'ncp';
import path from 'path';
import { promisify } from 'util';
import execa from 'execa';
import Listr from 'listr';

const copy = promisify(ncp);
const readdir = promisify(fs.readdir);
const writeFile = promisify(fs.writeFile);

async function initEnv(options) {
    return writeFile('./.env', `NODE_ENV=${options.environment}`, (err) => {
        if (err) {
            return Promise.reject(new Error('Failed to initialise environment.'));
        }
        return copy(path.resolve(process.cwd(), '.environment/.env.aman'), path.resolve(process.cwd(), `.environment/.env.${options.environment}`), { clobber: false, })
    })

}

async function replaceText() {
    await execa('sh', ['./replaceText.sh']).then(() => {
        return 'Successfully Replaced.'
    }).catch((error) => {
        Promise.reject(new Error(error.message))
    })
}

export async function createProject(options) {
    options = {
        ...options,
        targetDirectory: options.targetDirectory || process.cwd(),
    };
    const gitTask = new Listr([
        {
            title: 'Cloning from Git',
            task: (ctx, task) => readdir(options.targetDirectory)
                .then(files => {
                    if (!files.length) {
                        return execa('git', ['clone', `https://github.com/jaysingh-stpl/${options.git}.git`, '.']).catch(err => {
                            throw new Error(err.message)
                        });
                    } else {
                        ctx.cloned = false
                        task.skip('Already cloned from Git.')
                    }
                }).catch(err => {
                    throw new Error(err.message)
                })
        },
        {
            title: 'Pulling new changes from Git',
            enabled: (ctx) => ctx.cloned === false,
            task: () => execa('git', ['pull'])
                .catch(err => {
                    throw new Error(err.message)
                })
        }
    ], { concurrent: false })

    const tasks = new Listr([
        {
            title: 'Git',
            task: () => gitTask,
            enabled: () => options.git,
        },
        {
            title: 'Intialise environment file',
            task: () => initEnv(options),
            enabled: () => false//options.environment,
        },
        {
            title: 'Install package dependencies with Yarn',
            enabled: () => options.install,
            task: (ctx, task) => execa('yarn')
                .catch(() => {
                    ctx.yarn = false;
                    task.skip('Yarn not available, install it via `npm install -g yarn`');
                })
        },
        {
            title: 'Install package dependencies with npm',
            enabled: ctx => ((ctx.yarn === false) && options.install),
            task: () => execa('npm', ['install'])
        },
        {
            title: 'Replacing text from node_modules',
            task: () => replaceText(options),
            enabled: () => false//options.replaceText
        },
        {
            title: `Creating build for ${options.environment}`,
            task: () => execa('npm', ['run', 'build'])
                .catch((err) => {
                    throw new Error(err.message)
                }),
            enabled: () => false//options.build
        }
    ]);

    tasks.run().then(() => {
        console.log('%s Project ready', chalk.green.bold('DONE'));
        console.log('%s %s to start project', chalk.blue.bold('RUN'), chalk.red('npm start'));
        return true;
    }).catch(err => {
        // console.error(err);
    });
}