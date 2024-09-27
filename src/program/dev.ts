import fs from 'fs'
import path from 'path'
import chokidar from 'chokidar'
import tsc from '../scripts/tsc'
import { cleanDir } from '../utils/fs'
import { CompileOptions } from './types.t'
import makeOutput from '../scripts/makeOutputFile'
import { getNodeModulesTempDir } from '../utils'

export default function (
  rootPath: string,
  options: CompileOptions & { focus: 'cjs' | 'mjs' }
) {
  if (options.module) {
    return runDev(rootPath, options.tsConfig.outDir, options.module, options)
  }

  runDev(rootPath, options.tsConfig.outDir, 'cjs', options)
  runDev(rootPath, options.tsConfig.outDir, 'mjs', options)
}

function runDev(
  rootPath: string,
  shortOutDir: string,
  moduleType: Exclude<CompileOptions['module'], undefined>,
  options: Omit<CompileOptions, 'module' | 'outDir'> & { focus: 'cjs' | 'mjs' }
) {
  const tempOutDir = getNodeModulesTempDir(rootPath, 'dev-' + moduleType)
  const finalOutDir = path.resolve(shortOutDir)

  cleanDir(tempOutDir)
  cleanDir(finalOutDir)
  function updateFile(filePath: string) {
    makeOutput(filePath, {
      tempOutDir: tempOutDir,
      finalOutDir: finalOutDir,
      moduleType: moduleType,
      pushNodeCode: options.node,
      tsConfig: {
        baseUrl: options.tsConfig?.baseUrl,
        paths: options.tsConfig?.paths,
      },
    })
  }

  tsc(
    rootPath,
    [
      ...options.tsc,
      '--outDir',
      tempOutDir,
      '--module',
      moduleType === 'cjs' ? 'commonjs' : 'esnext',
      '--watch',
    ],
    {
      async: true,
      stdio: moduleType === options.focus ? 'inherit' : 'ignore',
    }
  )

  chokidar.watch(tempOutDir).on('all', (_, filePath) => {
    if (!fs.existsSync(filePath)) return
    if (!fs.statSync(filePath).isFile()) return
    updateFile(filePath)
  })
}
