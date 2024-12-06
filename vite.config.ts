import { existsSync, readFileSync, writeFileSync } from 'fs'
import path, { resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'

type PackageFormat = {
  name: string,
  version: string,
  type: string,
  files: string[],
  types: string,
  main?: string,
  module?: string,
  exports: Record<string, { import?: string, require?: string }>,
}

const generatePackageJSON = () => ({
  name: 'generate package.json for library',
  writeBundle(_options: unknown, bundle: { [fileName: string]: unknown }) {
    const [fileName] = Object.keys(bundle)
    const packageJSONFilePath = './dist/package.json'
    const originPackageData = JSON.parse(readFileSync('./package.json').toString()) as PackageFormat;
    let packageData: PackageFormat;
    if (existsSync(packageJSONFilePath)) {
      packageData = JSON.parse(readFileSync(packageJSONFilePath).toString())
    } else {
      packageData = {
        name: originPackageData.name,
        version: originPackageData.version,
        type: "module",
        files: ["./"],
        // main: "./dist/my-lib.umd.cjs",
        // module: fileName,
        types: './out-tsc/utils/index.d.ts',
        exports: {
          ".": {
            // import: fileName,
            // require: "./dist/my-lib.umd.cjs"
          }
        }
      }
    }
    if (fileName.includes('.umd.cjs')) {
      packageData.main = `./${fileName}`
      packageData.exports["."] = {
        ...packageData.exports["."],
        require: `./${fileName}`
      }
    } else {
      packageData.module = `./${fileName}`
      packageData.exports["."] = {
        ...packageData.exports["."],
        import: `./${fileName}`
      }
    }
    writeFileSync(packageJSONFilePath, JSON.stringify(packageData, null, 4))
  },
})

export default defineConfig({
  plugins: [checker({
    typescript: true,
  }), generatePackageJSON()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, './src/utils/index.ts'),
      name: 'ReactiveComponent',
      fileName: 'reactive-web-component.[hash]',
      // formats: ['es']
    }
  },
  resolve: {
    alias: [{ find: '@shared', replacement: fileURLToPath(new URL('./src/shared/', import.meta.url)) }]
  }
})
