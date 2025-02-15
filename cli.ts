import { resolve, basename } from 'https://deno.land/std@0.90.0/path/mod.ts'
import { walk } from 'https://deno.land/std@0.90.0/fs/walk.ts'
import { parse } from 'https://deno.land/std@0.90.0/flags/mod.ts'
import { existsDirSync } from './shared/fs.ts'
import type { LevelNames } from './shared/log.ts'
import log from './shared/log.ts'
import util from './shared/util.ts'
import { VERSION } from './version.ts'

const commands = {
  'init': 'Create a new application',
  'dev': 'Start the app in development mode',
  'start': 'Start the app in production mode',
  'build': 'Build the app to a static site (SSG)',
  'upgrade': 'Upgrade Aleph.js command'
}

const helpMessage = `Aleph.js v${VERSION}
The Full-stack Framework for React and other in Deno.

Docs: https://alephjs.org/docs
Bugs: https://github.com/alephjs/aleph.js/issues

Usage:
    aleph <command> [...options]

Commands:
    ${Object.entries(commands).map(([name, desc]) => `${name.padEnd(15)}${desc}`).join('\n    ')}

Options:
    -v, --version  Prints version number
    -h, --help     Prints help message
`

async function main() {
  const { _: args, ...options } = parse(Deno.args)

  // prints aleph.js version
  if (options.v) {
    console.log(`aleph.js v${VERSION}`)
    Deno.exit(0)
  }

  // prints aleph.js and deno version
  if (options.version) {
    const { deno, v8, typescript } = Deno.version
    console.log([
      `aleph.js ${VERSION}`,
      `deno ${deno}`,
      `v8 ${v8}`,
      `typescript ${typescript}`
    ].join('\n'))
    Deno.exit(0)
  }

  // prints help message when the command not found
  if (!(args.length > 0 && args[0] in commands)) {
    console.log(helpMessage)
    Deno.exit(0)
  }

  const command = String(args.shift()) as keyof typeof commands

  // prints command help message
  if (options.h || options.help) {
    import(`./cli/${command}.ts`).then(({ helpMessage }) => {
      console.log(commands[command])
      console.log(helpMessage)
      Deno.exit(0)
    })
    return
  }

  // import command module
  const { default: cmd } = await import(`./cli/${command}.ts`)

  // execute `init` command
  if (command === 'init') {
    await cmd(args[0])
    return
  }

  // execute `upgrade` command
  if (command === 'upgrade') {
    await cmd(options.v || options.version || args[0] || 'latest')
    return
  }

  // set log level
  const l = options.L || options['log-level']
  if (util.isNEString(l)) {
    log.setLevel(l.toLowerCase() as LevelNames)
  }

  // proxy https://deno.land/x/aleph on localhost
  const v = Deno.env.get('ALEPH_DEV')
  if (v !== undefined) {
    const { localProxy } = await import('./server/localproxy.ts')
    localProxy(Deno.cwd(), 2020)
  }

  // check working dir
  const workingDir = resolve(String(args[0] || '.'))
  if (!existsDirSync(workingDir)) {
    log.fatal('No such directory:', workingDir)
  }
  Deno.chdir(workingDir)

  // load .env
  for await (const { path: p, } of walk(workingDir, { match: [/(^|\/|\\)\.env(\.|$)/i], maxDepth: 1 })) {
    const text = await Deno.readTextFile(p)
    text.split('\n').forEach(line => {
      let [key, value] = util.splitBy(line, '=')
      key = key.trim()
      if (key) {
        Deno.env.set(key, value.trim())
      }
    })
    log.info('load env from', basename(p))
  }

  await cmd(workingDir, options)
}

if (import.meta.main) {
  main()
}
